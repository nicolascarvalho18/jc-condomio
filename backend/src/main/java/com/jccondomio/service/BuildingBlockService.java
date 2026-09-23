package com.jccondomio.service;

import com.jccondomio.domain.entity.BuildingBlock;
import com.jccondomio.domain.entity.Condominium;
import com.jccondomio.domain.enums.AuditAction;
import com.jccondomio.dto.BuildingBlockDto;
import com.jccondomio.exception.BusinessException;
import com.jccondomio.exception.ConflictException;
import com.jccondomio.exception.ResourceNotFoundException;
import com.jccondomio.repository.BuildingBlockRepository;
import com.jccondomio.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BuildingBlockService {

    private final BuildingBlockRepository buildingBlockRepository;
    private final CondominiumService condominiumService;
    private final UnitRepository unitRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<BuildingBlockDto.BuildingBlockResponse> listByCondominium(Long condominiumId, Long companyId) {
        Condominium condo = condominiumService.findEntity(condominiumId, companyId);
        return buildingBlockRepository.findByCondominiumId(condo.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public BuildingBlockDto.BuildingBlockResponse create(Long condominiumId, Long companyId, BuildingBlockDto.BuildingBlockRequest req) {
        Condominium condo = condominiumService.findEntity(condominiumId, companyId);

        if (buildingBlockRepository.existsByCondominiumIdAndNameIgnoreCase(condo.getId(), req.name().trim())) {
            throw new ConflictException("Já existe um bloco/torre com o nome '" + req.name() + "' neste condomínio.");
        }

        BuildingBlock block = BuildingBlock.builder()
                .condominium(condo)
                .name(req.name().trim())
                .totalFloors(req.totalFloors())
                .notes(req.notes())
                .build();

        block = buildingBlockRepository.save(block);
        auditLogService.log(AuditAction.CREATE, "BuildingBlock", block.getId().toString(),
                "Bloco criado: " + block.getName() + " no condomínio " + condo.getName());

        return toDto(block);
    }

    @Transactional
    public void delete(Long blockId, Long companyId) {
        BuildingBlock block = buildingBlockRepository.findById(blockId)
                .orElseThrow(() -> new ResourceNotFoundException("Bloco não encontrado."));

        if (!block.getCondominium().getCompany().getId().equals(companyId)) {
            throw new ResourceNotFoundException("Bloco não encontrado.");
        }

        if (!unitRepository.findByBuildingBlockId(blockId).isEmpty()) {
            throw new BusinessException("Não é possível excluir um bloco que possui unidades cadastradas. Exclua as unidades primeiro.");
        }

        buildingBlockRepository.delete(block);
        auditLogService.log(AuditAction.DELETE, "BuildingBlock", block.getId().toString(), "Bloco excluído: " + block.getName());
    }

    private BuildingBlockDto.BuildingBlockResponse toDto(BuildingBlock b) {
        long unitsCount = unitRepository.findByBuildingBlockId(b.getId()).size();
        return new BuildingBlockDto.BuildingBlockResponse(
                b.getId(),
                b.getCondominium().getId(),
                b.getCondominium().getName(),
                b.getName(),
                b.getTotalFloors(),
                b.getNotes(),
                unitsCount,
                b.getCreatedAt()
        );
    }
}
