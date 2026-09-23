package com.jccondomio.service;

import com.jccondomio.domain.entity.Company;
import com.jccondomio.domain.enums.AuditAction;
import com.jccondomio.dto.CompanyDto;
import com.jccondomio.exception.ResourceNotFoundException;
import com.jccondomio.repository.CompanyRepository;
import com.jccondomio.repository.ContractRepository;
import com.jccondomio.repository.InstallmentRepository;
import com.jccondomio.domain.enums.ContractStatus;
import com.jccondomio.domain.entity.Contract;
import com.jccondomio.domain.entity.Installment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final AuditLogService auditLogService;
    private final ContractRepository contractRepository;
    private final InstallmentRepository installmentRepository;
    private final ContractualMoraService contractualMoraService;

    @Transactional(readOnly = true)
    public CompanyDto.CompanyResponse getCompany(Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada."));
        return toDto(company);
    }

    @Transactional
    public CompanyDto.CompanyResponse updateCompany(Long companyId, CompanyDto.CompanyRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada."));

        BigDecimal previousPenalty = company.getDefaultPenaltyPercent();
        BigDecimal previousInterest = company.getDefaultInterestPercentMonthly();
        Integer previousGrace = company.getDefaultGraceDays();
        boolean policyChanged = previousPenalty.compareTo(request.defaultPenaltyPercent()) != 0
                || previousInterest.compareTo(request.defaultInterestPercentMonthly()) != 0
                || !previousGrace.equals(request.defaultGraceDays());

        company.setCorporateName(request.corporateName());
        company.setTradeName(request.tradeName());
        company.setStateRegistration(request.stateRegistration());
        company.setEmail(request.email());
        company.setPhone(request.phone());
        company.setZipCode(request.zipCode());
        company.setStreet(request.street());
        company.setNumber(request.number());
        company.setComplement(request.complement());
        company.setNeighborhood(request.neighborhood());
        company.setCity(request.city());
        company.setState(request.state());
        company.setDefaultPenaltyPercent(request.defaultPenaltyPercent());
        company.setDefaultInterestPercentMonthly(request.defaultInterestPercentMonthly());
        company.setDefaultGraceDays(request.defaultGraceDays());

        company = companyRepository.save(company);
        if (policyChanged) {
            List<Contract> activeContracts = contractRepository.findByCompanyIdAndStatusIn(
                    companyId, List.of(ContractStatus.ACTIVE));
            int recalculated = 0;
            for (Contract contract : activeContracts) {
                contract.setPenaltyPercent(company.getDefaultPenaltyPercent());
                contract.setInterestPercentMonthly(company.getDefaultInterestPercentMonthly());
                contract.setGraceDays(company.getDefaultGraceDays());
                List<Installment> installments = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contract.getId());
                for (Installment installment : installments) {
                    if (installment.getStatus() != com.jccondomio.domain.enums.InstallmentStatus.PAID
                            && installment.getStatus() != com.jccondomio.domain.enums.InstallmentStatus.CANCELLED
                            && installment.getStatus() != com.jccondomio.domain.enums.InstallmentStatus.RENEGOTIATED
                            && installment.getBusinessDueDate().isBefore(LocalDate.now())) {
                        contractualMoraService.apply(installment, company.getDefaultPenaltyPercent(),
                                company.getDefaultInterestPercentMonthly(), company.getDefaultGraceDays(), LocalDate.now());
                        recalculated++;
                    }
                }
                installmentRepository.saveAll(installments);
            }
            contractRepository.saveAll(activeContracts);
            auditLogService.log(AuditAction.UPDATE, "ContractualMoraPolicy", company.getId().toString(),
                    "Política alterada. Anterior: multa=" + previousPenalty + "%, juros=" + previousInterest
                            + "%, carência=" + previousGrace + " dias. Nova: multa=" + company.getDefaultPenaltyPercent()
                            + "%, juros=" + company.getDefaultInterestPercentMonthly() + "%, carência=" + company.getDefaultGraceDays()
                            + " dias. Contratos ativos atualizados: " + activeContracts.size()
                            + ". Parcelas vencidas recalculadas: " + recalculated + ".");
        } else {
            auditLogService.log(AuditAction.UPDATE, "Company", company.getId().toString(), "Dados cadastrais da empresa atualizados.");
        }

        return toDto(company);
    }

    private CompanyDto.CompanyResponse toDto(Company c) {
        return new CompanyDto.CompanyResponse(
                c.getId(),
                c.getCnpj(),
                c.getCorporateName(),
                c.getTradeName(),
                c.getStateRegistration(),
                c.getEmail(),
                c.getPhone(),
                c.getZipCode(),
                c.getStreet(),
                c.getNumber(),
                c.getComplement(),
                c.getNeighborhood(),
                c.getCity(),
                c.getState(),
                c.getDefaultPenaltyPercent(),
                c.getDefaultInterestPercentMonthly(),
                c.getDefaultGraceDays(),
                c.getCreatedAt()
        );
    }
}
