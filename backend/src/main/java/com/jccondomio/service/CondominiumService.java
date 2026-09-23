package com.jccondomio.service;

import com.jccondomio.domain.entity.Company;
import com.jccondomio.domain.entity.Condominium;
import com.jccondomio.domain.enums.AuditAction;
import com.jccondomio.domain.enums.CondominiumType;
import com.jccondomio.domain.enums.ConstructionStatus;
import com.jccondomio.domain.enums.StandardStatus;
import com.jccondomio.dto.CondominiumDto;
import com.jccondomio.dto.StatusChangeRequest;
import com.jccondomio.exception.BusinessException;
import com.jccondomio.exception.ConflictException;
import com.jccondomio.exception.ResourceNotFoundException;
import com.jccondomio.repository.BuildingBlockRepository;
import com.jccondomio.repository.CompanyRepository;
import com.jccondomio.repository.CondominiumRepository;
import com.jccondomio.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class CondominiumService {

    private final CondominiumRepository condominiumRepository;
    private final CompanyRepository companyRepository;
    private final BuildingBlockRepository buildingBlockRepository;
    private final UnitRepository unitRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Page<CondominiumDto.CondominiumResponse> list(Long companyId, String search, StandardStatus status, Pageable pageable) {
        Page<Condominium> page;
        boolean hasSearch = search != null && !search.isBlank();

        if (status != null) {
            if (hasSearch) {
                page = condominiumRepository.findByCompanyIdAndDeletedFalseAndStatusAndNameContainingIgnoreCase(companyId, status, search.trim(), pageable);
            } else {
                page = condominiumRepository.findByCompanyIdAndDeletedFalseAndStatus(companyId, status, pageable);
            }
        } else {
            if (hasSearch) {
                page = condominiumRepository.findByCompanyIdAndDeletedFalseAndNameContainingIgnoreCase(companyId, search.trim(), pageable);
            } else {
                page = condominiumRepository.findByCompanyIdAndDeletedFalse(companyId, pageable);
            }
        }
        return page.map(this::toDto);
    }

    @Transactional(readOnly = true)
    public CondominiumDto.CondominiumResponse getById(Long id, Long companyId) {
        Condominium c = findEntity(id, companyId);
        return toDto(c);
    }

    @Transactional
    public CondominiumDto.CondominiumResponse create(Long companyId, CondominiumDto.CondominiumRequest req) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada."));

        validate(req);

        String cleanName = req.name().trim();
        String cleanCnpj = clean(req.cnpj());

        if (condominiumRepository.existsByCompanyIdAndNameIgnoreCaseAndDeletedFalse(companyId, cleanName)) {
            throw new ConflictException("Já existe um condomínio ou empreendimento cadastrado com o nome: " + cleanName);
        }

        if (cleanCnpj != null && condominiumRepository.existsByCompanyIdAndCnpjAndDeletedFalse(companyId, cleanCnpj)) {
            throw new ConflictException("Já existe um condomínio cadastrado com o CNPJ: " + cleanCnpj);
        }

        StandardStatus stdStatus = req.status() != null ? req.status() : mapConstructionStatusToStandard(req.constructionStatus());

        Condominium c = Condominium.builder()
                .company(company)
                // Seção 1: Dados do Condomínio / Empreendimento
                .name(cleanName)
                .cnpj(cleanCnpj)
                .type(req.type())
                .registrationNumber(clean(req.registrationNumber()))
                .permitNumber(clean(req.permitNumber()))
                .zipCode(clean(req.zipCode()))
                .street(clean(req.street()))
                .number(clean(req.number()))
                .complement(clean(req.complement()))
                .neighborhood(clean(req.neighborhood()))
                .city(clean(req.city()))
                .state(clean(req.state()).toUpperCase())

                // Seção 2: Responsáveis
                .managerName(clean(req.managerName()))
                .managerCpf(clean(req.managerCpf()))
                .managerPhone(clean(req.managerPhone()))
                .managerEmail(clean(req.managerEmail()))
                .administratorName(clean(req.administratorName()))
                .administratorCnpj(clean(req.administratorCnpj()))
                .financialContactName(clean(req.financialContactName()))
                .financialContactPhone(clean(req.financialContactPhone()))
                .financialContactEmail(clean(req.financialContactEmail()))

                // Seção 3: Dados da Obra e Status Padronizado
                .workType(clean(req.workType()))
                .constructionStatus(req.constructionStatus())
                .status(stdStatus)
                .statusReason(clean(req.statusReason() != null ? req.statusReason() : req.haltReason()))
                .statusNotes(clean(req.statusNotes()))
                .statusDate(req.statusDate() != null ? req.statusDate() : LocalDate.now())
                .startDate(req.startDate())
                .expectedCompletionDate(req.expectedCompletionDate())
                .haltReason(clean(req.haltReason()))
                .constructionCompany(clean(req.constructionCompany()))
                .chiefEngineer(clean(req.chiefEngineer()))
                .creaCau(clean(req.creaCau()))
                .notes(clean(req.notes()))

                // Seção 4: Estrutura
                .totalBlocks(req.totalBlocks() != null ? req.totalBlocks() : 0)
                .totalTowers(req.totalTowers() != null ? req.totalTowers() : 0)
                .totalUnitsPlanned(req.totalUnitsPlanned() != null ? req.totalUnitsPlanned() : 0)
                .parkingSpaces(req.parkingSpaces() != null ? req.parkingSpaces() : 0)
                .totalArea(req.totalArea() != null ? req.totalArea() : BigDecimal.ZERO)
                .build();

        c = condominiumRepository.save(c);
        auditLogService.log(AuditAction.CREATE, "Condominium", c.getId().toString(), "Condomínio criado: " + c.getName());

        return toDto(c);
    }

    @Transactional
    public CondominiumDto.CondominiumResponse update(Long id, Long companyId, CondominiumDto.CondominiumRequest req) {
        Condominium c = findEntity(id, companyId);

        validate(req);

        String cleanName = req.name().trim();
        String cleanCnpj = clean(req.cnpj());

        if (condominiumRepository.existsByCompanyIdAndNameIgnoreCaseAndIdNotAndDeletedFalse(companyId, cleanName, id)) {
            throw new ConflictException("Já existe outro condomínio cadastrado com o nome: " + cleanName);
        }

        if (cleanCnpj != null && condominiumRepository.existsByCompanyIdAndCnpjAndIdNotAndDeletedFalse(companyId, cleanCnpj, id)) {
            throw new ConflictException("Já existe outro condomínio cadastrado com o CNPJ: " + cleanCnpj);
        }

        // Seção 1: Dados do Condomínio / Empreendimento
        c.setName(cleanName);
        c.setCnpj(cleanCnpj);
        c.setType(req.type());
        c.setRegistrationNumber(clean(req.registrationNumber()));
        c.setPermitNumber(clean(req.permitNumber()));
        c.setZipCode(clean(req.zipCode()));
        c.setStreet(clean(req.street()));
        c.setNumber(clean(req.number()));
        c.setComplement(clean(req.complement()));
        c.setNeighborhood(clean(req.neighborhood()));
        c.setCity(clean(req.city()));
        c.setState(clean(req.state()).toUpperCase());

        // Seção 2: Responsáveis
        c.setManagerName(clean(req.managerName()));
        c.setManagerCpf(clean(req.managerCpf()));
        c.setManagerPhone(clean(req.managerPhone()));
        c.setManagerEmail(clean(req.managerEmail()));
        c.setAdministratorName(clean(req.administratorName()));
        c.setAdministratorCnpj(clean(req.administratorCnpj()));
        c.setFinancialContactName(clean(req.financialContactName()));
        c.setFinancialContactPhone(clean(req.financialContactPhone()));
        c.setFinancialContactEmail(clean(req.financialContactEmail()));

        // Seção 3: Dados da Obra
        c.setWorkType(clean(req.workType()));
        c.setConstructionStatus(req.constructionStatus());
        if (req.status() != null) {
            c.setStatus(req.status());
        } else {
            c.setStatus(mapConstructionStatusToStandard(req.constructionStatus()));
        }
        if (req.statusReason() != null) c.setStatusReason(clean(req.statusReason()));
        if (req.statusNotes() != null) c.setStatusNotes(clean(req.statusNotes()));
        if (req.statusDate() != null) c.setStatusDate(req.statusDate());

        c.setStartDate(req.startDate());
        c.setExpectedCompletionDate(req.expectedCompletionDate());
        c.setHaltReason(clean(req.haltReason()));
        c.setConstructionCompany(clean(req.constructionCompany()));
        c.setChiefEngineer(clean(req.chiefEngineer()));
        c.setCreaCau(clean(req.creaCau()));
        c.setNotes(clean(req.notes()));

        // Seção 4: Estrutura
        if (req.totalBlocks() != null) c.setTotalBlocks(req.totalBlocks());
        if (req.totalTowers() != null) c.setTotalTowers(req.totalTowers());
        if (req.totalUnitsPlanned() != null) c.setTotalUnitsPlanned(req.totalUnitsPlanned());
        if (req.parkingSpaces() != null) c.setParkingSpaces(req.parkingSpaces());
        if (req.totalArea() != null) c.setTotalArea(req.totalArea());

        c = condominiumRepository.save(c);
        auditLogService.log(AuditAction.UPDATE, "Condominium", c.getId().toString(), "Condomínio atualizado: " + c.getName());

        return toDto(c);
    }

    @Transactional
    public CondominiumDto.CondominiumResponse changeStatus(Long id, Long companyId, StatusChangeRequest req) {
        req.validate();
        Condominium c = findEntity(id, companyId);
        StandardStatus oldStatus = c.getStatus() != null ? c.getStatus() : StandardStatus.ACTIVE;

        c.setStatus(req.status());
        c.setStatusReason(clean(req.reason()));
        c.setStatusNotes(clean(req.notes()));
        c.setStatusDate(req.statusDate() != null ? req.statusDate() : LocalDate.now());

        // Sincronizar status da obra
        c.setConstructionStatus(switch (req.status()) {
            case ACTIVE -> ConstructionStatus.IN_PROGRESS;
            case PAUSED -> ConstructionStatus.PAUSED;
            case FINISHED -> ConstructionStatus.COMPLETED;
            case CANCELLED -> ConstructionStatus.CANCELLED;
        });
        if (req.reason() != null) {
            c.setHaltReason(clean(req.reason()));
        }

        c = condominiumRepository.save(c);

        String details = String.format("Alteração de status de %s (%s) para %s (%s). Motivo: %s. Observação: %s. Data da alteração: %s",
                oldStatus.name(), oldStatus.getLabel(),
                req.status().name(), req.status().getLabel(),
                req.reason() != null ? req.reason() : "Nenhum",
                req.notes() != null ? req.notes() : "Nenhuma",
                c.getStatusDate());
        auditLogService.log(AuditAction.STATUS_CHANGE, "Condominium", c.getId().toString(), details);

        return toDto(c);
    }

    @Transactional
    public void delete(Long id, Long companyId) {
        Condominium c = findEntity(id, companyId);
        c.setDeleted(true);
        condominiumRepository.save(c);
        auditLogService.log(AuditAction.DELETE, "Condominium", c.getId().toString(), "Condomínio excluído: " + c.getName());
    }

    public Condominium findEntity(Long id, Long companyId) {
        return condominiumRepository.findById(id)
                .filter(c -> c.getCompany().getId().equals(companyId) && !Boolean.TRUE.equals(c.getDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Condomínio não encontrado."));
    }

    private void validate(CondominiumDto.CondominiumRequest req) {
        // Status PAUSED or CANCELLED requires haltReason
        if (req.constructionStatus() == ConstructionStatus.PAUSED || req.constructionStatus() == ConstructionStatus.CANCELLED) {
            if (req.haltReason() == null || req.haltReason().trim().isBlank()) {
                throw new BusinessException("O motivo da paralisação ou cancelamento é obrigatório quando o status da obra for Paralisada ou Cancelada.");
            }
        }

        // Dates: if both startDate and expectedCompletionDate are informed, completion cannot be before start
        if (req.startDate() != null && req.expectedCompletionDate() != null) {
            if (req.expectedCompletionDate().isBefore(req.startDate())) {
                throw new BusinessException("A previsão de conclusão da obra não pode ser anterior à data de início.");
            }
        }
    }

    private String clean(String val) {
        return (val != null && !val.isBlank()) ? val.trim() : null;
    }

    private StandardStatus mapConstructionStatusToStandard(ConstructionStatus cs) {
        if (cs == null) return StandardStatus.ACTIVE;
        return switch (cs) {
            case PLANNING, IN_PROGRESS -> StandardStatus.ACTIVE;
            case PAUSED -> StandardStatus.PAUSED;
            case COMPLETED -> StandardStatus.FINISHED;
            case CANCELLED -> StandardStatus.CANCELLED;
        };
    }

    private String getTypeLabel(CondominiumType type) {
        if (type == null) return "—";
        return switch (type) {
            case RESIDENTIAL_CONDOMINIUM -> "Condomínio Residencial";
            case COMMERCIAL_CONDOMINIUM -> "Condomínio Comercial";
            case BUILDING, VERTICAL -> "Edifício";
            case LOT, HORIZONTAL -> "Loteamento";
            case PRIVATE_WORK -> "Obra Particular";
            case OTHER -> "Outro";
        };
    }

    private String getStatusLabel(ConstructionStatus status) {
        if (status == null) return "—";
        return switch (status) {
            case PLANNING -> "Planejamento";
            case IN_PROGRESS -> "Em Andamento";
            case PAUSED -> "Paralisada";
            case COMPLETED -> "Concluída";
            case CANCELLED -> "Cancelada";
        };
    }

    private CondominiumDto.CondominiumResponse toDto(Condominium c) {
        long blocksCount = buildingBlockRepository.findByCondominiumId(c.getId()).size();
        long unitsCount = unitRepository.findByCondominiumId(c.getId()).size();

        StandardStatus stdStatus = c.getStatus() != null ? c.getStatus() : mapConstructionStatusToStandard(c.getConstructionStatus());

        return new CondominiumDto.CondominiumResponse(
                c.getId(),
                c.getCompany().getId(),
                c.getName(),
                c.getCnpj(),
                c.getType(),
                getTypeLabel(c.getType()),
                c.getRegistrationNumber(),
                c.getPermitNumber(),
                c.getZipCode(),
                c.getStreet(),
                c.getNumber(),
                c.getComplement(),
                c.getNeighborhood(),
                c.getCity(),
                c.getState(),

                // Responsáveis
                c.getManagerName(),
                c.getManagerCpf(),
                c.getManagerPhone(),
                c.getManagerEmail(),
                c.getAdministratorName(),
                c.getAdministratorCnpj(),
                c.getFinancialContactName(),
                c.getFinancialContactPhone(),
                c.getFinancialContactEmail(),

                // Obra
                c.getWorkType(),
                c.getConstructionStatus(),
                getStatusLabel(c.getConstructionStatus()),

                // Status Padronizado
                stdStatus,
                stdStatus != null ? stdStatus.getLabel() : "Ativo",
                c.getStatusReason() != null ? c.getStatusReason() : c.getHaltReason(),
                c.getStatusNotes(),
                c.getStatusDate(),

                c.getStartDate(),
                c.getExpectedCompletionDate(),
                c.getHaltReason(),
                c.getConstructionCompany(),
                c.getChiefEngineer(),
                c.getCreaCau(),
                c.getNotes(),

                // Estrutura
                c.getTotalBlocks(),
                c.getTotalTowers(),
                c.getTotalUnitsPlanned(),
                c.getParkingSpaces(),
                c.getTotalArea(),

                blocksCount,
                unitsCount,
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
