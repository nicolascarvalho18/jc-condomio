package com.jccondomio.controller;

import com.jccondomio.security.UserPrincipal;
import com.jccondomio.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Relatórios Financeiros", description = "Exportação de extratos e relatórios em PDF e Excel (.xlsx)")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/contracts/{id}/excel")
    @Operation(summary = "Exporta a grade de parcelas do contrato para planilha Excel (.xlsx)")
    public ResponseEntity<byte[]> exportContractExcel(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        byte[] excelBytes = reportService.generateContractExcel(id, principal.getCompanyId());
        String contractNumber = reportService.getContractNumber(id, principal.getCompanyId()).replaceAll("[^a-zA-Z0-9-]", "-");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Planilha_Contrato_" + contractNumber + "_Souza-Construcao.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    @GetMapping("/contracts/{id}/pdf")
    @Operation(summary = "Gera o extrato financeiro formal do contrato em PDF")
    public ResponseEntity<byte[]> exportContractPdf(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        byte[] pdfBytes = reportService.generateContractPdf(id, principal.getCompanyId());
        String contractNumber = reportService.getContractNumber(id, principal.getCompanyId()).replaceAll("[^a-zA-Z0-9-]", "-");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Extrato_Contrato_" + contractNumber + "_Souza-Construcao.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}
