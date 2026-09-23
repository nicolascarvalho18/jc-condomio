package com.jccondomio.controller;

import com.jccondomio.dto.AuthDto;
import com.jccondomio.security.UserPrincipal;
import com.jccondomio.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação e Segurança", description = "Endpoints de login, setup do administrador, tokens e usuários")
public class AuthController {

    private final AuthService authService;

    @GetMapping("/setup-status")
    @Operation(summary = "Verifica se o sistema necessita da configuração do primeiro administrador")
    public ResponseEntity<AuthDto.SetupStatusResponse> getSetupStatus() {
        return ResponseEntity.ok(authService.checkSetupStatus());
    }

    @GetMapping("/me")
    @Operation(summary = "Valida a sessão atual e retorna os dados do usuário autenticado")
    public ResponseEntity<AuthDto.UserResponse> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(new AuthDto.UserResponse(
                principal.getId(),
                principal.getName(),
                principal.getEmail(),
                principal.getRole(),
                principal.isActive(),
                com.jccondomio.domain.enums.StandardStatus.ACTIVE,
                "Ativo",
                null,
                null,
                null,
                principal.getCompanyId()
        ));
    }

    @PostMapping("/setup-admin")
    @Operation(summary = "Configuração inicial do primeiro administrador e empresa (sem senha padrão)")
    public ResponseEntity<AuthDto.LoginResponse> setupAdmin(@Valid @RequestBody AuthDto.SetupAdminRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.setupAdmin(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Autenticação de usuário com geração de JWT")
    public ResponseEntity<AuthDto.LoginResponse> login(@Valid @RequestBody AuthDto.LoginRequest request, HttpServletRequest httpRequest) {
        String clientIp = httpRequest.getRemoteAddr();
        String xff = httpRequest.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            clientIp = xff.split(",")[0].trim();
        }
        return ResponseEntity.ok(authService.login(request, clientIp));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renovação de tokens JWT expirados")
    public ResponseEntity<AuthDto.LoginResponse> refreshToken(@Valid @RequestBody AuthDto.RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Alteração de senha do próprio usuário autenticado")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody AuthDto.ChangePasswordRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        authService.changePassword(request, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cadastro de novo usuário do sistema (Exclusivo ADMIN)")
    public ResponseEntity<AuthDto.UserResponse> createUser(
            @Valid @RequestBody AuthDto.UserCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.createUser(request, principal.getCompanyId()));
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lista todos os usuários da empresa (Exclusivo ADMIN)")
    public ResponseEntity<List<AuthDto.UserResponse>> listUsers(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(authService.listUsers(principal.getCompanyId()));
    }

    @PatchMapping("/users/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Altera o status padronizado do usuário (Ativo, Pausado, Encerrado, Cancelado)")
    public ResponseEntity<AuthDto.UserResponse> changeUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody com.jccondomio.dto.StatusChangeRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(authService.changeUserStatus(id, principal.getCompanyId(), request));
    }
}
