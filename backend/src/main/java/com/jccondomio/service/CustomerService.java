package com.jccondomio.service;

import com.jccondomio.domain.entity.Company;
import com.jccondomio.domain.entity.Customer;
import com.jccondomio.domain.enums.AuditAction;
import com.jccondomio.domain.enums.ContractStatus;
import com.jccondomio.domain.enums.StandardStatus;
import com.jccondomio.dto.CustomerDto;
import com.jccondomio.dto.StatusChangeRequest;
import com.jccondomio.exception.BusinessException;
import com.jccondomio.exception.ConflictException;
import com.jccondomio.exception.ResourceNotFoundException;
import com.jccondomio.repository.CompanyRepository;
import com.jccondomio.repository.ContractRepository;
import com.jccondomio.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CompanyRepository companyRepository;
    private final ContractRepository contractRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Page<CustomerDto.CustomerResponse> list(Long companyId, String search, StandardStatus status, Pageable pageable) {
        Page<Customer> page;
        boolean hasSearch = search != null && !search.isBlank();

        if (status != null) {
            if (hasSearch) {
                page = customerRepository.findByCompanyIdAndDeletedFalseAndStatusAndNameContainingIgnoreCase(companyId, status, search.trim(), pageable);
            } else {
                page = customerRepository.findByCompanyIdAndDeletedFalseAndStatus(companyId, status, pageable);
            }
        } else {
            if (hasSearch) {
                page = customerRepository.findByCompanyIdAndDeletedFalseAndNameContainingIgnoreCase(companyId, search.trim(), pageable);
            } else {
                page = customerRepository.findByCompanyIdAndDeletedFalse(companyId, pageable);
            }
        }
        return page.map(this::toDto);
    }

    @Transactional(readOnly = true)
    public CustomerDto.CustomerResponse getById(Long id, Long companyId) {
        Customer c = findEntity(id, companyId);
        return toDto(c);
    }

    @Transactional
    public CustomerDto.CustomerResponse create(Long companyId, CustomerDto.CustomerRequest req) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada."));

        String cleanDoc = req.document().replaceAll("[^0-9]", "");
        if (customerRepository.existsByCompanyIdAndDocumentAndDeletedFalse(companyId, cleanDoc)) {
            throw new ConflictException("Já existe um cliente cadastrado com o CPF/CNPJ: " + req.document());
        }

        StandardStatus stdStatus = req.status() != null ? req.status() : StandardStatus.ACTIVE;

        boolean lgpd = req.lgpdConsent() != null ? req.lgpdConsent() : true;

        Customer c = Customer.builder()
                .company(company)
                .customerType(req.customerType())
                .name(req.name() != null ? req.name().trim() : "")
                .document(cleanDoc)
                .stateOrIdDocument(req.stateOrIdDocument() != null ? req.stateOrIdDocument().trim() : null)
                .maritalStatus(req.maritalStatus())
                .profession(req.profession() != null ? req.profession().trim() : null)
                .spouseName(req.spouseName() != null ? req.spouseName().trim() : null)
                .spouseDocument(req.spouseDocument() != null ? req.spouseDocument().replaceAll("[^0-9]", "") : null)
                .email(req.email() != null ? req.email().trim().toLowerCase() : "")
                .phone(req.phone() != null ? req.phone().trim() : "")
                .secondaryPhone(req.secondaryPhone() != null ? req.secondaryPhone().trim() : null)
                .zipCode(req.zipCode() != null ? req.zipCode().trim() : null)
                .street(req.street() != null ? req.street().trim() : null)
                .number(req.number() != null ? req.number().trim() : null)
                .complement(req.complement() != null ? req.complement().trim() : null)
                .neighborhood(req.neighborhood() != null ? req.neighborhood().trim() : null)
                .city(req.city() != null && !req.city().isBlank() ? req.city().trim() : null)
                .state(req.state() != null && !req.state().isBlank() ? req.state().trim().toUpperCase() : null)
                .lgpdConsent(lgpd)
                .lgpdConsentDate(lgpd ? LocalDateTime.now() : null)
                .status(stdStatus)
                .statusReason(req.statusReason() != null && !req.statusReason().isBlank() ? req.statusReason().trim() : null)
                .statusNotes(req.statusNotes() != null && !req.statusNotes().isBlank() ? req.statusNotes().trim() : null)
                .statusDate(req.statusDate() != null ? req.statusDate() : LocalDate.now())
                .build();

        c = customerRepository.save(c);
        auditLogService.log(AuditAction.CREATE, "Customer", c.getId().toString(), "Cliente cadastrado: " + c.getName());

        return toDto(c);
    }

    @Transactional
    public CustomerDto.CustomerResponse update(Long id, Long companyId, CustomerDto.CustomerRequest req) {
        Customer c = findEntity(id, companyId);

        String cleanDoc = req.document().replaceAll("[^0-9]", "");
        if (!c.getDocument().equals(cleanDoc) && customerRepository.existsByCompanyIdAndDocumentAndDeletedFalse(companyId, cleanDoc)) {
            throw new ConflictException("Já existe outro cliente cadastrado com o CPF/CNPJ: " + req.document());
        }

        c.setCustomerType(req.customerType());
        if (req.name() != null) c.setName(req.name().trim());
        c.setDocument(cleanDoc);
        c.setStateOrIdDocument(req.stateOrIdDocument() != null ? req.stateOrIdDocument().trim() : null);
        c.setMaritalStatus(req.maritalStatus());
        c.setProfession(req.profession() != null ? req.profession().trim() : null);
        c.setSpouseName(req.spouseName() != null ? req.spouseName().trim() : null);
        c.setSpouseDocument(req.spouseDocument() != null ? req.spouseDocument().replaceAll("[^0-9]", "") : null);
        if (req.email() != null) c.setEmail(req.email().trim().toLowerCase());
        if (req.phone() != null) c.setPhone(req.phone().trim());
        c.setSecondaryPhone(req.secondaryPhone() != null ? req.secondaryPhone().trim() : null);
        c.setZipCode(req.zipCode() != null ? req.zipCode().trim() : null);
        c.setStreet(req.street() != null ? req.street().trim() : null);
        c.setNumber(req.number() != null ? req.number().trim() : null);
        c.setComplement(req.complement() != null ? req.complement().trim() : null);
        c.setNeighborhood(req.neighborhood() != null ? req.neighborhood().trim() : null);
        c.setCity(req.city() != null && !req.city().isBlank() ? req.city().trim() : null);
        c.setState(req.state() != null && !req.state().isBlank() ? req.state().trim().toUpperCase() : null);

        if (req.status() != null) c.setStatus(req.status());
        if (req.statusReason() != null) c.setStatusReason(req.statusReason().trim());
        if (req.statusNotes() != null) c.setStatusNotes(req.statusNotes().trim());
        if (req.statusDate() != null) c.setStatusDate(req.statusDate());

        boolean lgpdVal = req.lgpdConsent() != null ? req.lgpdConsent() : true;
        c.setLgpdConsent(lgpdVal);
        if (lgpdVal && c.getLgpdConsentDate() == null) {
            c.setLgpdConsentDate(LocalDateTime.now());
        }

        c = customerRepository.save(c);
        auditLogService.log(AuditAction.UPDATE, "Customer", c.getId().toString(), "Cliente atualizado: " + c.getName());

        return toDto(c);
    }

    @Transactional
    public CustomerDto.CustomerResponse changeStatus(Long id, Long companyId, StatusChangeRequest req) {
        req.validate();
        Customer c = findEntity(id, companyId);
        StandardStatus oldStatus = c.getStatus();

        c.setStatus(req.status());
        c.setStatusReason(req.reason() != null && !req.reason().isBlank() ? req.reason().trim() : null);
        c.setStatusNotes(req.notes() != null && !req.notes().isBlank() ? req.notes().trim() : null);
        c.setStatusDate(req.statusDate() != null ? req.statusDate() : LocalDate.now());

        c = customerRepository.save(c);

        String details = String.format("Alteração de status de %s (%s) para %s (%s). Motivo: %s. Observação: %s. Data da alteração: %s",
                oldStatus != null ? oldStatus.name() : "STATUS_NAO_INFORMADO",
                oldStatus != null ? oldStatus.getLabel() : "Status não informado",
                req.status().name(), req.status().getLabel(),
                req.reason() != null ? req.reason() : "Nenhum",
                req.notes() != null ? req.notes() : "Nenhuma",
                c.getStatusDate());
        auditLogService.log(AuditAction.STATUS_CHANGE, "Customer", c.getId().toString(), details);

        return toDto(c);
    }

    @Transactional
    public void delete(Long id, Long companyId) {
        Customer c = findEntity(id, companyId);

        boolean hasActiveContracts = contractRepository.findByCustomerId(id).stream()
                .anyMatch(ct -> ct.getStatus() == ContractStatus.ACTIVE || ct.getStatus() == ContractStatus.SETTLED);

        if (hasActiveContracts) {
            throw new BusinessException("Não é permitido excluir cliente com contratos ativos ou quitados no sistema.");
        }

        c.setDeleted(true);
        customerRepository.save(c);
        auditLogService.log(AuditAction.DELETE, "Customer", c.getId().toString(), "Cliente excluído (soft-delete): " + c.getName());
    }

    public Customer findEntity(Long id, Long companyId) {
        return customerRepository.findById(id)
                .filter(c -> c.getCompany().getId().equals(companyId) && !Boolean.TRUE.equals(c.getDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado."));
    }

    private CustomerDto.CustomerResponse toDto(Customer c) {
        StandardStatus status = c.getStatus();

        return new CustomerDto.CustomerResponse(
                c.getId(),
                c.getCompany().getId(),
                c.getCustomerType(),
                c.getName(),
                c.getDocument(),
                c.getStateOrIdDocument(),
                c.getMaritalStatus(),
                c.getProfession(),
                c.getSpouseName(),
                c.getSpouseDocument(),
                c.getEmail(),
                c.getPhone(),
                c.getSecondaryPhone(),
                c.getZipCode(),
                c.getStreet(),
                c.getNumber(),
                c.getComplement(),
                c.getNeighborhood(),
                c.getCity(),
                c.getState(),
                c.getLgpdConsent(),
                c.getLgpdConsentDate(),

                // Status Padronizado
                status,
                status != null ? status.getLabel() : "Status não informado",
                c.getStatusReason(),
                c.getStatusNotes(),
                c.getStatusDate(),

                c.getCreatedAt()
        );
    }
}
