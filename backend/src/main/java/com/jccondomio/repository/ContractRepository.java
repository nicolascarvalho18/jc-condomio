package com.jccondomio.repository;

import com.jccondomio.domain.entity.Contract;
import com.jccondomio.domain.enums.ContractStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {
    Optional<Contract> findByContractNumber(String contractNumber);
    boolean existsByContractNumber(String contractNumber);
    boolean existsByUnitIdAndStatusIn(Long unitId, List<ContractStatus> statuses);

    Page<Contract> findByCompanyId(Long companyId, Pageable pageable);
    Page<Contract> findByCompanyIdAndStatus(Long companyId, ContractStatus status, Pageable pageable);
    List<Contract> findByCompanyIdAndStatusIn(Long companyId, List<ContractStatus> statuses);
    List<Contract> findByCustomerId(Long customerId);

    @Query("SELECT c FROM Contract c " +
           "LEFT JOIN c.customer cust " +
           "LEFT JOIN c.condominium cond " +
           "WHERE c.company.id = :companyId " +
           "AND (:status IS NULL OR c.status = :status) " +
           "AND (:search IS NULL OR :search = '' OR " +
           "     LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(cust.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(cond.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(c.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Contract> findFiltered(
            @Param("companyId") Long companyId,
            @Param("status") ContractStatus status,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT COALESCE(SUM(c.totalAmount), 0) FROM Contract c WHERE c.company.id = :companyId AND c.status IN ('ACTIVE', 'SETTLED')")
    BigDecimal calculateTotalVgv(@Param("companyId") Long companyId);

    long countByCompanyIdAndStatus(Long companyId, ContractStatus status);
}
