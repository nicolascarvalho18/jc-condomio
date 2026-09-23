package com.jccondomio.controller;

import com.jccondomio.dto.BuildingBlockDto;
import com.jccondomio.security.UserPrincipal;
import com.jccondomio.service.BuildingBlockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Blocos e Torres", description = "Gestão de blocos ou torres dos condomínios")
public class BuildingBlockController {

    private final BuildingBlockService buildingBlockService;

    @GetMapping("/condominiums/{condoId}/blocks")
    @Operation(summary = "Lista todos os blocos pertencentes a um condomínio")
    public ResponseEntity<List<BuildingBlockDto.BuildingBlockResponse>> listByCondo(
            @PathVariable Long condoId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(buildingBlockService.listByCondominium(condoId, principal.getCompanyId()));
    }

    @PostMapping("/condominiums/{condoId}/blocks")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERADOR')")
    @Operation(summary = "Cadastra um bloco ou torre em um condomínio")
    public ResponseEntity<BuildingBlockDto.BuildingBlockResponse> create(
            @PathVariable Long condoId,
            @Valid @RequestBody BuildingBlockDto.BuildingBlockRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(buildingBlockService.create(condoId, principal.getCompanyId(), request));
    }

    @DeleteMapping("/blocks/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Exclui um bloco (Exclusivo ADMIN, se não contiver unidades)")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        buildingBlockService.delete(id, principal.getCompanyId());
        return ResponseEntity.noContent().build();
    }
}
