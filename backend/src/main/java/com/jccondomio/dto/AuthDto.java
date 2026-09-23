package com.jccondomio.dto;

import com.jccondomio.domain.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDto {

    public record SetupStatusResponse(
            boolean setupRequired,
            String message
    ) {}

    public record SetupAdminRequest(
            @NotBlank(message = "Nome é obrigatório")
            String name,

            @NotBlank(message = "E-mail é obrigatório")
            @Email(message = "E-mail inválido")
            String email,

            @NotBlank(message = "Senha é obrigatória")
            @Size(min = 8, message = "A senha deve ter no mínimo 8 caracteres")
            String password,

            @NotBlank(message = "CNPJ da empresa é obrigatório")
            String companyCnpj,

            @NotBlank(message = "Razão Social da empresa é obrigatória")
            String companyCorporateName,

            @NotBlank(message = "Nome Fantasia da empresa é obrigatório")
            String companyTradeName
    ) {}

    public record LoginRequest(
            @NotBlank(message = "E-mail é obrigatório")
            @Email(message = "E-mail inválido")
            String email,

            @NotBlank(message = "Senha é obrigatória")
            String password
    ) {}

    public record LoginResponse(
            String accessToken,
            String refreshToken,
            String tokenType,
            Long userId,
            String name,
            String email,
            Role role,
            Long companyId,
            String companyName
    ) {}

    public record RefreshTokenRequest(
            @NotBlank(message = "Refresh token é obrigatório")
            String refreshToken
    ) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "Senha atual é obrigatória")
            String currentPassword,

            @NotBlank(message = "Nova senha é obrigatória")
            @Size(min = 8, message = "A nova senha deve ter no mínimo 8 caracteres")
            String newPassword
    ) {}

    public record UserCreateRequest(
            @NotBlank(message = "Nome é obrigatório")
            String name,

            @NotBlank(message = "E-mail é obrigatório")
            @Email(message = "E-mail inválido")
            String email,

            @NotBlank(message = "Senha é obrigatória")
            @Size(min = 8, message = "A senha deve ter no mínimo 8 caracteres")
            String password,

            Role role
    ) {}

    public record UserResponse(
            Long id,
            String name,
            String email,
            Role role,
            Boolean active,
            com.jccondomio.domain.enums.StandardStatus status,
            String statusLabel,
            String statusReason,
            String statusNotes,
            java.time.LocalDate statusDate,
            Long companyId
    ) {}
}
