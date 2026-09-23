package com.jccondomio.service;

import com.jccondomio.domain.entity.BuildingBlock;
import com.jccondomio.domain.entity.Unit;
import com.jccondomio.domain.enums.AuditAction;
import com.jccondomio.domain.enums.ContractStatus;
import com.jccondomio.domain.enums.UnitStatus;
import com.jccondomio.dto.UnitDto;
import com.jccondomio.exception.BusinessException;
import com.jccondomio.exception.ConflictException;
import com.jccondomio.exception.ResourceNotFoundException;
import com.jccondomio.repository.BuildingBlockRepository;
import com.jccondomio.repository.ContractRepository;
import com.jccondomio.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UnitService {

    private final UnitRepository unitRepository;
    private final BuildingBlockRepository buildingBlockRepository;
    private final ContractRepository contractRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<UnitDto.UnitResponse> listByBlock(Long blockId) {
        return unitRepository.findByBuildingBlockId(blockId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<UnitDto.UnitResponse> listByCondominium(Long condominiumId, UnitStatus status, Pageable pageable) {
        return unitRepository.findByCondominiumIdAndStatus(condominiumId, status, pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public UnitDto.UnitResponse getById(Long id) {
        return toDto(findEntity(id));
    }

    @Transactional
    public UnitDto.UnitResponse create(Long blockId, Long companyId, UnitDto.UnitRequest req) {
        BuildingBlock block = findBlock(blockId, companyId);

        if (unitRepository.existsByBuildingBlockIdAndUnitNumber(blockId, req.unitNumber().trim())) {
            throw new ConflictException("A unidade " + req.unitNumber() + " já existe neste bloco.");
        }

        Unit unit = Unit.builder()
                .buildingBlock(block)
                .unitNumber(req.unitNumber().trim())
                .floorNumber(req.floorNumber())
                .typology(req.typology())
                .privateArea(req.privateArea())
                .totalArea(req.totalArea())
                .parkingSpaces(req.parkingSpaces() != null ? req.parkingSpaces() : 0)
                .idealFraction(req.idealFraction())
                .basePrice(req.basePrice())
                .status(req.status() != null ? req.status() : UnitStatus.AVAILABLE)
                .notes(req.notes())
                .build();

        unit = unitRepository.save(unit);
        auditLogService.log(AuditAction.CREATE, "Unit", unit.getId().toString(),
                "Unidade cadastrada: " + unit.getUnitNumber() + " (Bloco: " + block.getName() + ")");

        return toDto(unit);
    }

    @Transactional
    public List<UnitDto.UnitResponse> batchCreate(Long blockId, Long companyId, UnitDto.UnitBatchCreateRequest req) {
        BuildingBlock block = findBlock(blockId, companyId);

        if (req.startNumber() > req.endNumber()) {
            throw new BusinessException("O número inicial não pode ser maior que o final.");
        }

        List<Unit> created = new ArrayList<>();
        for (int i = req.startNumber(); i <= req.endNumber(); i++) {
            String unitNum = (req.prefix() != null && !req.prefix().isBlank())
                    ? req.prefix().trim() + " " + i
                    : String.valueOf(i);

            if (!unitRepository.existsByBuildingBlockIdAndUnitNumber(blockId, unitNum)) {
                Unit u = Unit.builder()
                        .buildingBlock(block)
                        .unitNumber(unitNum)
                        .floorNumber(req.floorNumber())
                        .typology(req.typology())
                        .privateArea(req.privateArea())
                        .totalArea(req.totalArea())
                        .parkingSpaces(req.parkingSpaces() != null ? req.parkingSpaces() : 0)
                        .basePrice(req.basePrice())
                        .status(UnitStatus.AVAILABLE)
                        .build();
                created.add(u);
            }
        }

        created = unitRepository.saveAll(created);
        auditLogService.log(AuditAction.CREATE, "Unit", block.getId().toString(),
                "Criação em lote: " + created.size() + " unidades geradas no bloco " + block.getName());

        return created.stream().map(this::toDto).toList();
    }

    @Transactional
    public UnitDto.UnitResponse update(Long id, Long companyId, UnitDto.UnitRequest req) {
        Unit unit = findEntity(id);
        if (!unit.getBuildingBlock().getCondominium().getCompany().getId().equals(companyId)) {
            throw new ResourceNotFoundException("Unidade não encontrada.");
        }

        unit.setFloorNumber(req.floorNumber());
        unit.setTypology(req.typology());
        unit.setPrivateArea(req.privateArea());
        unit.setTotalArea(req.totalArea());
        unit.setParkingSpaces(req.parkingSpaces());
        unit.setIdealFraction(req.idealFraction());
        unit.setBasePrice(req.basePrice());
        unit.setStatus(req.status());
        unit.setNotes(req.notes());

        unit = unitRepository.save(unit);
        auditLogService.log(AuditAction.UPDATE, "Unit", unit.getId().toString(), "Unidade atualizada: " + unit.getUnitNumber());

        return toDto(unit);
    }

    @Transactional
    public void delete(Long id, Long companyId) {
        Unit unit = findEntity(id);
        if (!unit.getBuildingBlock().getCondominium().getCompany().getId().equals(companyId)) {
            throw new ResourceNotFoundException("Unidade não encontrada.");
        }

        boolean hasContract = contractRepository.existsByUnitIdAndStatusIn(id, List.of(ContractStatus.ACTIVE, ContractStatus.SETTLED));
        if (hasContract) {
            throw new BusinessException("Não é possível excluir uma unidade vinculada a contrato ativo ou quitado.");
        }

        unitRepository.delete(unit);
        auditLogService.log(AuditAction.DELETE, "Unit", id.toString(), "Unidade excluída: " + unit.getUnitNumber());
    }

    public Unit findEntity(Long id) {
        return unitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada com id: " + id));
    }

    private BuildingBlock findBlock(Long blockId, Long companyId) {
        BuildingBlock block = buildingBlockRepository.findById(blockId)
                .orElseThrow(() -> new ResourceNotFoundException("Bloco não encontrado."));

        if (!block.getCondominium().getCompany().getId().equals(companyId)) {
            throw new ResourceNotFoundException("Bloco não encontrado.");
        }
        return block;
    }

    private UnitDto.UnitResponse toDto(Unit u) {
        return new UnitDto.UnitResponse(
                u.getId(),
                u.getBuildingBlock().getId(),
                u.getBuildingBlock().getName(),
                u.getBuildingBlock().getCondominium().getId(),
                u.getBuildingBlock().getCondominium().getName(),
                u.getUnitNumber(),
                u.getFloorNumber(),
                u.getTypology(),
                u.getPrivateArea(),
                u.getTotalArea(),
                u.getParkingSpaces(),
                u.getIdealFraction(),
                u.getBasePrice(),
                u.getStatus(),
                u.getVersion(),
                u.getNotes(),
                u.getCreatedAt()
        );
    }
}
