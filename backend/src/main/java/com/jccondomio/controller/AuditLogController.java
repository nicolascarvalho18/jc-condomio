package com.jccondomio.controller;

import com.jccondomio.domain.entity.AuditLog;
import com.jccondomio.dto.AuditLogDto;
import com.jccondomio.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Auditoria do Sistema", description = "Trilha de auditoria das operações (Exclusivo Administradores)")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lista o registro de auditoria com data, usuário, IP e detalhes")
    public ResponseEntity<Page<AuditLogDto.AuditLogResponse>> list(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable
    ) {
        Page<AuditLog> page = auditLogService.listAll(pageable);
        Page<AuditLogDto.AuditLogResponse> dtoPage = page.map(l -> new AuditLogDto.AuditLogResponse(
                l.getId(),
                l.getAction(),
                l.getEntityName(),
                l.getEntityId(),
                l.getPerformedByEmail(),
                l.getIpAddress(),
                l.getDetails(),
                l.getCreatedAt()
        ));
        return ResponseEntity.ok(dtoPage);
    }
}
