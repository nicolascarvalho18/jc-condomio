package com.jccondomio.repository;

import com.jccondomio.domain.entity.Installment;
import com.jccondomio.domain.enums.InstallmentStatus;
import com.jccondomio.domain.enums.ServiceType;
import com.jccondomio.domain.enums.ContractStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface InstallmentRepository extends JpaRepository<Installment, Long> {

    List<Installment> findByContractIdOrderByInstallmentNumberAsc(Long contractId);
    List<Installment> findByContractIdAndContractCompanyIdOrderByInstallmentNumberAsc(Long contractId, Long companyId);

    Page<Installment> findByContractId(Long contractId, Pageable pageable);

    @Query("SELECT i FROM Installment i JOIN i.contract c WHERE c.company.id = :companyId " +
           "AND (:status IS NULL OR i.status = :status) " +
           "AND (:startDate IS NULL OR i.businessDueDate >= :startDate) " +
           "AND (:endDate IS NULL OR i.businessDueDate <= :endDate)")
    Page<Installment> findFiltered(
            @Param("companyId") Long companyId,
            @Param("status") InstallmentStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable
    );

    @Query("SELECT i FROM Installment i JOIN i.contract c " +
           "LEFT JOIN c.customer cust " +
           "LEFT JOIN c.condominium cond " +
           "LEFT JOIN c.unit u " +
           "LEFT JOIN u.buildingBlock bb " +
           "LEFT JOIN bb.condominium ucond " +
           "WHERE c.company.id = :companyId " +
           "AND (:status IS NULL OR i.status = :status) " +
           "AND (:statusGroup IS NULL OR :statusGroup = 'ALL' " +
           "     OR (:statusGroup = 'OPEN' AND i.balanceAmount > 0 AND i.paidAmount <= 0 AND i.businessDueDate > :today AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED')) " +
           "     OR (:statusGroup = 'OVERDUE' AND i.balanceAmount > 0 AND i.paidAmount <= 0 AND i.businessDueDate < :today AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED')) " +
           "     OR (:statusGroup = 'PAID' AND i.balanceAmount <= 0 AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED')) " +
           "     OR (:statusGroup = 'PARTIAL' AND i.paidAmount > 0 AND i.balanceAmount > 0 AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED')) " +
           "     OR (:statusGroup = 'CANCELLED' AND i.status IN ('CANCELLED', 'RENEGOTIATED')) " +
           "     OR (:statusGroup = 'TODAY' AND i.balanceAmount > 0 AND i.paidAmount <= 0 AND i.businessDueDate = :today AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED')) " +
           "     OR (:statusGroup = 'NEXT_7' AND i.balanceAmount > 0 AND i.businessDueDate BETWEEN :today AND :sevenDays AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED')) " +
           "     OR (:statusGroup = 'NEXT_30' AND i.balanceAmount > 0 AND i.businessDueDate BETWEEN :today AND :thirtyDays AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED'))) " +
           "AND (:customerId IS NULL OR cust.id = :customerId) " +
           "AND (:condominiumId IS NULL OR cond.id = :condominiumId OR ucond.id = :condominiumId) " +
           "AND (:serviceType IS NULL OR c.serviceType = :serviceType) " +
           "AND (:contractStatus IS NULL OR c.status = :contractStatus) " +
           "AND (:minAmount IS NULL OR i.balanceAmount >= :minAmount) " +
           "AND (:maxAmount IS NULL OR i.balanceAmount <= :maxAmount) " +
           "AND (:startDate IS NULL OR i.businessDueDate >= :startDate) " +
           "AND (:endDate IS NULL OR i.businessDueDate <= :endDate) " +
           "AND (:search IS NULL OR :search = '' OR " +
           "     LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(cust.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(cond.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(ucond.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Installment> findFilteredAdvanced(
            @Param("companyId") Long companyId,
            @Param("status") InstallmentStatus status,
            @Param("statusGroup") String statusGroup,
            @Param("customerId") Long customerId,
            @Param("condominiumId") Long condominiumId,
            @Param("serviceType") ServiceType serviceType,
            @Param("contractStatus") ContractStatus contractStatus,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("search") String search,
            @Param("today") LocalDate today,
            @Param("sevenDays") LocalDate sevenDays,
            @Param("thirtyDays") LocalDate thirtyDays,
            Pageable pageable
    );

    @Query("SELECT i FROM Installment i JOIN i.contract c WHERE c.company.id = :companyId " +
           "AND i.status IN ('PENDING', 'PARTIALLY_PAID') AND i.businessDueDate < :today")
    List<Installment> findOverdueCandidates(@Param("companyId") Long companyId, @Param("today") LocalDate today);

    @Query("SELECT i FROM Installment i JOIN i.contract c WHERE c.company.id = :companyId " +
           "AND i.balanceAmount > 0 AND i.paidAmount <= 0 AND i.businessDueDate < CURRENT_DATE " +
           "AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED')")
    Page<Installment> findOverdue(@Param("companyId") Long companyId, Pageable pageable);

    @Query("SELECT i FROM Installment i JOIN i.contract c WHERE c.company.id = :companyId " +
           "AND i.status IN ('PENDING', 'PARTIALLY_PAID') AND i.businessDueDate BETWEEN :startDate AND :endDate")
    Page<Installment> findDueBetween(
            @Param("companyId") Long companyId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable
    );

    @Query("SELECT COALESCE(SUM(i.balanceAmount), 0) FROM Installment i JOIN i.contract c " +
           "WHERE c.company.id = :companyId AND i.balanceAmount > 0 AND i.businessDueDate < CURRENT_DATE AND i.status <> 'CANCELLED'")
    BigDecimal sumOverdueAmount(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(i) FROM Installment i JOIN i.contract c " +
           "WHERE c.company.id = :companyId AND i.balanceAmount > 0 AND i.businessDueDate < CURRENT_DATE AND i.status <> 'CANCELLED'")
    long countOverdueInstallments(@Param("companyId") Long companyId);

    @Query("SELECT COALESCE(SUM(i.balanceAmount), 0) FROM Installment i JOIN i.contract c " +
           "WHERE c.company.id = :companyId AND i.balanceAmount > 0 AND i.status <> 'CANCELLED' " +
           "AND i.businessDueDate BETWEEN :startDate AND :endDate")
    BigDecimal sumUpcomingAmount(
            @Param("companyId") Long companyId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("SELECT COALESCE(SUM(i.paidAmount), 0) FROM Installment i JOIN i.contract c " +
           "WHERE c.company.id = :companyId")
    BigDecimal sumTotalPaidAmount(@Param("companyId") Long companyId);

    @Query("SELECT COALESCE(SUM(i.balanceAmount), 0) FROM Installment i JOIN i.contract c " +
           "WHERE c.company.id = :companyId AND i.balanceAmount > 0 AND i.status <> 'CANCELLED'")
    BigDecimal sumTotalOutstandingBalance(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(i) FROM Installment i JOIN i.contract c WHERE c.company.id = :companyId AND i.status IN ('CANCELLED', 'RENEGOTIATED')")
    long countCancelledForCompany(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(i) FROM Installment i JOIN i.contract c WHERE c.company.id = :companyId AND i.balanceAmount <= 0 AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED')")
    long countPaidForCompany(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(i) FROM Installment i JOIN i.contract c WHERE c.company.id = :companyId AND i.paidAmount > 0 AND i.balanceAmount > 0 AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED')")
    long countPartialForCompany(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(i) FROM Installment i JOIN i.contract c WHERE c.company.id = :companyId AND i.balanceAmount > 0 AND i.paidAmount <= 0 AND i.businessDueDate < CURRENT_DATE AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED')")
    long countOverdueOpenForCompany(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(i) FROM Installment i JOIN i.contract c WHERE c.company.id = :companyId AND i.balanceAmount > 0 AND i.paidAmount <= 0 AND i.businessDueDate >= CURRENT_DATE AND i.status NOT IN ('CANCELLED', 'RENEGOTIATED')")
    long countOpenForCompany(@Param("companyId") Long companyId);
}
