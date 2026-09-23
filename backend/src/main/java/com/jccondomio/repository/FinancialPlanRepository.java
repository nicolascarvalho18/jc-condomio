package com.jccondomio.repository;

import com.jccondomio.domain.entity.FinancialPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FinancialPlanRepository extends JpaRepository<FinancialPlan, Long> {
    Optional<FinancialPlan> findByContractId(Long contractId);
}
