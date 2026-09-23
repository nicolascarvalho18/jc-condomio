package com.jccondomio.repository;

import com.jccondomio.domain.entity.BuildingBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BuildingBlockRepository extends JpaRepository<BuildingBlock, Long> {
    List<BuildingBlock> findByCondominiumId(Long condominiumId);
    boolean existsByCondominiumIdAndNameIgnoreCase(Long condominiumId, String name);
}
