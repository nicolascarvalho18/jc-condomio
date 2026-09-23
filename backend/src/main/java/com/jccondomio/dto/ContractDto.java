package com.jccondomio.dto;

import com.jccondomio.domain.enums.AdjustmentIndex;
import com.jccondomio.domain.enums.ContractStatus;
import com.jccondomio.domain.enums.ContractType;
import com.jccondomio.domain.enums.InstallmentType;
import com.jccondomio.domain.enums.PricingModel;
import com.jccondomio.domain.enums.ServiceType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class ContractDto {

    public record InstallmentPreview(
            int installmentNumber,
            int totalInstallments,
            InstallmentType installmentType,
            LocalDate dueDate,
            LocalDate businessDueDate,
            BigDecimal baseAmount,
            String notes
    ) {}

    public record ContractSimulationRequest(
            @NotNull(message = "Valor total é obrigatório")
            @DecimalMin(value = "0.01", message = "O valor total deve ser positivo")
            BigDecimal totalAmount,

            @NotNull(message = "Valor da entrada é obrigatório")
            @DecimalMin(value = "0.00", message = "A entrada não pode ser negativa")
            BigDecimal downPayment,

            @Min(value = 1, message = "Mínimo de 1 parcela de entrada")
            int downPaymentInstallmentsCount,

            LocalDate downPaymentFirstDueDate,

            @Min(value = 1, message = "Mínimo de 1 parcela mensal")
            int monthlyInstallmentsCount,

            @NotNull(message = "Data do primeiro vencimento mensal é obrigatória")
            LocalDate firstDueDate,

            @Min(value = 1, message = "Dia de vencimento deve ser entre 1 e 31")
            int dueDayOfMonth,

            boolean hasIntermediateInstallments,
            int intermediateInstallmentsCount,
            int intermediateFrequencyMonths,
            BigDecimal intermediateAmountPerInstallment,

            BigDecimal keysInstallmentAmount,
            LocalDate keysDueDate
    ) {}

    public record SimulationResponse(
            BigDecimal totalContractAmount,
            BigDecimal sumOfInstallments,
            BigDecimal difference,
            int totalInstallmentsCount,
            List<InstallmentPreview> installments
    ) {}

    public record CreateContractRequest(
            ContractType contractType,
            Long customerId,
            Long unitId,
            Long condominiumId,
            ServiceType serviceType,
            String serviceDescription,
            PricingModel pricingModel,
            String billingType,
            String paymentMethod,
            BigDecimal discountAmount,
            String description,
            String paymentCondition,

            @NotBlank(message = "Número do contrato é obrigatório")
            String contractNumber,

            @NotNull(message = "Data do contrato é obrigatória")
            LocalDate contractDate,

            @NotNull(message = "Regras de parcelamento são obrigatórias")
            ContractSimulationRequest financialPlan,

            AdjustmentIndex adjustmentIndex,
            BigDecimal penaltyPercent,
            BigDecimal interestPercentMonthly,
            Integer graceDays,
            String notes
    ) {}

    public record UpdateContractRequest(
            String description,
            ServiceType serviceType,
            String serviceDescription,
            String paymentCondition,
            AdjustmentIndex adjustmentIndex,
            BigDecimal penaltyPercent,
            BigDecimal interestPercentMonthly,
            Integer graceDays,
            String notes
    ) {}

    public record TerminateContractRequest(
            @NotBlank(message = "Motivo do encerramento é obrigatório")
            String reason,
            Boolean cancelPendingInstallments
    ) {}

    public record ContractResponse(
            Long id,
            Long companyId,
            ContractType contractType,
            Long customerId,
            String customerName,
            String customerDocument,
            String customerPhone,
            String customerEmail,
            Long unitId,
            String unitNumber,
            String buildingBlockName,
            Long condominiumId,
            String condominiumName,
            String condominiumCnpj,
            String condominiumAddress,
            String condominiumManagerName,
            String condominiumManagerPhone,
            ServiceType serviceType,
            String serviceDescription,
            PricingModel pricingModel,
            String billingType,
            String paymentMethod,
            BigDecimal discountAmount,
            String description,
            String paymentCondition,
            String contractNumber,
            LocalDate contractDate,
            BigDecimal totalAmount,
            BigDecimal downPayment,
            BigDecimal balanceAmount,
            ContractStatus status,
            String statusLabel,
            String statusReason,
            String statusNotes,
            LocalDate statusDate,
            LocalDate terminationDate,
            String terminationReason,
            AdjustmentIndex adjustmentIndex,
            BigDecimal penaltyPercent,
            BigDecimal interestPercentMonthly,
            Integer graceDays,
            String notes,
            Long version,
            int totalInstallmentsCount,
            long paidInstallmentsCount,
            long openInstallmentsCount,
            long overdueInstallmentsCount,
            BigDecimal totalPaidAmount,
            BigDecimal totalOutstandingBalance,
            LocalDateTime createdAt
    ) {}
}
