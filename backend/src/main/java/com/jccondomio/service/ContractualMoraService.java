package com.jccondomio.service;

import com.jccondomio.domain.entity.Installment;
import com.jccondomio.domain.enums.InstallmentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class ContractualMoraService {

    public MoraResult calculate(Installment installment, BigDecimal penaltyPercent,
                                BigDecimal monthlyInterestPercent, int graceDays, LocalDate referenceDate) {
        BigDecimal original = installment.getOriginalAmount() == null
                || installment.getOriginalAmount().compareTo(BigDecimal.ZERO) == 0
                ? amount(installment.getBaseAmount(), BigDecimal.ZERO)
                : installment.getOriginalAmount();
        BigDecimal discount = amount(installment.getDiscountAmount(), BigDecimal.ZERO);
        int chargeableDays = chargeableDays(installment.getBusinessDueDate(), graceDays, referenceDate);

        if (isClosed(installment) || chargeableDays <= 0) {
            return new MoraResult(original, money(BigDecimal.ZERO), money(BigDecimal.ZERO), 0,
                    money(original.subtract(discount)));
        }

        BigDecimal penalty = money(original.multiply(amount(penaltyPercent, BigDecimal.ZERO))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_EVEN));
        BigDecimal interest = money(original.multiply(amount(monthlyInterestPercent, BigDecimal.ZERO))
                .multiply(BigDecimal.valueOf(chargeableDays))
                .divide(BigDecimal.valueOf(3000), 2, RoundingMode.HALF_EVEN));
        BigDecimal updated = money(original.add(penalty).add(interest).subtract(discount));
        return new MoraResult(original, penalty, interest, chargeableDays, updated);
    }

    public void apply(Installment installment, BigDecimal penaltyPercent,
                      BigDecimal monthlyInterestPercent, int graceDays, LocalDate referenceDate) {
        MoraResult result = calculate(installment, penaltyPercent, monthlyInterestPercent, graceDays, referenceDate);
        installment.setOriginalAmount(result.originalAmount());
        installment.setPenaltyAmount(result.penaltyAmount());
        installment.setInterestAmount(result.interestAmount());
        installment.setDaysLate(result.daysLate());
        installment.setUpdatedAmount(result.updatedAmount());

        BigDecimal paid = amount(installment.getPaidAmount(), BigDecimal.ZERO);
        installment.setBalanceAmount(result.updatedAmount().subtract(paid).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_EVEN));
    }

    public int chargeableDays(LocalDate dueDate, int graceDays, LocalDate referenceDate) {
        LocalDate chargeStart = dueDate.plusDays(Math.max(0, graceDays));
        if (!referenceDate.isAfter(chargeStart)) return 0;
        return Math.max(0, (int) ChronoUnit.DAYS.between(dueDate, referenceDate));
    }

    private boolean isClosed(Installment installment) {
        return installment.getStatus() == InstallmentStatus.PAID
                || installment.getStatus() == InstallmentStatus.CANCELLED
                || installment.getStatus() == InstallmentStatus.RENEGOTIATED;
    }

    private BigDecimal amount(BigDecimal value, BigDecimal fallback) {
        return value == null ? fallback : value;
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_EVEN);
    }

    public record MoraResult(BigDecimal originalAmount, BigDecimal penaltyAmount,
                             BigDecimal interestAmount, int daysLate, BigDecimal updatedAmount) {}
}
