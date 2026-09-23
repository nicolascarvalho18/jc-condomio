package com.jccondomio.repository;

import com.jccondomio.domain.entity.Customer;
import com.jccondomio.domain.enums.StandardStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByCompanyIdAndDocumentAndDeletedFalse(Long companyId, String document);
    boolean existsByCompanyIdAndDocumentAndDeletedFalse(Long companyId, String document);
    Page<Customer> findByCompanyIdAndDeletedFalse(Long companyId, Pageable pageable);
    Page<Customer> findByCompanyIdAndDeletedFalseAndNameContainingIgnoreCase(Long companyId, String name, Pageable pageable);
    
    Page<Customer> findByCompanyIdAndDeletedFalseAndStatus(Long companyId, StandardStatus status, Pageable pageable);
    Page<Customer> findByCompanyIdAndDeletedFalseAndStatusAndNameContainingIgnoreCase(Long companyId, StandardStatus status, String name, Pageable pageable);

    long countByCompanyIdAndDeletedFalse(Long companyId);

    @Query("SELECT c.status, COUNT(c) FROM Customer c " +
           "WHERE c.company.id = :companyId AND c.deleted = false GROUP BY c.status")
    java.util.List<Object[]> countByStatusForCompany(@Param("companyId") Long companyId);
}
