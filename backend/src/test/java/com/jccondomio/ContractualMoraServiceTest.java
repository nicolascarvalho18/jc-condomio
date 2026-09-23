package com.jccondomio;

import com.jccondomio.domain.entity.Installment;
import com.jccondomio.domain.enums.InstallmentStatus;
import com.jccondomio.domain.enums.InstallmentType;
import com.jccondomio.service.ContractualMoraService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ContractualMoraServiceTest {

    private final ContractualMoraService service = new ContractualMoraService();

    @Test
    void doesNotChargeDuringGracePeriod() {
        Installment installment = installment();
        ContractualMoraService.MoraResult result = service.calculate(installment,
                new BigDecimal("2.00"), new BigDecimal("1.00"), 3, LocalDate.of(2026, 9, 13));

        assertEquals(new BigDecimal("0.00"), result.penaltyAmount());
        assertEquals(new BigDecimal("0.00"), result.interestAmount());
        assertEquals(0, result.daysLate());
    }

    @Test
    void calculatesPenaltyOnceAndDailyInterestFromOriginalAmount() {
        Installment installment = installment();
        ContractualMoraService.MoraResult result = service.calculate(installment,
                new BigDecimal("2.00"), new BigDecimal("1.00"), 3, LocalDate.of(2026, 9, 25));

        assertEquals(new BigDecimal("20.00"), result.penaltyAmount());
        assertEquals(new BigDecimal("5.00"), result.interestAmount());
        assertEquals(15, result.daysLate());
        assertEquals(new BigDecimal("1025.00"), result.updatedAmount());
    }

    @Test
    void neverChargesPaidInstallment() {
        Installment installment = installment();
        installment.setStatus(InstallmentStatus.PAID);
        ContractualMoraService.MoraResult result = service.calculate(installment,
                new BigDecimal("2.00"), new BigDecimal("1.00"), 0, LocalDate.of(2026, 9, 25));

        assertEquals(new BigDecimal("0.00"), result.penaltyAmount());
        assertEquals(new BigDecimal("0.00"), result.interestAmount());
    }

    private Installment installment() {
        return Installment.builder()
                .installmentNumber(1)
                .totalInstallments(1)
                .installmentType(InstallmentType.MONTHLY)
                .dueDate(LocalDate.of(2026, 9, 10))
                .businessDueDate(LocalDate.of(2026, 9, 10))
                .baseAmount(new BigDecimal("1000.00"))
                .originalAmount(new BigDecimal("1000.00"))
                .paidAmount(BigDecimal.ZERO)
                .balanceAmount(new BigDecimal("1000.00"))
                .status(InstallmentStatus.PENDING)
                .build();
    }
}
