package com.jccondomio.controller;

import com.jccondomio.dto.CompanyDto;
import com.jccondomio.security.UserPrincipal;
import com.jccondomio.service.CompanyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/companies")
@RequiredArgsConstructor
@Tag(name = "Empresa", description = "Gestão de dados cadastrais e parâmetros financeiros da empresa")
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping("/my")
    @Operation(summary = "Obtém dados cadastrais e regras financeiras da empresa atual")
    public ResponseEntity<CompanyDto.CompanyResponse> getMyCompany(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(companyService.getCompany(principal.getCompanyId()));
    }

    @PutMapping("/my")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Atualiza dados e regras financeiras padrão da empresa (Exclusivo ADMIN)")
    public ResponseEntity<CompanyDto.CompanyResponse> updateMyCompany(
            @Valid @RequestBody CompanyDto.CompanyRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(companyService.updateCompany(principal.getCompanyId(), request));
    }
}
