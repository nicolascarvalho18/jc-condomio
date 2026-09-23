package com.jccondomio.service;

import com.jccondomio.domain.enums.ContractStatus;
import com.jccondomio.domain.enums.StandardStatus;
import com.jccondomio.domain.enums.UnitStatus;
import com.jccondomio.dto.DashboardDto;
import com.jccondomio.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ContractRepository contractRepository;
    private final InstallmentRepository installmentRepository;
    private final PaymentRepository paymentRepository;
    private final CondominiumRepository condominiumRepository;
    private final UnitRepository unitRepository;
    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public DashboardDto.DashboardSummaryResponse getSummary(Long companyId) {
        YearMonth currentMonth = YearMonth.now();
        LocalDate monthStart = currentMonth.atDay(1);
        LocalDate monthEnd = currentMonth.atEndOfMonth();

        BigDecimal totalVgv = contractRepository.calculateTotalVgv(companyId);
        BigDecimal totalReceived = paymentRepository.sumReceivedForCompany(companyId);
        BigDecimal totalReceivable = installmentRepository.sumTotalOutstandingBalance(companyId);

        BigDecimal overdueAmount = installmentRepository.sumOverdueAmount(companyId);
        long overdueCount = installmentRepository.countOverdueInstallments(companyId);

        BigDecimal currentMonthExpected = installmentRepository.sumUpcomingAmount(companyId, monthStart, monthEnd);
        BigDecimal currentMonthReceived = paymentRepository.sumReceivedBetween(companyId, monthStart, monthEnd);

        long totalCondos = condominiumRepository.findByCompanyIdAndDeletedFalse(companyId).size();
        long totalUnits = unitRepository.countTotalUnitsForCompany(companyId);

        List<Object[]> statusCounts = unitRepository.countUnitsByStatusForCompany(companyId);
        Map<String, Long> unitsByStatus = new HashMap<>();
        long availableUnits = 0;
        long soldUnits = 0;
        long reservedUnits = 0;

        for (Object[] row : statusCounts) {
            UnitStatus status = (UnitStatus) row[0];
            Long count = (Long) row[1];
            unitsByStatus.put(status.name(), count);

            if (status == UnitStatus.AVAILABLE) availableUnits = count;
            else if (status == UnitStatus.SOLD) soldUnits = count;
            else if (status == UnitStatus.RESERVED) reservedUnits = count;
        }

        long activeContracts = contractRepository.countByCompanyIdAndStatus(companyId, ContractStatus.ACTIVE);

        Map<String, Long> customersByStatus = new HashMap<>();
        for (StandardStatus status : StandardStatus.values()) {
            customersByStatus.put(status.name(), 0L);
        }
        for (Object[] row : customerRepository.countByStatusForCompany(companyId)) {
            StandardStatus status = (StandardStatus) row[0];
            if (status != null) {
                customersByStatus.put(status.name(), (Long) row[1]);
            }
        }
        long totalCustomers = customerRepository.countByCompanyIdAndDeletedFalse(companyId);
        Map<String, Long> installmentsBySituation = new HashMap<>();
        installmentsBySituation.put("ALL", installmentRepository.countOpenForCompany(companyId)
                + installmentRepository.countOverdueOpenForCompany(companyId)
                + installmentRepository.countPaidForCompany(companyId)
                + installmentRepository.countPartialForCompany(companyId)
                + installmentRepository.countCancelledForCompany(companyId));
        installmentsBySituation.put("OPEN", installmentRepository.countOpenForCompany(companyId));
        installmentsBySituation.put("OVERDUE", installmentRepository.countOverdueOpenForCompany(companyId));
        installmentsBySituation.put("PAID", installmentRepository.countPaidForCompany(companyId));
        installmentsBySituation.put("PARTIAL", installmentRepository.countPartialForCompany(companyId));
        installmentsBySituation.put("CANCELLED", installmentRepository.countCancelledForCompany(companyId));

        return new DashboardDto.DashboardSummaryResponse(
                totalVgv,
                totalReceived,
                totalReceivable,
                overdueAmount,
                overdueCount,
                currentMonthExpected,
                currentMonthReceived,
                totalCondos,
                totalUnits,
                availableUnits,
                soldUnits,
                reservedUnits,
                activeContracts,
                unitsByStatus,
                totalCustomers,
                customersByStatus,
                installmentsBySituation
        );
    }
}
