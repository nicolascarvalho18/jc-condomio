package com.jccondomio;

import com.jccondomio.domain.entity.Company;
import com.jccondomio.domain.entity.Contract;
import com.jccondomio.domain.entity.Installment;
import com.jccondomio.domain.enums.InstallmentStatus;
import com.jccondomio.domain.enums.InstallmentType;
import com.jccondomio.repository.ContractRepository;
import com.jccondomio.repository.InstallmentRepository;
import com.jccondomio.repository.PaymentRepository;
import com.jccondomio.repository.UserRepository;
import com.jccondomio.service.AuditLogService;
import com.jccondomio.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentCalculationTest {

    @Mock
    private InstallmentRepository installmentRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private PaymentService paymentService;

    private Contract contract;
    private Installment installment;

    @BeforeEach
    void setUp() {
        Company company = Company.builder()
                .id(1L)
                .defaultPenaltyPercent(new BigDecimal("2.00"))
                .defaultInterestPercentMonthly(new BigDecimal("1.00"))
                .defaultGraceDays(3)
                .build();

        contract = Contract.builder()
                .id(10L)
                .company(company)
                .penaltyPercent(new BigDecimal("2.00"))
                .interestPercentMonthly(new BigDecimal("1.00"))
                .graceDays(3)
                .build();

        installment = Installment.builder()
                .id(100L)
                .contract(contract)
                .installmentNumber(1)
                .totalInstallments(12)
                .installmentType(InstallmentType.MONTHLY)
                .dueDate(LocalDate.of(2026, 10, 10))
                .businessDueDate(LocalDate.of(2026, 10, 13)) // prorrogado para dia útil
                .baseAmount(new BigDecimal("1000.00"))
                .balanceAmount(new BigDecimal("1000.00"))
                .status(InstallmentStatus.PENDING)
                .build();
    }

    @Test
    @DisplayName("Não cobrar juros nem multa se pagamento for realizado até o vencimento útil")
    void testNoChargesOnOrBeforeDueDate() {
        when(installmentRepository.findById(100L)).thenReturn(Optional.of(installment));

        PaymentService.CalculatedCharges charges = paymentService.calculateCharges(100L, LocalDate.of(2026, 10, 13));

        assertEquals(0, charges.penaltyAmount().compareTo(BigDecimal.ZERO));
        assertEquals(0, charges.interestAmount().compareTo(BigDecimal.ZERO));
        assertEquals(0, charges.totalPayable().compareTo(new BigDecimal("1000.00")));
        assertEquals(0, charges.daysLate());
    }

    @Test
    @DisplayName("Respeitar dias de carência sem incidência de juros e multa")
    void testGracePeriod() {
        when(installmentRepository.findById(100L)).thenReturn(Optional.of(installment));

        // Vencimento útil: 13/10/2026. Carência: 3 dias (até 16/10/2026)
        PaymentService.CalculatedCharges charges = paymentService.calculateCharges(100L, LocalDate.of(2026, 10, 16));

        assertEquals(0, charges.penaltyAmount().compareTo(BigDecimal.ZERO));
        assertEquals(0, charges.interestAmount().compareTo(BigDecimal.ZERO));
        assertEquals(0, charges.daysLate());
    }

    @Test
    @DisplayName("Calcular multa de 2% e juros pro-rata die de 1% ao mês quando ultrapassar a carência")
    void testChargesAppliedAfterGracePeriod() {
        when(installmentRepository.findById(100L)).thenReturn(Optional.of(installment));

        // Pagamento em 23/10/2026 (10 dias de atraso em relação ao vencimento 13/10)
        PaymentService.CalculatedCharges charges = paymentService.calculateCharges(100L, LocalDate.of(2026, 10, 23));

        assertEquals(10, charges.daysLate());
        // Multa: 2% de 1000.00 = R$ 20.00
        assertEquals(new BigDecimal("20.00"), charges.penaltyAmount());

        // Juros pro-rata: 1% / 30 / 100 * 10 * 1000 = (0.01 / 30) * 10000 = 3.33
        assertEquals(new BigDecimal("3.33"), charges.interestAmount());

        // Total: 1000.00 + 20.00 + 3.33 = 1023.33
        assertEquals(new BigDecimal("1023.33"), charges.totalPayable());
    }
}
