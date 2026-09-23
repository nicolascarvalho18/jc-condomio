package com.jccondomio.dto;

import com.jccondomio.domain.enums.AuditAction;

import java.time.LocalDateTime;

public class AuditLogDto {

    public record AuditLogResponse(
            Long id,
            AuditAction action,
            String entityName,
            String entityId,
            String performedByEmail,
            String ipAddress,
            String details,
            LocalDateTime createdAt
    ) {}
}
