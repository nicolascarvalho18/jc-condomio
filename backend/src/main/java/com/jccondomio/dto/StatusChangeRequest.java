package com.jccondomio.dto;

import com.jccondomio.domain.enums.StandardStatus;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record StatusChangeRequest(
        @NotNull(message = "Novo status é obrigatório")
        StandardStatus status,

        String reason,

        String notes,

        LocalDate statusDate
) {
    public void validate() {
        if (status == StandardStatus.CANCELLED) {
            if (reason == null || reason.trim().isBlank()) {
                throw new IllegalArgumentException("O motivo é obrigatório para cancelamento.");
            }
        }
    }
}
