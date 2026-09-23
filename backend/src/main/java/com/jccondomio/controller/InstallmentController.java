package com.jccondomio.controller;

import com.jccondomio.domain.entity.Contract;
import com.jccondomio.domain.entity.Installment;
import com.jccondomio.domain.entity.Payment;
import com.jccondomio.domain.enums.InstallmentFinancialSituation;
import com.jccondomio.dto.InstallmentDto;
import com.jccondomio.repository.InstallmentRepository;
import com.jccondomio.security.UserPrincipal;
import com.jccondomio.service.PaymentService;
import com.jccondomio.service.RenegotiationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Financeiro e Parcelas", description = "Contas a receber, baixa de pagamentos, cálculo de mora/multa e renegociação")
public class InstallmentController {

    private final InstallmentRepository installmentRepository;
    private final PaymentService paymentService;
    private final RenegotiationService renegotiationService;
    private final com.jccondomio.service.InstallmentFinancialSituationService installmentFinancialSituationService;

    @GetMapping("/contracts/{contractId}/installments")
    @Transactional(readOnly = true)
    @Operation(summary = "Lista todas as parcelas de um contrato")
    public ResponseEntity<List<InstallmentDto.InstallmentResponse>> listByContract(
            @PathVariable Long contractId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<InstallmentDto.InstallmentResponse> list = installmentRepository
                .findByContractIdAndContractCompanyIdOrderByInstallmentNumberAsc(contractId, principal.getCompanyId()).stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/installments")
    @Transactional(readOnly = true)
    @Operation(summary = "Consulta de parcelas com filtros avançados por status, grupo, contratante, obra, serviço e período")
    public ResponseEntity<Page<InstallmentDto.InstallmentResponse>> listFiltered(
            @RequestParam(required = false) InstallmentFinancialSituation financialSituation,
            @RequestParam(required = false) String statusGroup,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) Long condominiumId,
            @RequestParam(required = false) com.jccondomio.domain.enums.ServiceType serviceType,
            @RequestParam(required = false) com.jccondomio.domain.enums.ContractStatus contractStatus,
            @RequestParam(required = false) java.math.BigDecimal minAmount,
            @RequestParam(required = false) java.math.BigDecimal maxAmount,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 50, sort = "businessDueDate") Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        String cleanGroup = financialSituation != null ? switch (financialSituation) {
            case EM_ABERTO -> "OPEN";
            case VENCE_HOJE -> "TODAY";
            case VENCIDA -> "OVERDUE";
            case PARCIALMENTE_PAGA -> "PARTIAL";
            case PAGA -> "PAID";
            case CANCELADA -> "CANCELLED";
        } : (statusGroup != null && !statusGroup.isBlank() ? statusGroup.trim() : null);
        Page<Installment> page = installmentRepository.findFilteredAdvanced(
                principal.getCompanyId(),
                null,
                cleanGroup,
                customerId,
                condominiumId,
                serviceType,
                contractStatus,
                minAmount,
                maxAmount,
                startDate,
                endDate,
                cleanSearch,
                LocalDate.now(),
                LocalDate.now().plusDays(7),
                LocalDate.now().plusDays(30),
                pageable
        );
        return ResponseEntity.ok(page.map(this::toDto));
    }

    @GetMapping("/installments/overdue")
    @Transactional(readOnly = true)
    @Operation(summary = "Lista todas as parcelas vencidas da empresa")
    public ResponseEntity<Page<InstallmentDto.InstallmentResponse>> listOverdue(
            @PageableDefault(size = 20, sort = "businessDueDate") Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(installmentRepository.findOverdue(principal.getCompanyId(), pageable).map(this::toDto));
    }

    @GetMapping("/installments/{id}/calculate-charges")
    @Transactional(readOnly = true)
    @Operation(summary = "Calcula em tempo real os juros de mora e multa para a data de pagamento prevista")
    public ResponseEntity<PaymentService.CalculatedCharges> calculateCharges(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate paymentDate,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(paymentService.calculateCharges(id, principal.getCompanyId(), paymentDate));
    }

    @PostMapping("/installments/{id}/payments")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCEIRO')")
    @Operation(summary = "Registra a baixa de pagamento da parcela (Quitação total ou parcial)")
    public ResponseEntity<InstallmentDto.PaymentResponse> processPayment(
            @PathVariable Long id,
            @Valid @RequestBody InstallmentDto.PaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.processPayment(id, principal.getCompanyId(), principal.getId(), request));
    }

    @PostMapping("/installments/renegotiate")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCEIRO')")
    @Operation(summary = "Renegocia um conjunto de parcelas devedoras, gerando novo fluxo auditado")
    public ResponseEntity<InstallmentDto.RenegotiationResponse> renegotiate(
            @Valid @RequestBody InstallmentDto.RenegotiateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(renegotiationService.renegotiate(principal.getCompanyId(), principal.getId(), request));
    }

    @GetMapping("/renegotiations")
    @Transactional(readOnly = true)
    @Operation(summary = "Lista o histórico de renegociações efetuadas")
    public ResponseEntity<Page<InstallmentDto.RenegotiationResponse>> listRenegotiations(
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(renegotiationService.listByCompany(principal.getCompanyId(), pageable));
    }

    private InstallmentDto.InstallmentResponse toDto(Installment i) {
        List<InstallmentDto.PaymentResponse> paymentDtos = i.getPayments() != null
                ? i.getPayments().stream().map(this::toPaymentDto).toList()
                : List.of();

        Contract c = i.getContract();
        String customerName = c.getCustomer() != null ? c.getCustomer().getName() : (c.getCondominium() != null ? c.getCondominium().getName() : "—");
        String unitNumber = c.getUnit() != null ? c.getUnit().getUnitNumber() : (c.getDescription() != null ? c.getDescription() : "Geral");
        String condoName = "—";
        if (c.getCondominium() != null) {
            condoName = c.getCondominium().getName();
        } else if (c.getUnit() != null && c.getUnit().getBuildingBlock() != null && c.getUnit().getBuildingBlock().getCondominium() != null) {
            condoName = c.getUnit().getBuildingBlock().getCondominium().getName();
        }

        Long customerId = c.getCustomer() != null ? c.getCustomer().getId() : null;
        Long condominiumId = c.getCondominium() != null ? c.getCondominium().getId() : (c.getUnit() != null && c.getUnit().getBuildingBlock() != null ? c.getUnit().getBuildingBlock().getCondominium().getId() : null);
        com.jccondomio.domain.enums.ServiceType serviceType = c.getServiceType();
        String serviceLabel = c.getServiceType() != null ? c.getServiceType().getLabel() : (c.getDescription() != null ? c.getDescription() : "Construção Civil");

        InstallmentFinancialSituation financialSituation = installmentFinancialSituationService.calculate(i, LocalDate.now());

        return new InstallmentDto.InstallmentResponse(
                i.getId(),
                c.getId(),
                c.getContractNumber(),
                c.getStatus(),
                c.getStatus() != null ? c.getStatus().getLabel() : "Status não informado",
                customerId,
                customerName,
                condominiumId,
                condoName,
                unitNumber,
                serviceType,
                serviceLabel,
                i.getInstallmentNumber(),
                i.getTotalInstallments(),
                i.getInstallmentType(),
                i.getDueDate(),
                i.getBusinessDueDate(),
                i.getBaseAmount(),
                i.getOriginalAmount(),
                i.getPenaltyAmount(),
                i.getInterestAmount(),
                i.getDiscountAmount(),
                i.getTotalPayable(),
                i.getDaysLate(),
                i.getUpdatedAmount(),
                i.getPaidAmount(),
                i.getBalanceAmount(),
                financialSituation,
                financialSituation.getLabel(),
                financialSituation == InstallmentFinancialSituation.PAGA && !paymentDtos.isEmpty()
                        ? paymentDtos.get(paymentDtos.size() - 1).paymentDate()
                        : financialSituation == InstallmentFinancialSituation.CANCELADA ? i.getStatusDate() : i.getBusinessDueDate(),
                i.getVersion(),
                i.getNotes(),
                paymentDtos,
                i.getCreatedAt()
        );
    }

    private InstallmentDto.PaymentResponse toPaymentDto(Payment p) {
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
