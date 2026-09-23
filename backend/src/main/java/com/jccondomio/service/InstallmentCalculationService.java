package com.jccondomio.service;

import com.jccondomio.domain.entity.Contract;
import com.jccondomio.domain.entity.FinancialPlan;
import com.jccondomio.domain.entity.Installment;
import com.jccondomio.domain.enums.InstallmentStatus;
import com.jccondomio.domain.enums.InstallmentType;
import com.jccondomio.dto.ContractDto;
import com.jccondomio.exception.BusinessException;
import com.jccondomio.util.HolidayUtil;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class InstallmentCalculationService {

    /**
     * Simula as parcelas com base nos parâmetros sem persistir no banco.
     */
    public ContractDto.SimulationResponse simulate(ContractDto.ContractSimulationRequest request) {
        List<ContractDto.InstallmentPreview> previews = generatePreviews(request);

        BigDecimal sum = previews.stream()
                .map(ContractDto.InstallmentPreview::baseAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal diff = request.totalAmount().subtract(sum);

        return new ContractDto.SimulationResponse(
                request.totalAmount(),
                sum,
                diff,
                previews.size(),
                previews
        );
    }

    /**
     * Gera as entidades de parcelas prontas para vincular ao contrato.
     */
    public List<Installment> generateInstallmentsForContract(Contract contract, FinancialPlan plan, ContractDto.ContractSimulationRequest request) {
        List<ContractDto.InstallmentPreview> previews = generatePreviews(request);
        List<Installment> installments = new ArrayList<>();

        for (ContractDto.InstallmentPreview preview : previews) {
            Installment inst = Installment.builder()
                    .contract(contract)
                    .installmentNumber(preview.installmentNumber())
                    .totalInstallments(preview.totalInstallments())
                    .installmentType(preview.installmentType())
                    .dueDate(preview.dueDate())
                    .businessDueDate(preview.businessDueDate())
                    .baseAmount(preview.baseAmount())
                    .penaltyAmount(BigDecimal.ZERO)
                    .interestAmount(BigDecimal.ZERO)
                    .discountAmount(BigDecimal.ZERO)
                    .paidAmount(BigDecimal.ZERO)
                    .balanceAmount(preview.baseAmount())
                    .status(InstallmentStatus.PENDING)
                    .notes(preview.notes())
                    .build();
            installments.add(inst);
        }

        return installments;
    }

    /**
     * Gera a lista ordenada de prévias de parcelas com cálculo exato de centavos.
     */
    public List<ContractDto.InstallmentPreview> generatePreviews(ContractDto.ContractSimulationRequest req) {
        BigDecimal totalAmount = req.totalAmount().setScale(2, RoundingMode.HALF_EVEN);
        BigDecimal downPayment = req.downPayment() != null ? req.downPayment().setScale(2, RoundingMode.HALF_EVEN) : BigDecimal.ZERO;

        if (downPayment.compareTo(totalAmount) > 0) {
            throw new BusinessException("O valor da entrada não pode ser maior que o valor total do contrato.");
        }

        BigDecimal keysAmount = (req.keysInstallmentAmount() != null)
                ? req.keysInstallmentAmount().setScale(2, RoundingMode.HALF_EVEN)
                : BigDecimal.ZERO;

        BigDecimal intermediateTotal = BigDecimal.ZERO;
        if (req.hasIntermediateInstallments() && req.intermediateInstallmentsCount() > 0 && req.intermediateAmountPerInstallment() != null) {
            intermediateTotal = req.intermediateAmountPerInstallment()
                    .multiply(BigDecimal.valueOf(req.intermediateInstallmentsCount()))
                    .setScale(2, RoundingMode.HALF_EVEN);
        }

        BigDecimal upfrontDeductions = downPayment.add(keysAmount).add(intermediateTotal);
        if (upfrontDeductions.compareTo(totalAmount) > 0) {
            throw new BusinessException("A soma de entrada, intermediárias e chaves (" + upfrontDeductions +
                    ") excede o valor total do contrato (" + totalAmount + ").");
        }

        BigDecimal monthlyBalance = totalAmount.subtract(upfrontDeductions);

        List<ContractDto.InstallmentPreview> list = new ArrayList<>();
        int currentSeq = 1;

        // 1. Parcelas de Entrada
        if (downPayment.compareTo(BigDecimal.ZERO) > 0) {
            int dpCount = Math.max(1, req.downPaymentInstallmentsCount());
            LocalDate dpStartDate = req.downPaymentFirstDueDate() != null ? req.downPaymentFirstDueDate() : LocalDate.now();

            BigDecimal dpBase = downPayment.divide(BigDecimal.valueOf(dpCount), 2, RoundingMode.FLOOR);
            BigDecimal dpRemainder = downPayment.subtract(dpBase.multiply(BigDecimal.valueOf(dpCount)));

            for (int i = 0; i < dpCount; i++) {
                LocalDate rawDue = calculateDateWithDay(dpStartDate.plusMonths(i), req.dueDayOfMonth());
                LocalDate bizDue = HolidayUtil.adjustToNextBusinessDay(rawDue);
                BigDecimal amount = (i == 0) ? dpBase.add(dpRemainder) : dpBase;

                list.add(new ContractDto.InstallmentPreview(
                        currentSeq++,
                        0, // atualizado ao final
                        InstallmentType.DOWN_PAYMENT,
                        rawDue,
                        bizDue,
                        amount,
                        "Entrada (" + (i + 1) + "/" + dpCount + ")"
                ));
            }
        }

        // 2. Parcelas Mensais
        int monthlyCount = Math.max(1, req.monthlyInstallmentsCount());
        if (monthlyBalance.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal mBase = monthlyBalance.divide(BigDecimal.valueOf(monthlyCount), 2, RoundingMode.FLOOR);
            BigDecimal mRemainder = monthlyBalance.subtract(mBase.multiply(BigDecimal.valueOf(monthlyCount)));

            for (int i = 0; i < monthlyCount; i++) {
                LocalDate rawDue = calculateDateWithDay(req.firstDueDate().plusMonths(i), req.dueDayOfMonth());
                LocalDate bizDue = HolidayUtil.adjustToNextBusinessDay(rawDue);
                BigDecimal amount = (i == 0) ? mBase.add(mRemainder) : mBase;

                list.add(new ContractDto.InstallmentPreview(
                        currentSeq++,
                        0,
                        InstallmentType.MONTHLY,
                        rawDue,
                        bizDue,
                        amount,
                        "Mensal (" + (i + 1) + "/" + monthlyCount + ")"
                ));
            }
        }

        // 3. Parcelas Intermediárias
        if (req.hasIntermediateInstallments() && req.intermediateInstallmentsCount() > 0 && req.intermediateAmountPerInstallment() != null) {
            int freq = req.intermediateFrequencyMonths() > 0 ? req.intermediateFrequencyMonths() : 6;
            for (int i = 1; i <= req.intermediateInstallmentsCount(); i++) {
                LocalDate rawDue = calculateDateWithDay(req.firstDueDate().plusMonths((long) i * freq), req.dueDayOfMonth());
                LocalDate bizDue = HolidayUtil.adjustToNextBusinessDay(rawDue);

                list.add(new ContractDto.InstallmentPreview(
                        currentSeq++,
                        0,
                        InstallmentType.INTERMEDIATE,
                        rawDue,
                        bizDue,
                        req.intermediateAmountPerInstallment().setScale(2, RoundingMode.HALF_EVEN),
                        "Intermediária (" + i + "/" + req.intermediateInstallmentsCount() + ")"
                ));
            }
        }

        // 4. Parcela de Chaves
        if (keysAmount.compareTo(BigDecimal.ZERO) > 0) {
            LocalDate keysDate = req.keysDueDate() != null ? req.keysDueDate() : req.firstDueDate().plusMonths(monthlyCount);
            LocalDate bizDue = HolidayUtil.adjustToNextBusinessDay(keysDate);

            list.add(new ContractDto.InstallmentPreview(
                        currentSeq++,
                        0,
                        InstallmentType.KEYS,
                        keysDate,
                        bizDue,
                        keysAmount,
                        "Parcela de Chaves / Financiamento"
                ));
        }

        // Atualizar totalInstallments em todas as prévias
        int finalTotal = list.size();
        List<ContractDto.InstallmentPreview> finalized = new ArrayList<>(finalTotal);
        for (ContractDto.InstallmentPreview p : list) {
            finalized.add(new ContractDto.InstallmentPreview(
                    p.installmentNumber(),
                    finalTotal,
                    p.installmentType(),
                    p.dueDate(),
                    p.businessDueDate(),
                    p.baseAmount(),
                    p.notes()
            ));
        }

        return finalized;
    }

    private LocalDate calculateDateWithDay(LocalDate baseDate, int targetDay) {
        int maxDay = baseDate.lengthOfMonth();
        int day = Math.min(targetDay, maxDay);
        return baseDate.withDayOfMonth(day);
    }
}
