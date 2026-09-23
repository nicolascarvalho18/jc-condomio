package com.jccondomio.controller;

import com.jccondomio.domain.enums.StandardStatus;
import com.jccondomio.dto.CondominiumDto;
import com.jccondomio.dto.StatusChangeRequest;
import com.jccondomio.security.UserPrincipal;
import com.jccondomio.service.CondominiumService;
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
@RequestMapping("/api/v1/condominiums")
@RequiredArgsConstructor
@Tag(name = "Condomínios", description = "Gestão de empreendimentos imobiliários e condomínios")
public class CondominiumController {

    private final CondominiumService condominiumService;

    @GetMapping
    @Operation(summary = "Lista todos os condomínios da empresa com paginação, busca e filtro por status")
    public ResponseEntity<Page<CondominiumDto.CondominiumResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) StandardStatus status,
            @PageableDefault(size = 10, sort = "name") Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(condominiumService.list(principal.getCompanyId(), search, status, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Busca detalhes de um condomínio pelo ID")
    public ResponseEntity<CondominiumDto.CondominiumResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(condominiumService.getById(id, principal.getCompanyId()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
    @Operation(summary = "Cadastra um novo condomínio")
    public ResponseEntity<CondominiumDto.CondominiumResponse> create(
            @Valid @RequestBody CondominiumDto.CondominiumRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(condominiumService.create(principal.getCompanyId(), request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
    @Operation(summary = "Atualiza os dados de um condomínio")
    public ResponseEntity<CondominiumDto.CondominiumResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CondominiumDto.CondominiumRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(condominiumService.update(id, principal.getCompanyId(), request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
    @Operation(summary = "Altera o status padronizado do condomínio/obra (Ativo, Pausado, Encerrado, Cancelado)")
    public ResponseEntity<CondominiumDto.CondominiumResponse> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusChangeRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(condominiumService.changeStatus(id, principal.getCompanyId(), request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Remove um condomínio (Exclusivo ADMIN - Soft Delete)")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        condominiumService.delete(id, principal.getCompanyId());
        return ResponseEntity.noContent().build();
    }
}
