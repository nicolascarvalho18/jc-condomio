package com.jccondomio.service;

import com.jccondomio.domain.entity.Installment;
import com.jccondomio.domain.enums.InstallmentFinancialSituation;
import com.jccondomio.domain.enums.InstallmentStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
public class InstallmentFinancialSituationService {

    /** Fonte única da situação financeira exibida por API, telas e exportações. */
    public InstallmentFinancialSituation calculate(Installment installment, LocalDate referenceDate) {
        if (installment.getStatus() == InstallmentStatus.CANCELLED || installment.getStatus() == InstallmentStatus.RENEGOTIATED) {
            return InstallmentFinancialSituation.CANCELADA;
        }
        if (amount(installment.getBalanceAmount()).compareTo(BigDecimal.ZERO) <= 0) {
            return InstallmentFinancialSituation.PAGA;
        }
        if (amount(installment.getPaidAmount()).compareTo(BigDecimal.ZERO) > 0) {
            return InstallmentFinancialSituation.PARCIALMENTE_PAGA;
        }
        if (installment.getBusinessDueDate().isBefore(referenceDate)) {
            return InstallmentFinancialSituation.VENCIDA;
        }
        if (installment.getBusinessDueDate().isEqual(referenceDate)) {
            return InstallmentFinancialSituation.VENCE_HOJE;
        }
        return InstallmentFinancialSituation.EM_ABERTO;
    }

    private BigDecimal amount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
