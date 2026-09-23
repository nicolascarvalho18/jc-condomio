package com.jccondomio.controller;

import com.jccondomio.domain.enums.ContractStatus;
import com.jccondomio.dto.ContractDto;
import com.jccondomio.security.UserPrincipal;
import com.jccondomio.service.ContractService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/contracts")
@RequiredArgsConstructor
@Tag(name = "Contratos de Venda e Obras", description = "Simulação, emissão, controle, alteração e encerramento de contratos")
public class ContractController {

    private final ContractService contractService;

    @PostMapping("/simulate")
    @Operation(summary = "Simula a grade de parcelas antes da assinatura do contrato")
    public ResponseEntity<ContractDto.SimulationResponse> simulate(
            @Valid @RequestBody ContractDto.ContractSimulationRequest request
    ) {
        return ResponseEntity.ok(contractService.simulate(request));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCEIRO', 'OPERADOR')")
    @Operation(summary = "Emite um novo contrato gerando suas parcelas no banco de dados")
    public ResponseEntity<ContractDto.ContractResponse> create(
            @Valid @RequestBody ContractDto.CreateContractRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contractService.create(principal.getCompanyId(), request));
    }

    @GetMapping
    @Operation(summary = "Lista todos os contratos com filtros por status e busca")
    public ResponseEntity<Page<ContractDto.ContractResponse>> list(
            @RequestParam(required = false) ContractStatus status,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(contractService.list(principal.getCompanyId(), status, search, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtém detalhes do contrato por ID")
    public ResponseEntity<ContractDto.ContractResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(contractService.getById(id, principal.getCompanyId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCEIRO', 'OPERADOR')")
    @Operation(summary = "Atualiza notas, condições e parâmetros do contrato")
    public ResponseEntity<ContractDto.ContractResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ContractDto.UpdateContractRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(contractService.update(id, principal.getCompanyId(), request));
    }

    @PostMapping("/{id}/terminate")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCEIRO')")
    @Operation(summary = "Encerra um contrato impedindo novas cobranças e preservando o histórico")
    public ResponseEntity<ContractDto.ContractResponse> terminate(
            @PathVariable Long id,
            @Valid @RequestBody ContractDto.TerminateContractRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(contractService.terminate(id, principal.getCompanyId(), request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCEIRO', 'OPERADOR')")
    @Operation(summary = "Altera o status padronizado do contrato (Ativo, Pausado, Encerrado, Cancelado)")
    public ResponseEntity<ContractDto.ContractResponse> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody com.jccondomio.dto.StatusChangeRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(contractService.changeStatus(id, principal.getCompanyId(), request));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCEIRO')")
    @Operation(summary = "Cancela um contrato (apenas se não houver parcelas pagas)")
    public ResponseEntity<Void> cancel(
            @PathVariable Long id,
            @RequestParam(defaultValue = "Cancelado pelo usuário") String reason,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        contractService.cancelContract(id, principal.getCompanyId(), reason);
        return ResponseEntity.noContent().build();
    }
}
