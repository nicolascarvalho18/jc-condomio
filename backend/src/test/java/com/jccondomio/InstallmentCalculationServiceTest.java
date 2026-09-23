package com.jccondomio;

import com.jccondomio.domain.enums.InstallmentType;
import com.jccondomio.dto.ContractDto;
import com.jccondomio.exception.BusinessException;
import com.jccondomio.service.InstallmentCalculationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class InstallmentCalculationServiceTest {

    private InstallmentCalculationService calculationService;

    @BeforeEach
    void setUp() {
        calculationService = new InstallmentCalculationService();
    }

    @Test
    @DisplayName("Garantir que a soma de todas as parcelas seja exatamente igual ao valor total do contrato (distribuição de centavos)")
    void testExactSumAndCentDistribution() {
        // R$ 100.000,00 dividido em 3 parcelas mensais sem entrada
        ContractDto.ContractSimulationRequest request = new ContractDto.ContractSimulationRequest(
                new BigDecimal("100000.00"),
                BigDecimal.ZERO,
                1,
                null,
                3,
                LocalDate.of(2026, 10, 10),
                10,
                false,
                0,
                0,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                null
        );

        ContractDto.SimulationResponse response = calculationService.simulate(request);

        assertEquals(0, response.difference().compareTo(BigDecimal.ZERO), "Diferença deve ser exatamente zero");
        assertEquals(0, response.sumOfInstallments().compareTo(new BigDecimal("100000.00")));
        assertEquals(3, response.totalInstallmentsCount());

        List<ContractDto.InstallmentPreview> installments = response.installments();
        // 100000 / 3 = 33333.33 base + 0.01 de sobra na primeira parcela = 33333.34
        assertEquals(new BigDecimal("33333.34"), installments.get(0).baseAmount());
        assertEquals(new BigDecimal("33333.33"), installments.get(1).baseAmount());
        assertEquals(new BigDecimal("33333.33"), installments.get(2).baseAmount());
    }

    @Test
    @DisplayName("Plano completo: Entrada parcelada + Parcelas mensais + Intermediárias semestrais + Chaves")
    void testCompleteComplexFinancialPlan() {
        // Total: 500.000,00
        // Entrada: 50.000,00 em 2 parcelas (25.000,00 cada)
        // Intermediárias: 2 parcelas de 20.000,00 = 40.000,00
        // Chaves: 60.000,00
        // Saldo restante mensal: 500.000 - 50.000 - 40.000 - 60.000 = 350.000,00 em 35 parcelas = 10.000,00 cada
        ContractDto.ContractSimulationRequest request = new ContractDto.ContractSimulationRequest(
                new BigDecimal("500000.00"),
                new BigDecimal("500000.00").multiply(new BigDecimal("0.10")), // 50.000
                2,
                LocalDate.of(2026, 10, 15),
                35,
                LocalDate.of(2026, 12, 10),
                10,
                true,
                2,
                6,
                new BigDecimal("20000.00"),
                new BigDecimal("60000.00"),
                LocalDate.of(2029, 12, 15)
        );

        ContractDto.SimulationResponse response = calculationService.simulate(request);

        assertEquals(0, response.difference().compareTo(BigDecimal.ZERO));
        assertEquals(0, response.sumOfInstallments().compareTo(new BigDecimal("500000.00")));
        // 2 entradas + 35 mensais + 2 intermediarias + 1 chaves = 40 parcelas
        assertEquals(40, response.totalInstallmentsCount());

        // Validar tipos presentes
        long downCount = response.installments().stream().filter(i -> i.installmentType() == InstallmentType.DOWN_PAYMENT).count();
        long monthlyCount = response.installments().stream().filter(i -> i.installmentType() == InstallmentType.MONTHLY).count();
        long interCount = response.installments().stream().filter(i -> i.installmentType() == InstallmentType.INTERMEDIATE).count();
        long keysCount = response.installments().stream().filter(i -> i.installmentType() == InstallmentType.KEYS).count();

        assertEquals(2, downCount);
        assertEquals(35, monthlyCount);
        assertEquals(2, interCount);
        assertEquals(1, keysCount);
    }

    @Test
    @DisplayName("Rejeitar quando entrada ou deduções superarem o valor total do contrato")
    void testRejectsExcessiveDeductions() {
        ContractDto.ContractSimulationRequest request = new ContractDto.ContractSimulationRequest(
                new BigDecimal("200000.00"),
                new BigDecimal("250000.00"),
                1,
                null,
                12,
                LocalDate.of(2026, 10, 10),
                10,
                false,
                0,
                0,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                null
        );

        assertThrows(BusinessException.class, () -> calculationService.simulate(request));
    }
}
