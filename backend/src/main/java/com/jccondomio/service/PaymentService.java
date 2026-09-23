package com.jccondomio.service;

import com.jccondomio.domain.entity.Contract;
import com.jccondomio.domain.entity.Installment;
import com.jccondomio.domain.entity.Payment;
import com.jccondomio.domain.entity.User;
import com.jccondomio.domain.enums.AuditAction;
import com.jccondomio.domain.enums.ContractStatus;
import com.jccondomio.domain.enums.InstallmentStatus;
import com.jccondomio.dto.InstallmentDto;
import com.jccondomio.exception.BusinessException;
import com.jccondomio.exception.ResourceNotFoundException;
import com.jccondomio.repository.ContractRepository;
import com.jccondomio.repository.InstallmentRepository;
import com.jccondomio.repository.PaymentRepository;
import com.jccondomio.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final InstallmentRepository installmentRepository;
    private final PaymentRepository paymentRepository;
    private final ContractRepository contractRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final ContractualMoraService contractualMoraService;

    private ContractualMoraService moraService() {
        // Mantém compatibilidade com testes/unitários que instanciam o serviço manualmente.
        return contractualMoraService != null ? contractualMoraService : new ContractualMoraService();
    }

    /**
     * Calcula encargos sugeridos de juros e multa para uma data de pagamento informada.
     */
    @Transactional(readOnly = true)
    public CalculatedCharges calculateCharges(Long installmentId, LocalDate paymentDate) {
        return calculateCharges(installmentId, null, paymentDate);
    }

    @Transactional(readOnly = true)
    public CalculatedCharges calculateCharges(Long installmentId, Long companyId, LocalDate paymentDate) {
        Installment inst = installmentRepository.findById(installmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcela não encontrada."));
        if (companyId != null && !inst.getContract().getCompany().getId().equals(companyId)) {
            throw new ResourceNotFoundException("Parcela não pertence à sua empresa.");
        }

        Contract contract = inst.getContract();
        BigDecimal penaltyPercent = contract.getPenaltyPercent() != null ? contract.getPenaltyPercent() : new BigDecimal("2.00");
        BigDecimal monthlyRate = contract.getInterestPercentMonthly() != null ? contract.getInterestPercentMonthly() : new BigDecimal("1.00");
        ContractualMoraService.MoraResult result = moraService().calculate(inst, penaltyPercent, monthlyRate,
                contract.getGraceDays() != null ? contract.getGraceDays() : 0, paymentDate);
        BigDecimal remaining = result.updatedAmount().subtract(inst.getPaidAmount() != null ? inst.getPaidAmount() : BigDecimal.ZERO)
                .max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_EVEN);
        return new CalculatedCharges(result.penaltyAmount(), result.interestAmount(), remaining, result.daysLate());
    }

    public record CalculatedCharges(
            BigDecimal penaltyAmount,
            BigDecimal interestAmount,
            BigDecimal totalPayable,
            int daysLate
    ) {}

    /**
     * Registra o pagamento de uma parcela com baixa financeira definitiva e auditada.
     */
    @Transactional
    public InstallmentDto.PaymentResponse processPayment(Long installmentId, Long companyId, Long userId, InstallmentDto.PaymentRequest req) {
        Installment inst = installmentRepository.findById(installmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcela não encontrada."));

        if (!inst.getContract().getCompany().getId().equals(companyId)) {
            throw new ResourceNotFoundException("Parcela não pertence à sua empresa.");
        }

        if (inst.getStatus() == InstallmentStatus.PAID) {
            throw new BusinessException("Esta parcela já se encontra totalmente quitada.");
        }

        if (inst.getStatus() == InstallmentStatus.CANCELLED || inst.getStatus() == InstallmentStatus.RENEGOTIATED) {
            throw new BusinessException("Não é possível pagar uma parcela com status: " + inst.getStatus());
        }

        BigDecimal discount = req.discountApplied() != null ? req.discountApplied().setScale(2, RoundingMode.HALF_EVEN) : BigDecimal.ZERO;
        BigDecimal amountReceived = req.amountReceived().setScale(2, RoundingMode.HALF_EVEN);

        Contract contract = inst.getContract();
        BigDecimal previousPenalty = amount(inst.getPenaltyAmount());
        BigDecimal previousInterest = amount(inst.getInterestAmount());
        ContractualMoraService.MoraResult mora = moraService().calculate(inst,
                contract.getPenaltyPercent(), contract.getInterestPercentMonthly(),
                contract.getGraceDays() != null ? contract.getGraceDays() : 0, req.paymentDate());
        BigDecimal previousDiscount = amount(inst.getDiscountAmount());
        BigDecimal totalDiscount = previousDiscount.add(discount);
        BigDecimal updatedAmount = mora.originalAmount().add(mora.penaltyAmount()).add(mora.interestAmount())
                .subtract(totalDiscount).setScale(2, RoundingMode.HALF_EVEN);
        BigDecimal currentTotalDue = updatedAmount.subtract(amount(inst.getPaidAmount()));
        if (currentTotalDue.compareTo(BigDecimal.ZERO) < 0) {
            currentTotalDue = BigDecimal.ZERO;
        }

        if (amountReceived.compareTo(currentTotalDue) > 0) {
            throw new BusinessException("O valor recebido não pode ser maior que o saldo total da parcela.");
        }

        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        Payment payment = Payment.builder()
                .installment(inst)
                .paymentDate(req.paymentDate())
                .amountReceived(amountReceived)
                .penaltyApplied(mora.penaltyAmount().subtract(previousPenalty).max(BigDecimal.ZERO))
                .interestApplied(mora.interestAmount().subtract(previousInterest).max(BigDecimal.ZERO))
                .discountApplied(discount)
                .paymentMethod(req.paymentMethod())
                .transactionReference(req.transactionReference())
                .registeredByUser(user)
                .notes(req.notes())
                .build();

        payment = paymentRepository.save(payment);

        // Atualização dos saldos da parcela
        inst.setOriginalAmount(mora.originalAmount());
        inst.setPenaltyAmount(mora.penaltyAmount());
        inst.setInterestAmount(mora.interestAmount());
        inst.setDiscountAmount(totalDiscount);
        inst.setDaysLate(mora.daysLate());
        inst.setUpdatedAmount(updatedAmount);
        inst.setPaidAmount(inst.getPaidAmount().add(amountReceived));

        if (amountReceived.compareTo(currentTotalDue) >= 0) {
            inst.setBalanceAmount(BigDecimal.ZERO);
            inst.setStatus(InstallmentStatus.PAID);
        } else {
            inst.setBalanceAmount(updatedAmount.subtract(inst.getPaidAmount()).max(BigDecimal.ZERO));
            inst.setStatus(InstallmentStatus.PARTIALLY_PAID);
        }

        inst = installmentRepository.save(inst);

        // Verifica se todas as parcelas do contrato foram quitadas
        List<Installment> contractInsts = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contract.getId());
        boolean allPaid = contractInsts.stream().allMatch(i -> i.getStatus() == InstallmentStatus.PAID || i.getStatus() == InstallmentStatus.CANCELLED || i.getStatus() == InstallmentStatus.RENEGOTIATED);
        if (allPaid) {
            contract.setStatus(ContractStatus.SETTLED);
            contractRepository.save(contract);
        }

        auditLogService.log(AuditAction.PAYMENT, "Installment", inst.getId().toString(),
                "Pagamento registrado: R$ " + amountReceived + " na parcela nº " + inst.getInstallmentNumber() +
                "/" + inst.getTotalInstallments() + " do Contrato " + contract.getContractNumber() + " via " + req.paymentMethod());

        return toDto(payment);
    }

    private BigDecimal amount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    /**
     * Atualização diária automatizada de parcelas vencidas (executa todo dia à meia-noite).
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void updateOverdueInstallments() {
        LocalDate today = LocalDate.now();
        List<Installment> candidates = installmentRepository.findAll().stream()
                .filter(i -> i.getContract() != null && i.getContract().getStatus() == ContractStatus.ACTIVE)
                .filter(i -> i.getStatus() != InstallmentStatus.PAID
                        && i.getStatus() != InstallmentStatus.CANCELLED
                        && i.getStatus() != InstallmentStatus.RENEGOTIATED)
                .filter(i -> i.getBusinessDueDate().isBefore(today))
                .toList();

        for (Installment i : candidates) {
            Contract contract = i.getContract();
            moraService().apply(i, contract.getPenaltyPercent(), contract.getInterestPercentMonthly(),
                    contract.getGraceDays() != null ? contract.getGraceDays() : 0, today);
            i.setStatus(InstallmentStatus.OVERDUE);
        }
        if (!candidates.isEmpty()) {
            installmentRepository.saveAll(candidates);
        }
    }

    private InstallmentDto.PaymentResponse toDto(Payment p) {
        return new InstallmentDto.PaymentResponse(
                p.getId(),
                p.getInstallment().getId(),
                p.getPaymentDate(),
                p.getAmountReceived(),
                p.getPenaltyApplied(),
                p.getInterestApplied(),
                p.getDiscountApplied(),
                p.getPaymentMethod(),
                p.getTransactionReference(),
                p.getRegisteredByUser() != null ? p.getRegisteredByUser().getName() : "Sistema",
                p.getNotes(),
                p.getCreatedAt()
        );
    }
}
