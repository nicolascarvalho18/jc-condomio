package com.jccondomio.service;

import com.jccondomio.domain.entity.*;
import com.jccondomio.domain.enums.*;
import com.jccondomio.dto.ContractDto;
import com.jccondomio.exception.BusinessException;
import com.jccondomio.exception.ConflictException;
import com.jccondomio.exception.ResourceNotFoundException;
import com.jccondomio.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContractService {

    private final ContractRepository contractRepository;
    private final CustomerService customerService;
    private final UnitService unitService;
    private final UnitRepository unitRepository;
    private final CondominiumRepository condominiumRepository;
    private final FinancialPlanRepository financialPlanRepository;
    private final InstallmentRepository installmentRepository;
    private final InstallmentCalculationService installmentCalculationService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public ContractDto.SimulationResponse simulate(ContractDto.ContractSimulationRequest request) {
        return installmentCalculationService.simulate(request);
    }

    @Transactional
    public ContractDto.ContractResponse create(Long companyId, ContractDto.CreateContractRequest req) {
        ContractType type = req.contractType() != null ? req.contractType() : ContractType.CUSTOMER_PURCHASE;

        Customer customer = null;
        Unit unit = null;
        Condominium condominium = null;
        Company company = null;

        if (type == ContractType.CUSTOMER_PURCHASE) {
            if (req.customerId() == null) {
                throw new BusinessException("Cliente é obrigatório para contratos com clientes.");
            }
            customer = customerService.findEntity(req.customerId(), companyId);
            company = customer.getCompany();

            if (req.unitId() != null) {
                unit = unitService.findEntity(req.unitId());
                if (!unit.getBuildingBlock().getCondominium().getCompany().getId().equals(companyId)) {
                    throw new ResourceNotFoundException("Unidade não pertence à sua empresa.");
                }
                if (unit.getStatus() != UnitStatus.AVAILABLE) {
                    throw new BusinessException("A unidade selecionada não está disponível. Status atual: " + unit.getStatus());
                }
                unit.setStatus(UnitStatus.SOLD);
                unitRepository.save(unit);
                condominium = unit.getBuildingBlock().getCondominium();
            } else if (req.condominiumId() != null) {
                condominium = condominiumRepository.findById(req.condominiumId())
                        .filter(c -> c.getCompany().getId().equals(companyId))
                        .orElseThrow(() -> new ResourceNotFoundException("Empreendimento/Obra não encontrado."));
            }
        } else {
            // Contrato com Condomínio
            if (req.condominiumId() == null) {
                throw new BusinessException("Condomínio cadastrado é obrigatório.");
            }
            condominium = condominiumRepository.findById(req.condominiumId())
                    .filter(c -> c.getCompany().getId().equals(companyId))
                    .orElseThrow(() -> new ResourceNotFoundException("Condomínio não encontrado."));
            company = condominium.getCompany();
            // Garante que não mistura cliente com condomínio
            customer = null;
            unit = null;
        }

        if (contractRepository.existsByContractNumber(req.contractNumber().trim())) {
            throw new ConflictException("Já existe um contrato com o número informado: " + req.contractNumber());
        }

        // Determinação do valor total e do plano financeiro (Total vs Mensal Recorrente)
        BigDecimal totalContractAmount;
        ContractDto.ContractSimulationRequest adjustedPlanReq = req.financialPlan();

        if (req.pricingModel() == PricingModel.MONTHLY_VALUE) {
            BigDecimal monthlyValue = req.financialPlan().totalAmount();
            int months = req.financialPlan().monthlyInstallmentsCount();
            if (months < 1) months = 1;
            totalContractAmount = monthlyValue.multiply(BigDecimal.valueOf(months));

            adjustedPlanReq = new ContractDto.ContractSimulationRequest(
                    totalContractAmount,
                    BigDecimal.ZERO,
                    1,
                    req.financialPlan().downPaymentFirstDueDate(),
                    months,
                    req.financialPlan().firstDueDate(),
                    req.financialPlan().dueDayOfMonth(),
                    false, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, null
            );
        } else {
            totalContractAmount = req.financialPlan().totalAmount();
        }

        BigDecimal downPayment = adjustedPlanReq.downPayment() != null ? adjustedPlanReq.downPayment() : BigDecimal.ZERO;
        BigDecimal balanceAmount = totalContractAmount.subtract(downPayment);

        Contract contract = Contract.builder()
                .company(company)
                .contractType(type)
                .customer(customer)
                .unit(unit)
                .condominium(condominium)
                .serviceType(req.serviceType())
                .serviceDescription(req.serviceDescription())
                .pricingModel(req.pricingModel() != null ? req.pricingModel() : PricingModel.TOTAL_VALUE)
                .billingType(req.billingType() != null ? req.billingType() : "PARCELED")
                .paymentMethod(req.paymentMethod() != null ? req.paymentMethod() : "BOLETO")
                .discountAmount(req.discountAmount() != null ? req.discountAmount() : BigDecimal.ZERO)
                .description(req.description())
                .paymentCondition(req.paymentCondition())
                .contractNumber(req.contractNumber().trim())
                .contractDate(req.contractDate())
                .totalAmount(totalContractAmount)
                .downPayment(downPayment)
                .balanceAmount(balanceAmount)
                .status(ContractStatus.ACTIVE)
                .adjustmentIndex(req.adjustmentIndex() != null ? req.adjustmentIndex() : AdjustmentIndex.NONE)
                .penaltyPercent(company.getDefaultPenaltyPercent())
                .interestPercentMonthly(company.getDefaultInterestPercentMonthly())
                .graceDays(company.getDefaultGraceDays())
                .notes(req.notes())
                .build();

        contract = contractRepository.save(contract);

        FinancialPlan plan = FinancialPlan.builder()
                .contract(contract)
                .downPaymentInstallmentsCount(adjustedPlanReq.downPaymentInstallmentsCount())
                .monthlyInstallmentsCount(adjustedPlanReq.monthlyInstallmentsCount())
                .firstDueDate(adjustedPlanReq.firstDueDate())
                .dueDayOfMonth(adjustedPlanReq.dueDayOfMonth())
                .hasIntermediateInstallments(adjustedPlanReq.hasIntermediateInstallments())
                .intermediateInstallmentsCount(adjustedPlanReq.intermediateInstallmentsCount())
                .intermediateFrequencyMonths(adjustedPlanReq.intermediateFrequencyMonths())
                .intermediateAmountPerInstallment(adjustedPlanReq.intermediateAmountPerInstallment())
                .keysInstallmentAmount(adjustedPlanReq.keysInstallmentAmount())
                .keysDueDate(adjustedPlanReq.keysDueDate())
                .build();

        financialPlanRepository.save(plan);

        // Gera e salva as parcelas com distribuição exata centavo a centavo
        List<Installment> installments = installmentCalculationService.generateInstallmentsForContract(contract, plan, adjustedPlanReq);
        installmentRepository.saveAll(installments);

        String targetName = (customer != null) ? customer.getName() : condominium.getName();
        String serviceLabel = (req.serviceType() != null) ? req.serviceType().getLabel() : "Serviço Geral";
        String detailText = "Contrato de " + serviceLabel + " nº " + contract.getContractNumber() + " registrado para " + targetName + " - Valor: R$ " + contract.getTotalAmount();

        auditLogService.log(AuditAction.CREATE, "Contract", contract.getId().toString(), detailText);

        return toDto(contract, installments);
    }

    @Transactional
    public ContractDto.ContractResponse update(Long id, Long companyId, ContractDto.UpdateContractRequest req) {
        Contract contract = findEntity(id, companyId);
        if (contract.getStatus() == ContractStatus.CANCELLED || contract.getStatus() == ContractStatus.TERMINATED) {
            throw new BusinessException("Não é permitido editar contratos cancelados ou encerrados.");
        }

        if (req.serviceType() != null) contract.setServiceType(req.serviceType());
        if (req.serviceDescription() != null) contract.setServiceDescription(req.serviceDescription());
        if (req.description() != null) contract.setDescription(req.description());
        if (req.paymentCondition() != null) contract.setPaymentCondition(req.paymentCondition());
        if (req.adjustmentIndex() != null) contract.setAdjustmentIndex(req.adjustmentIndex());
        if (req.penaltyPercent() != null) contract.setPenaltyPercent(req.penaltyPercent());
        if (req.interestPercentMonthly() != null) contract.setInterestPercentMonthly(req.interestPercentMonthly());
        if (req.graceDays() != null) contract.setGraceDays(req.graceDays());
        if (req.notes() != null) contract.setNotes(req.notes());

        contract = contractRepository.save(contract);
        auditLogService.log(AuditAction.UPDATE, "Contract", contract.getId().toString(),
                "Contrato nº " + contract.getContractNumber() + " atualizado.");

        List<Installment> insts = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contract.getId());
        return toDto(contract, insts);
    }

    @Transactional
    public ContractDto.ContractResponse terminate(Long id, Long companyId, ContractDto.TerminateContractRequest req) {
        Contract contract = findEntity(id, companyId);
        if (contract.getStatus() == ContractStatus.CANCELLED || contract.getStatus() == ContractStatus.TERMINATED) {
            throw new BusinessException("O contrato já se encontra cancelado ou encerrado.");
        }

        contract.setStatus(ContractStatus.TERMINATED);
        contract.setTerminationDate(LocalDate.now());
        contract.setTerminationReason(req.reason());

        List<Installment> installments = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(id);
        boolean shouldCancel = req.cancelPendingInstallments() == null || Boolean.TRUE.equals(req.cancelPendingInstallments());
        if (shouldCancel) {
            for (Installment i : installments) {
                if (i.getStatus() == InstallmentStatus.PENDING) {
                    i.setStatus(InstallmentStatus.CANCELLED);
                }
            }
            installmentRepository.saveAll(installments);
        }

        contract = contractRepository.save(contract);

        if (contract.getUnit() != null) {
            Unit u = contract.getUnit();
            u.setStatus(UnitStatus.AVAILABLE);
            unitRepository.save(u);
        }

        auditLogService.log(AuditAction.UPDATE, "Contract", contract.getId().toString(),
                "Contrato nº " + contract.getContractNumber() + " encerrado. Motivo: " + req.reason());

        return toDto(contract, installments);
    }

    @Transactional(readOnly = true)
    public Page<ContractDto.ContractResponse> list(Long companyId, ContractStatus status, String search, Pageable pageable) {
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        return contractRepository.findFiltered(companyId, status, cleanSearch, pageable)
                .map(c -> {
                    List<Installment> insts = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(c.getId());
                    return toDto(c, insts);
                });
    }

    @Transactional(readOnly = true)
    public ContractDto.ContractResponse getById(Long id, Long companyId) {
        Contract contract = findEntity(id, companyId);
        List<Installment> insts = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contract.getId());
        return toDto(contract, insts);
    }

    @Transactional
    public void cancelContract(Long id, Long companyId, String reason) {
        Contract contract = findEntity(id, companyId);

        List<Installment> installments = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(id);
        boolean hasPaidInstallments = installments.stream()
                .anyMatch(i -> i.getStatus() == InstallmentStatus.PAID || i.getStatus() == InstallmentStatus.PARTIALLY_PAID);

        if (hasPaidInstallments) {
            throw new BusinessException("Não é possível cancelar o contrato diretamente porque existem parcelas com pagamentos efetuados. Utilize o encerramento ou a renegociação.");
        }

        for (Installment i : installments) {
            i.setStatus(InstallmentStatus.CANCELLED);
        }
        installmentRepository.saveAll(installments);

        contract.setStatus(ContractStatus.CANCELLED);
        contract.setNotes((contract.getNotes() != null ? contract.getNotes() + "\n" : "") + "Motivo cancelamento: " + reason);
        contractRepository.save(contract);

        // Libera a unidade se for contrato de venda de unidade
        if (contract.getUnit() != null) {
            Unit unit = contract.getUnit();
            unit.setStatus(UnitStatus.AVAILABLE);
            unitRepository.save(unit);
        }

        auditLogService.log(AuditAction.UPDATE, "Contract", contract.getId().toString(),
                "Contrato nº " + contract.getContractNumber() + " cancelado. Motivo: " + reason);
    }

    @Transactional
    public ContractDto.ContractResponse changeStatus(Long id, Long companyId, com.jccondomio.dto.StatusChangeRequest req) {
        req.validate();
        Contract contract = findEntity(id, companyId);
        ContractStatus oldStatus = contract.getStatus() != null ? contract.getStatus() : ContractStatus.ACTIVE;

        ContractStatus newStatus = switch (req.status()) {
            case ACTIVE -> ContractStatus.ACTIVE;
            case PAUSED -> ContractStatus.PAUSED;
            case FINISHED -> ContractStatus.FINISHED;
            case CANCELLED -> ContractStatus.CANCELLED;
        };

        contract.setStatus(newStatus);
        contract.setStatusReason(req.reason() != null && !req.reason().isBlank() ? req.reason().trim() : null);
        contract.setStatusNotes(req.notes() != null && !req.notes().isBlank() ? req.notes().trim() : null);
        contract.setStatusDate(req.statusDate() != null ? req.statusDate() : LocalDate.now());

        if (newStatus == ContractStatus.FINISHED || newStatus == ContractStatus.CANCELLED) {
            contract.setTerminationDate(contract.getStatusDate());
            contract.setTerminationReason(contract.getStatusReason());

            // Se for cancelado, cancela parcelas em aberto e libera unidade se houver
            if (newStatus == ContractStatus.CANCELLED) {
                List<Installment> installments = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(id);
                for (Installment i : installments) {
                    if (i.getStatus() == InstallmentStatus.ACTIVE || i.getStatus() == InstallmentStatus.PENDING) {
                        i.setStatus(InstallmentStatus.CANCELLED);
                        i.setStatusReason("Cancelado juntamente com o contrato: " + req.reason());
                        i.setStatusDate(contract.getStatusDate());
                    }
                }
                installmentRepository.saveAll(installments);

                if (contract.getUnit() != null) {
                    Unit u = contract.getUnit();
                    u.setStatus(UnitStatus.AVAILABLE);
                    unitRepository.save(u);
                }
            }
        }

        contract = contractRepository.save(contract);

        String details = String.format("Alteração de status de %s (%s) para %s (%s). Motivo: %s. Observação: %s. Data da alteração: %s",
                oldStatus.name(), oldStatus.getLabel(),
                newStatus.name(), newStatus.getLabel(),
                req.reason() != null ? req.reason() : "Nenhum",
                req.notes() != null ? req.notes() : "Nenhuma",
                contract.getStatusDate());
        auditLogService.log(AuditAction.STATUS_CHANGE, "Contract", contract.getId().toString(), details);

        List<Installment> insts = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contract.getId());
        return toDto(contract, insts);
    }

    public Contract findEntity(Long id, Long companyId) {
        return contractRepository.findById(id)
                .filter(c -> c.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("Contrato não encontrado."));
    }

    private ContractDto.ContractResponse toDto(Contract c, List<Installment> installments) {
        long paidCount = installments.stream().filter(i -> i.getStatus() == InstallmentStatus.PAID || i.getStatus() == InstallmentStatus.FINISHED).count();
        long overdueCount = installments.stream().filter(i -> i.getStatus() == InstallmentStatus.OVERDUE).count();
        long openCount = installments.stream().filter(i -> i.getStatus() == InstallmentStatus.PENDING || i.getStatus() == InstallmentStatus.PARTIALLY_PAID || i.getStatus() == InstallmentStatus.ACTIVE).count();

        BigDecimal totalPaid = installments.stream()
                .map(Installment::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOutstanding = installments.stream()
                .filter(i -> i.getStatus() == InstallmentStatus.PENDING || i.getStatus() == InstallmentStatus.OVERDUE || i.getStatus() == InstallmentStatus.PARTIALLY_PAID || i.getStatus() == InstallmentStatus.ACTIVE)
                .map(Installment::getBalanceAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Long customerId = c.getCustomer() != null ? c.getCustomer().getId() : null;
        String customerName = c.getCustomer() != null ? c.getCustomer().getName() : null;
        String customerDocument = c.getCustomer() != null ? c.getCustomer().getDocument() : null;
        String customerPhone = c.getCustomer() != null ? c.getCustomer().getPhone() : null;
        String customerEmail = c.getCustomer() != null ? c.getCustomer().getEmail() : null;

        Long unitId = c.getUnit() != null ? c.getUnit().getId() : null;
        String unitNumber = c.getUnit() != null ? c.getUnit().getUnitNumber() : null;
        String buildingBlockName = (c.getUnit() != null && c.getUnit().getBuildingBlock() != null)
                ? c.getUnit().getBuildingBlock().getName()
                : null;

        Long condoId = c.getCondominium() != null ? c.getCondominium().getId() : null;
        String condoName = c.getCondominium() != null ? c.getCondominium().getName() : null;
        String condoCnpj = c.getCondominium() != null ? c.getCondominium().getCnpj() : null;
        String condoAddress = c.getCondominium() != null
                ? String.format("%s, %s - %s/%s",
                    c.getCondominium().getStreet() != null ? c.getCondominium().getStreet() : "",
                    c.getCondominium().getNumber() != null ? c.getCondominium().getNumber() : "S/N",
                    c.getCondominium().getCity() != null ? c.getCondominium().getCity() : "",
                    c.getCondominium().getState() != null ? c.getCondominium().getState() : "")
                : null;
        String condoManagerName = c.getCondominium() != null ? c.getCondominium().getManagerName() : null;
        String condoManagerPhone = c.getCondominium() != null ? c.getCondominium().getManagerPhone() : null;

        ContractStatus status = c.getStatus() != null ? c.getStatus() : ContractStatus.ACTIVE;

        return new ContractDto.ContractResponse(
                c.getId(),
                c.getCompany().getId(),
                c.getContractType(),
                customerId,
                customerName,
                customerDocument,
                customerPhone,
                customerEmail,
                unitId,
                unitNumber,
                buildingBlockName,
                condoId,
                condoName,
                condoCnpj,
                condoAddress,
                condoManagerName,
                condoManagerPhone,
                c.getServiceType(),
                c.getServiceDescription(),
                c.getPricingModel(),
                c.getBillingType(),
                c.getPaymentMethod(),
                c.getDiscountAmount(),
                c.getDescription(),
                c.getPaymentCondition(),
                c.getContractNumber(),
                c.getContractDate(),
                c.getTotalAmount(),
                c.getDownPayment(),
                c.getBalanceAmount(),
                status,
                status.getLabel(),
                c.getStatusReason() != null ? c.getStatusReason() : c.getTerminationReason(),
                c.getStatusNotes(),
                c.getStatusDate() != null ? c.getStatusDate() : c.getTerminationDate(),
                c.getTerminationDate(),
                c.getTerminationReason(),
                c.getAdjustmentIndex(),
                c.getPenaltyPercent(),
                c.getInterestPercentMonthly(),
                c.getGraceDays(),
                c.getNotes(),
                c.getVersion(),
                installments.size(),
                paidCount,
                openCount,
                overdueCount,
                totalPaid,
                totalOutstanding,
                c.getCreatedAt()
        );
    }
}
