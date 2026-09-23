package com.jccondomio.controller;

import com.jccondomio.domain.enums.StandardStatus;
import com.jccondomio.dto.CustomerDto;
import com.jccondomio.dto.StatusChangeRequest;
import com.jccondomio.security.UserPrincipal;
import com.jccondomio.service.CustomerService;
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
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Clientes", description = "Gestão de clientes compradores (PF/PJ) com conformidade LGPD")
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    @Operation(summary = "Lista todos os clientes com paginação, busca e filtro por status")
    public ResponseEntity<Page<CustomerDto.CustomerResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) StandardStatus status,
            @PageableDefault(size = 10, sort = "name") Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(customerService.list(principal.getCompanyId(), search, status, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtém detalhes do cliente por ID")
    public ResponseEntity<CustomerDto.CustomerResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(customerService.getById(id, principal.getCompanyId()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
    @Operation(summary = "Cadastra um novo cliente (PF ou PJ)")
    public ResponseEntity<CustomerDto.CustomerResponse> create(
            @Valid @RequestBody CustomerDto.CustomerRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.create(principal.getCompanyId(), request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
    @Operation(summary = "Atualiza os dados cadastrais do cliente")
    public ResponseEntity<CustomerDto.CustomerResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CustomerDto.CustomerRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(customerService.update(id, principal.getCompanyId(), request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
    @Operation(summary = "Altera o status padronizado do cliente (Ativo, Pausado, Encerrado, Cancelado)")
    public ResponseEntity<CustomerDto.CustomerResponse> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusChangeRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(customerService.changeStatus(id, principal.getCompanyId(), request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Remove um cliente (se não possuir contratos)")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        customerService.delete(id, principal.getCompanyId());
        return ResponseEntity.noContent().build();
    }
}
