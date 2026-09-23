package com.jccondomio.repository;

import com.jccondomio.domain.entity.Unit;
import com.jccondomio.domain.enums.UnitStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UnitRepository extends JpaRepository<Unit, Long> {
    List<Unit> findByBuildingBlockId(Long buildingBlockId);
    List<Unit> findByBuildingBlockIdAndStatus(Long buildingBlockId, UnitStatus status);
    boolean existsByBuildingBlockIdAndUnitNumber(Long buildingBlockId, String unitNumber);

    @Query("SELECT u FROM Unit u JOIN u.buildingBlock b WHERE b.condominium.id = :condominiumId")
    List<Unit> findByCondominiumId(@Param("condominiumId") Long condominiumId);

    @Query("SELECT u FROM Unit u JOIN u.buildingBlock b WHERE b.condominium.id = :condominiumId AND (:status IS NULL OR u.status = :status)")
    Page<Unit> findByCondominiumIdAndStatus(@Param("condominiumId") Long condominiumId, @Param("status") UnitStatus status, Pageable pageable);

    @Query("SELECT u.status, COUNT(u) FROM Unit u JOIN u.buildingBlock b WHERE b.condominium.company.id = :companyId GROUP BY u.status")
    List<Object[]> countUnitsByStatusForCompany(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(u) FROM Unit u JOIN u.buildingBlock b WHERE b.condominium.company.id = :companyId")
    long countTotalUnitsForCompany(@Param("companyId") Long companyId);
}
