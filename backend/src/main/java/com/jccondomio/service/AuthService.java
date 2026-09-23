package com.jccondomio.service;

import com.jccondomio.domain.entity.Company;
import com.jccondomio.domain.entity.User;
import com.jccondomio.domain.enums.AuditAction;
import com.jccondomio.domain.enums.Role;
import com.jccondomio.dto.AuthDto;
import com.jccondomio.exception.BusinessException;
import com.jccondomio.exception.ConflictException;
import com.jccondomio.exception.ResourceNotFoundException;
import com.jccondomio.repository.CompanyRepository;
import com.jccondomio.repository.UserRepository;
import com.jccondomio.security.JwtTokenProvider;
import com.jccondomio.security.RateLimitService;
import com.jccondomio.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final RateLimitService rateLimitService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public AuthDto.SetupStatusResponse checkSetupStatus() {
        boolean setupRequired = userRepository.count() == 0;
        String message = setupRequired
                ? "Nenhum administrador configurado. O assistente de configuração inicial é necessário."
                : "Sistema inicializado e pronto para autenticação.";
        return new AuthDto.SetupStatusResponse(setupRequired, message);
    }

    @Transactional
    public AuthDto.LoginResponse setupAdmin(AuthDto.SetupAdminRequest request) {
        if (userRepository.count() > 0) {
            throw new ConflictException("O sistema já possui usuários cadastrados. O setup inicial só é permitido no primeiro uso.");
        }

        // 1. Cria a Empresa Principal
        Company company = Company.builder()
                .cnpj(request.companyCnpj())
                .corporateName(request.companyCorporateName())
                .tradeName(request.companyTradeName())
                .defaultPenaltyPercent(new BigDecimal("2.00"))
                .defaultInterestPercentMonthly(new BigDecimal("1.00"))
                .defaultGraceDays(0)
                .build();
        company = companyRepository.save(company);

        // 2. Cria o Primeiro Administrador com senha protegida por BCrypt
        User admin = User.builder()
                .name(request.name())
                .email(request.email().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.ADMIN)
                .active(true)
                .company(company)
                .build();
        admin = userRepository.save(admin);

        auditLogService.log(AuditAction.CREATE, "User", admin.getId().toString(),
                "Setup inicial do sistema: primeiro administrador criado com sucesso.");

        UserPrincipal userPrincipal = new UserPrincipal(admin);
        String accessToken = tokenProvider.generateAccessToken(userPrincipal);
        String refreshToken = tokenProvider.generateRefreshToken(userPrincipal);

        return new AuthDto.LoginResponse(
                accessToken,
                refreshToken,
                "Bearer",
                admin.getId(),
                admin.getName(),
                admin.getEmail(),
                admin.getRole(),
                company.getId(),
                company.getTradeName()
        );
    }

    @Transactional(readOnly = true)
    public AuthDto.LoginResponse login(AuthDto.LoginRequest request, String clientIp) {
        String rateLimitKey = clientIp + ":" + request.email().toLowerCase().trim();
        if (rateLimitService.isBlocked(rateLimitKey)) {
            throw new BusinessException("Muitas tentativas consecutivas de login incorretas. Por segurança, tente novamente em alguns minutos.");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email().toLowerCase().trim(), request.password())
            );

            rateLimitService.loginSucceeded(rateLimitKey);

            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

            if (!Boolean.TRUE.equals(user.getActive())) {
                throw new BusinessException("Esta conta de usuário está inativa. Contate o administrador.");
            }

            String accessToken = tokenProvider.generateAccessToken(userPrincipal);
            String refreshToken = tokenProvider.generateRefreshToken(userPrincipal);

            auditLogService.log(AuditAction.LOGIN, "User", user.getId().toString(), "Login bem-sucedido.");

            return new AuthDto.LoginResponse(
                    accessToken,
                    refreshToken,
                    "Bearer",
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    user.getRole(),
                    user.getCompany() != null ? user.getCompany().getId() : null,
                    user.getCompany() != null ? user.getCompany().getTradeName() : null
            );
        } catch (BadCredentialsException ex) {
            rateLimitService.loginFailed(rateLimitKey);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public AuthDto.LoginResponse refreshToken(AuthDto.RefreshTokenRequest request) {
        if (!tokenProvider.validateToken(request.refreshToken())) {
            throw new BusinessException("Refresh token inválido ou expirado. Por favor, faça login novamente.");
        }

        String email = tokenProvider.getUsernameFromToken(request.refreshToken());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new BusinessException("Usuário inativo.");
        }

        UserPrincipal principal = new UserPrincipal(user);
        String newAccess = tokenProvider.generateAccessToken(principal);
        String newRefresh = tokenProvider.generateRefreshToken(principal);

        return new AuthDto.LoginResponse(
                newAccess,
                newRefresh,
                "Bearer",
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getCompany() != null ? user.getCompany().getId() : null,
                user.getCompany() != null ? user.getCompany().getTradeName() : null
        );
    }

    @Transactional
    public void changePassword(AuthDto.ChangePasswordRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException("A senha atual informada está incorreta.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        auditLogService.log(AuditAction.UPDATE, "User", user.getId().toString(), "Senha do usuário alterada.");
    }

    @Transactional
    public AuthDto.UserResponse createUser(AuthDto.UserCreateRequest request, Long companyId) {
        String email = request.email().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("Já existe um usuário com o e-mail informado: " + email);
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada."));

        User newUser = User.builder()
                .name(request.name())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(request.role() != null ? request.role() : Role.OPERADOR)
                .active(true)
                .status(com.jccondomio.domain.enums.StandardStatus.ACTIVE)
                .statusDate(java.time.LocalDate.now())
                .company(company)
                .build();

        newUser = userRepository.save(newUser);
        auditLogService.log(AuditAction.CREATE, "User", newUser.getId().toString(), "Novo usuário criado com papel: " + newUser.getRole());

        return toUserResponse(newUser);
    }

    @Transactional(readOnly = true)
    public List<AuthDto.UserResponse> listUsers(Long companyId) {
        return userRepository.findAll().stream()
                .filter(u -> u.getCompany() != null && u.getCompany().getId().equals(companyId))
                .map(this::toUserResponse)
                .toList();
    }

    @Transactional
    public AuthDto.UserResponse changeUserStatus(Long userId, Long companyId, com.jccondomio.dto.StatusChangeRequest req) {
        req.validate();
        User user = userRepository.findById(userId)
                .filter(u -> u.getCompany() != null && u.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

        com.jccondomio.domain.enums.StandardStatus oldStatus = user.getStatus() != null ? user.getStatus() : (Boolean.TRUE.equals(user.getActive()) ? com.jccondomio.domain.enums.StandardStatus.ACTIVE : com.jccondomio.domain.enums.StandardStatus.CANCELLED);

        user.setStatus(req.status());
        user.setActive(req.status() == com.jccondomio.domain.enums.StandardStatus.ACTIVE);
        user.setStatusReason(req.reason() != null && !req.reason().isBlank() ? req.reason().trim() : null);
        user.setStatusNotes(req.notes() != null && !req.notes().isBlank() ? req.notes().trim() : null);
        user.setStatusDate(req.statusDate() != null ? req.statusDate() : java.time.LocalDate.now());

        user = userRepository.save(user);

        String details = String.format("Alteração de status do usuário %s de %s (%s) para %s (%s). Motivo: %s. Observação: %s. Data da alteração: %s",
                user.getEmail(),
                oldStatus.name(), oldStatus.getLabel(),
                req.status().name(), req.status().getLabel(),
                req.reason() != null ? req.reason() : "Nenhum",
                req.notes() != null ? req.notes() : "Nenhuma",
                user.getStatusDate());
        auditLogService.log(AuditAction.STATUS_CHANGE, "User", user.getId().toString(), details);

        return toUserResponse(user);
    }

    private AuthDto.UserResponse toUserResponse(User u) {
        com.jccondomio.domain.enums.StandardStatus status = u.getStatus() != null
                ? u.getStatus()
                : (Boolean.TRUE.equals(u.getActive()) ? com.jccondomio.domain.enums.StandardStatus.ACTIVE : com.jccondomio.domain.enums.StandardStatus.CANCELLED);

        return new AuthDto.UserResponse(
                u.getId(),
                u.getName(),
                u.getEmail(),
                u.getRole(),
                u.getActive(),
                status,
                status.getLabel(),
                u.getStatusReason(),
                u.getStatusNotes(),
                u.getStatusDate(),
                u.getCompany() != null ? u.getCompany().getId() : null
        );
    }
}
