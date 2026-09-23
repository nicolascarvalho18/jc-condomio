package com.jccondomio.repository;

import com.jccondomio.domain.entity.Renegotiation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RenegotiationRepository extends JpaRepository<Renegotiation, Long> {
    List<Renegotiation> findByContractId(Long contractId);
    Page<Renegotiation> findByContractCompanyId(Long companyId, Pageable pageable);
}
