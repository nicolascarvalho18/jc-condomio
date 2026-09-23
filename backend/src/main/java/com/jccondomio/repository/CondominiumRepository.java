package com.jccondomio.repository;

import com.jccondomio.domain.entity.Condominium;
import com.jccondomio.domain.enums.StandardStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CondominiumRepository extends JpaRepository<Condominium, Long> {
    Page<Condominium> findByDeletedFalse(Pageable pageable);
    List<Condominium> findByCompanyIdAndDeletedFalse(Long companyId);
    Page<Condominium> findByCompanyIdAndDeletedFalse(Long companyId, Pageable pageable);
    Page<Condominium> findByCompanyIdAndDeletedFalseAndNameContainingIgnoreCase(Long companyId, String name, Pageable pageable);

    Page<Condominium> findByCompanyIdAndDeletedFalseAndStatus(Long companyId, StandardStatus status, Pageable pageable);
    Page<Condominium> findByCompanyIdAndDeletedFalseAndStatusAndNameContainingIgnoreCase(Long companyId, StandardStatus status, String name, Pageable pageable);

    boolean existsByCompanyIdAndNameIgnoreCaseAndDeletedFalse(Long companyId, String name);
    boolean existsByCompanyIdAndNameIgnoreCaseAndIdNotAndDeletedFalse(Long companyId, String name, Long id);

    boolean existsByCompanyIdAndCnpjAndDeletedFalse(Long companyId, String cnpj);
    boolean existsByCompanyIdAndCnpjAndIdNotAndDeletedFalse(Long companyId, String cnpj, Long id);
}
