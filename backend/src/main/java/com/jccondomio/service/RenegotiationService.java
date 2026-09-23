package com.jccondomio.service;

import com.jccondomio.domain.entity.*;
import com.jccondomio.domain.enums.AuditAction;
import com.jccondomio.domain.enums.InstallmentStatus;
import com.jccondomio.domain.enums.InstallmentType;
import com.jccondomio.dto.InstallmentDto;
import com.jccondomio.exception.BusinessException;
import com.jccondomio.exception.ResourceNotFoundException;
import com.jccondomio.repository.*;
import com.jccondomio.util.HolidayUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RenegotiationService {

    private final RenegotiationRepository renegotiationRepository;
    private final ContractRepository contractRepository;
    private final InstallmentRepository installmentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public InstallmentDto.RenegotiationResponse renegotiate(Long companyId, Long userId, InstallmentDto.RenegotiateRequest req) {
        Contract contract = contractRepository.findById(req.contractId())
                .filter(c -> c.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ResourceNotFoundException("Contrato não encontrado."));

        List<Installment> selectedInstallments = installmentRepository.findAllById(req.installmentIds());

        if (selectedInstallments.isEmpty()) {
            throw new BusinessException("Nenhuma parcela válida encontrada para renegociação.");
        }

        for (Installment i : selectedInstallments) {
            if (!i.getContract().getId().equals(contract.getId())) {
                throw new BusinessException("A parcela nº " + i.getInstallmentNumber() + " não pertence ao contrato selecionado.");
            }
            if (i.getStatus() == InstallmentStatus.PAID) {
                throw new BusinessException("Não é permitido renegociar parcelas já quitadas.");
            }
            if (i.getStatus() == InstallmentStatus.RENEGOTIATED || i.getStatus() == InstallmentStatus.CANCELLED) {
                throw new BusinessException("A parcela nº " + i.getInstallmentNumber() + " já se encontra inativa (" + i.getStatus() + ").");
            }
        }

        BigDecimal previousBalance = selectedInstallments.stream()
                .map(Installment::getBalanceAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_EVEN);

        BigDecimal agreedInterest = req.agreedInterestAmount() != null ? req.agreedInterestAmount().setScale(2, RoundingMode.HALF_EVEN) : BigDecimal.ZERO;
        BigDecimal agreedDiscount = req.agreedDiscountAmount() != null ? req.agreedDiscountAmount().setScale(2, RoundingMode.HALF_EVEN) : BigDecimal.ZERO;

        BigDecimal newTotal = previousBalance.add(agreedInterest).subtract(agreedDiscount);
        if (newTotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("O valor final renegociado deve ser maior que zero.");
        }

        // 1. Marca parcelas antigas como RENEGOTIATED
        for (Installment i : selectedInstallments) {
            i.setStatus(InstallmentStatus.RENEGOTIATED);
            i.setNotes((i.getNotes() != null ? i.getNotes() + " | " : "") + "Renegociada em " + req.renegotiationDate());
        }
        installmentRepository.saveAll(selectedInstallments);

        // 2. Calcula e gera as novas parcelas da renegociação com arredondamento preciso
        int count = req.newInstallmentsCount();
        BigDecimal basePerInst = newTotal.divide(BigDecimal.valueOf(count), 2, RoundingMode.FLOOR);
        BigDecimal remainder = newTotal.subtract(basePerInst.multiply(BigDecimal.valueOf(count)));

        List<Installment> existingAll = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contract.getId());
        int lastNumber = existingAll.stream().mapToInt(Installment::getInstallmentNumber).max().orElse(0);

        List<Installment> newInstallments = new ArrayList<>();
        for (int idx = 0; idx < count; idx++) {
            BigDecimal amount = (idx == 0) ? basePerInst.add(remainder) : basePerInst;
            LocalDate baseDate = calculateDateWithDay(req.firstDueDate().plusMonths(idx), req.dueDayOfMonth());
            LocalDate bizDate = HolidayUtil.adjustToNextBusinessDay(baseDate);

            Installment newInst = Installment.builder()
                    .contract(contract)
                    .installmentNumber(lastNumber + idx + 1)
                    .totalInstallments(contract.getInstallments().size() + count)
                    .installmentType(InstallmentType.MONTHLY)
                    .dueDate(baseDate)
                    .businessDueDate(bizDate)
                    .baseAmount(amount)
                    .penaltyAmount(BigDecimal.ZERO)
                    .interestAmount(BigDecimal.ZERO)
                    .discountAmount(BigDecimal.ZERO)
                    .paidAmount(BigDecimal.ZERO)
                    .balanceAmount(amount)
                    .status(InstallmentStatus.PENDING)
                    .notes("Renegociação (" + (idx + 1) + "/" + count + ")")
                    .build();
            newInstallments.add(newInst);
        }

        installmentRepository.saveAll(newInstallments);

        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        Renegotiation renegotiation = Renegotiation.builder()
                .contract(contract)
                .renegotiationDate(req.renegotiationDate())
                .previousOutstandingBalance(previousBalance)
                .agreedInterestAmount(agreedInterest)
                .agreedDiscountAmount(agreedDiscount)
                .newTotalAmount(newTotal)
                .newInstallmentsCount(count)
                .status("CONFIRMED")
                .reason(req.reason())
                .performedByUser(user)
                .replacedInstallments(new ArrayList<>(selectedInstallments))
                .build();

        renegotiation = renegotiationRepository.save(renegotiation);

        auditLogService.log(AuditAction.RENEGOTIATE, "Renegotiation", renegotiation.getId().toString(),
                "Renegociação concluída no Contrato nº " + contract.getContractNumber() + ": Saldo anterior R$ " +
                previousBalance + " substituído por " + count + " parcelas totalizando R$ " + newTotal);

        return toDto(renegotiation);
    }

    @Transactional(readOnly = true)
    public Page<InstallmentDto.RenegotiationResponse> listByCompany(Long companyId, Pageable pageable) {
        return renegotiationRepository.findByContractCompanyId(companyId, pageable)
                .map(this::toDto);
    }

    private LocalDate calculateDateWithDay(LocalDate baseDate, int targetDay) {
        int maxDay = baseDate.lengthOfMonth();
        int day = Math.min(targetDay, maxDay);
        return baseDate.withDayOfMonth(day);
    }

    private InstallmentDto.RenegotiationResponse toDto(Renegotiation r) {
        List<Long> replacedIds = r.getReplacedInstallments() != null
                ? r.getReplacedInstallments().stream().map(Installment::getId).toList()
                : List.of();

        return new InstallmentDto.RenegotiationResponse(
                r.getId(),
                r.getContract().getId(),
                r.getContract().getContractNumber(),
                r.getContract().getCustomer().getName(),
                r.getRenegotiationDate(),
                r.getPreviousOutstandingBalance(),
                r.getAgreedInterestAmount(),
                r.getAgreedDiscountAmount(),
                r.getNewTotalAmount(),
                r.getNewInstallmentsCount(),
                r.getStatus(),
                r.getReason(),
                r.getPerformedByUser() != null ? r.getPerformedByUser().getName() : "Sistema",
                replacedIds,
                r.getCreatedAt()
        );
    }
}
