package com.jccondomio;

import com.jccondomio.domain.entity.Installment;
import com.jccondomio.domain.enums.InstallmentFinancialSituation;
import com.jccondomio.domain.enums.InstallmentStatus;
import com.jccondomio.service.InstallmentFinancialSituationService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class InstallmentFinancialSituationServiceTest {
    private final InstallmentFinancialSituationService service = new InstallmentFinancialSituationService();
    private final LocalDate today = LocalDate.of(2026, 9, 16);

    @Test
    void calculatesEachFinancialSituationFromPersistedAmountsAndDueDate() {
        assertEquals(InstallmentFinancialSituation.CANCELADA, situation(InstallmentStatus.CANCELLED, "0", "100", today.minusDays(2)));
        assertEquals(InstallmentFinancialSituation.PAGA, situation(InstallmentStatus.PENDING, "100", "0", today.minusDays(2)));
        assertEquals(InstallmentFinancialSituation.PARCIALMENTE_PAGA, situation(InstallmentStatus.PARTIALLY_PAID, "20", "80", today.minusDays(2)));
        assertEquals(InstallmentFinancialSituation.VENCIDA, situation(InstallmentStatus.OVERDUE, "0", "100", today.minusDays(1)));
        assertEquals(InstallmentFinancialSituation.VENCE_HOJE, situation(InstallmentStatus.PENDING, "0", "100", today));
        assertEquals(InstallmentFinancialSituation.EM_ABERTO, situation(InstallmentStatus.PENDING, "0", "100", today.plusDays(1)));
    }

    private InstallmentFinancialSituation situation(InstallmentStatus status, String paid, String balance, LocalDate dueDate) {
        Installment installment = Installment.builder()
                .status(status)
                .paidAmount(new BigDecimal(paid))
                .balanceAmount(new BigDecimal(balance))
                .businessDueDate(dueDate)
                .build();
        return service.calculate(installment, today);
    }
}
