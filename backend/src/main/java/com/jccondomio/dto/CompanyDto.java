package com.jccondomio.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CompanyDto {

    public record CompanyRequest(
            @NotBlank(message = "CNPJ é obrigatório")
            String cnpj,

            @NotBlank(message = "Razão Social é obrigatória")
            String corporateName,

            @NotBlank(message = "Nome Fantasia é obrigatório")
            String tradeName,

            String stateRegistration,
            String email,
            String phone,
            String zipCode,
            String street,
            String number,
            String complement,
            String neighborhood,
            String city,
            String state,

            @NotNull(message = "Percentual de multa padrão é obrigatório")
            @DecimalMin(value = "0.00", message = "A multa não pode ser negativa")
            @DecimalMax(value = "100.00", message = "A multa não pode exceder 100%")
            BigDecimal defaultPenaltyPercent,

            @NotNull(message = "Percentual de juros padrão é obrigatório")
            @DecimalMin(value = "0.00", message = "O juro não pode ser negativo")
            @DecimalMax(value = "100.00", message = "O juro não pode exceder 100% ao mês")
            BigDecimal defaultInterestPercentMonthly,

            @NotNull(message = "Dias de carência padrão é obrigatório")
            @Min(value = 0, message = "Os dias de carência não podem ser negativos")
            Integer defaultGraceDays
    ) {}

    public record CompanyResponse(
            Long id,
            String cnpj,
            String corporateName,
            String tradeName,
            String stateRegistration,
            String email,
            String phone,
            String zipCode,
            String street,
            String number,
            String complement,
            String neighborhood,
            String city,
            String state,
            BigDecimal defaultPenaltyPercent,
            BigDecimal defaultInterestPercentMonthly,
            Integer defaultGraceDays,
            LocalDateTime createdAt
    ) {}
}
