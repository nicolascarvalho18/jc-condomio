package com.jccondomio.repository;

import com.jccondomio.domain.entity.Payment;
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
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByInstallmentId(Long installmentId);

    @Query("SELECT p FROM Payment p JOIN p.installment i JOIN i.contract c WHERE c.company.id = :companyId")
    Page<Payment> findByCompanyId(@Param("companyId") Long companyId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.amountReceived), 0) FROM Payment p JOIN p.installment i JOIN i.contract c " +
           "WHERE c.company.id = :companyId AND p.paymentDate BETWEEN :startDate AND :endDate")
    BigDecimal sumReceivedBetween(
            @Param("companyId") Long companyId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("SELECT COALESCE(SUM(p.amountReceived), 0) FROM Payment p JOIN p.installment i JOIN i.contract c WHERE c.company.id = :companyId")
    BigDecimal sumReceivedForCompany(@Param("companyId") Long companyId);
}
