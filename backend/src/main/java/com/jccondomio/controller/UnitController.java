package com.jccondomio.controller;

import com.jccondomio.domain.enums.UnitStatus;
import com.jccondomio.dto.UnitDto;
import com.jccondomio.security.UserPrincipal;
import com.jccondomio.service.UnitService;
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

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Unidades e Apartamentos", description = "Gestão de unidades privativas, lotes ou apartamentos")
public class UnitController {

    private final UnitService unitService;

    @GetMapping("/blocks/{blockId}/units")
    @Operation(summary = "Lista unidades pertencentes a um bloco específico")
    public ResponseEntity<List<UnitDto.UnitResponse>> listByBlock(@PathVariable Long blockId) {
        return ResponseEntity.ok(unitService.listByBlock(blockId));
    }

    @GetMapping("/condominiums/{condoId}/units")
    @Operation(summary = "Lista unidades do condomínio com filtro opcional por status e paginação")
    public ResponseEntity<Page<UnitDto.UnitResponse>> listByCondo(
            @PathVariable Long condoId,
            @RequestParam(required = false) UnitStatus status,
            @PageableDefault(size = 20, sort = "unitNumber") Pageable pageable
    ) {
        return ResponseEntity.ok(unitService.listByCondominium(condoId, status, pageable));
    }

    @GetMapping("/units/{id}")
    @Operation(summary = "Obtém detalhes de uma unidade")
    public ResponseEntity<UnitDto.UnitResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(unitService.getById(id));
    }

    @PostMapping("/blocks/{blockId}/units")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
    @Operation(summary = "Cadastra uma unidade individual")
    public ResponseEntity<UnitDto.UnitResponse> create(
            @PathVariable Long blockId,
            @Valid @RequestBody UnitDto.UnitRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(unitService.create(blockId, principal.getCompanyId(), request));
    }

    @PostMapping("/blocks/{blockId}/units/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
    @Operation(summary = "Gera múltiplas unidades em lote de forma sequencial")
    public ResponseEntity<List<UnitDto.UnitResponse>> batchCreate(
            @PathVariable Long blockId,
            @Valid @RequestBody UnitDto.UnitBatchCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(unitService.batchCreate(blockId, principal.getCompanyId(), request));
    }

    @PutMapping("/units/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
    @Operation(summary = "Atualiza os dados de uma unidade")
    public ResponseEntity<UnitDto.UnitResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UnitDto.UnitRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(unitService.update(id, principal.getCompanyId(), request));
    }

    @DeleteMapping("/units/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Exclui uma unidade (se não tiver contrato ativo/quitado)")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        unitService.delete(id, principal.getCompanyId());
        return ResponseEntity.noContent().build();
    }
}
