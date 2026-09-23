package com.jccondomio.dto;

import com.jccondomio.domain.enums.CustomerType;
import com.jccondomio.domain.enums.StandardStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class CustomerDto {

    public record CustomerRequest(
            @NotNull(message = "Tipo de cliente é obrigatório (INDIVIDUAL ou LEGAL_ENTITY)")
            CustomerType customerType,

            @NotBlank(message = "Nome ou Razão Social é obrigatório")
            String name,

            @NotBlank(message = "CPF ou CNPJ é obrigatório")
            String document,

            String stateOrIdDocument,
            String maritalStatus,
            String profession,
            String spouseName,
            String spouseDocument,

            @NotBlank(message = "E-mail é obrigatório")
            @Email(message = "E-mail inválido")
            String email,

            @NotBlank(message = "Telefone é obrigatório")
            String phone,

            String secondaryPhone,
            String zipCode,
            String street,
            String number,
            String complement,
            String neighborhood,
            String city,
            String state,

            Boolean lgpdConsent,

            StandardStatus status,
            String statusReason,
            String statusNotes,
            LocalDate statusDate
    ) {}

    public record CustomerResponse(
            Long id,
            Long companyId,
            CustomerType customerType,
            String name,
            String document,
            String stateOrIdDocument,
            String maritalStatus,
            String profession,
            String spouseName,
            String spouseDocument,
            String email,
            String phone,
            String secondaryPhone,
            String zipCode,
            String street,
            String number,
            String complement,
            String neighborhood,
            String city,
            String state,
            Boolean lgpdConsent,
            LocalDateTime lgpdConsentDate,

            // Status Padronizado
            StandardStatus status,
            String statusLabel,
            String statusReason,
            String statusNotes,
            LocalDate statusDate,

            LocalDateTime createdAt
    ) {}
}
