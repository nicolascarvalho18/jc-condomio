package com.jccondomio.dto;

import java.math.BigDecimal;
import java.util.Map;

public class DashboardDto {

    public record DashboardSummaryResponse(
            BigDecimal totalVgv,
            BigDecimal totalReceived,
            BigDecimal totalReceivable,
            BigDecimal totalOverdueAmount,
            long totalOverdueCount,
            BigDecimal currentMonthExpected,
            BigDecimal currentMonthReceived,
            long totalCondominiums,
            long totalUnits,
            long availableUnits,
            long soldUnits,
            long reservedUnits,
            long activeContracts,
            Map<String, Long> unitsByStatus,
            long totalCustomers,
            Map<String, Long> customersByStatus,
            Map<String, Long> installmentsBySituation
    ) {}
}
