package com.jccondomio.dto;

import com.jccondomio.domain.enums.InstallmentFinancialSituation;
import com.jccondomio.domain.enums.ContractStatus;
import com.jccondomio.domain.enums.InstallmentType;
import com.jccondomio.domain.enums.PaymentMethod;
import com.jccondomio.domain.enums.ServiceType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class InstallmentDto {

    public record InstallmentResponse(
            Long id,
            Long contractId,
            String contractNumber,
            ContractStatus contractStatus,
            String contractStatusLabel,
            Long customerId,
            String customerName,
            Long condominiumId,
            String condominiumName,
            String unitNumber,
            ServiceType serviceType,
            String serviceLabel,
            int installmentNumber,
            int totalInstallments,
            InstallmentType installmentType,
            LocalDate dueDate,
            LocalDate businessDueDate,
            BigDecimal baseAmount,
            BigDecimal originalAmount,
            BigDecimal penaltyAmount,
            BigDecimal interestAmount,
            BigDecimal discountAmount,
            BigDecimal totalPayable,
            Integer daysLate,
            BigDecimal updatedAmount,
            BigDecimal paidAmount,
            BigDecimal balanceAmount,
            InstallmentFinancialSituation financialSituation,
            String financialSituationLabel,
            LocalDate financialSituationDate,
            Long version,
            String notes,
            List<PaymentResponse> payments,
            LocalDateTime createdAt
    ) {}

    public record PaymentRequest(
            @NotNull(message = "Data do pagamento é obrigatória")
            LocalDate paymentDate,

            @NotNull(message = "Valor recebido é obrigatório")
            @DecimalMin(value = "0.01", message = "O valor recebido deve ser maior que zero")
            BigDecimal amountReceived,

            BigDecimal penaltyApplied,
            BigDecimal interestApplied,
            BigDecimal discountApplied,

            @NotNull(message = "Forma de pagamento é obrigatória")
            PaymentMethod paymentMethod,

            String transactionReference,
            String notes
    ) {}

    public record PaymentResponse(
            Long id,
            Long installmentId,
            LocalDate paymentDate,
            BigDecimal amountReceived,
            BigDecimal penaltyApplied,
            BigDecimal interestApplied,
            BigDecimal discountApplied,
            PaymentMethod paymentMethod,
            String transactionReference,
            String registeredByUserName,
            String notes,
            LocalDateTime createdAt
    ) {}

    public record RenegotiateRequest(
            @NotNull(message = "ID do contrato é obrigatório")
            Long contractId,

            @NotNull(message = "Data da renegociação é obrigatória")
            LocalDate renegotiationDate,

            @NotEmpty(message = "Selecione pelo menos uma parcela para renegociar")
            List<Long> installmentIds,

            BigDecimal agreedInterestAmount,
            BigDecimal agreedDiscountAmount,

            @Min(value = 1, message = "Número de novas parcelas deve ser no mínimo 1")
            int newInstallmentsCount,

            @NotNull(message = "Data do primeiro vencimento das novas parcelas é obrigatória")
            LocalDate firstDueDate,

            @Min(value = 1, message = "Dia de vencimento deve ser entre 1 e 31")
            int dueDayOfMonth,

            @NotBlank(message = "Motivo da renegociação é obrigatório")
            String reason
    ) {}

    public record RenegotiationResponse(
            Long id,
            Long contractId,
            String contractNumber,
            String customerName,
            LocalDate renegotiationDate,
            BigDecimal previousOutstandingBalance,
            BigDecimal agreedInterestAmount,
            BigDecimal agreedDiscountAmount,
            BigDecimal newTotalAmount,
            int newInstallmentsCount,
            String status,
            String reason,
            String performedByUserName,
            List<Long> replacedInstallmentIds,
            LocalDateTime createdAt
    ) {}
}
