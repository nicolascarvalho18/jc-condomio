package com.jccondomio.dto;

import com.jccondomio.domain.enums.CondominiumType;
import com.jccondomio.domain.enums.ConstructionStatus;
import com.jccondomio.domain.enums.StandardStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class CondominiumDto {

    public record CondominiumRequest(
            // Seção 1: Dados do condomínio/empreendimento
            @NotBlank(message = "Nome do condomínio ou empreendimento é obrigatório")
            @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres")
            String name,

            String cnpj,

            @NotNull(message = "Tipo de condomínio/empreendimento é obrigatório")
            CondominiumType type,

            String registrationNumber,
            String permitNumber,
            String zipCode,
            String street,
            String number,
            String complement,
            String neighborhood,

            @NotBlank(message = "Cidade é obrigatória")
            String city,

            @NotBlank(message = "Estado é obrigatório")
            @Size(min = 2, max = 2, message = "Estado deve ter 2 caracteres (UF)")
            String state,

            // Seção 2: Responsáveis
            @NotBlank(message = "Nome do síndico é obrigatório")
            String managerName,

            String managerCpf,
            String managerPhone,
            String managerEmail,
            String administratorName,
            String administratorCnpj,
            String financialContactName,
            String financialContactPhone,
            String financialContactEmail,

            // Seção 3: Dados da obra
            @NotBlank(message = "Tipo de obra é obrigatório")
            String workType,

            @NotNull(message = "Status da obra é obrigatório")
            ConstructionStatus constructionStatus,

            StandardStatus status,
            String statusReason,
            String statusNotes,
            LocalDate statusDate,

            LocalDate startDate,
            LocalDate expectedCompletionDate,
            String haltReason,
            String constructionCompany,
            String chiefEngineer,
            String creaCau,
            String notes,

            // Seção 4: Estrutura
            Integer totalBlocks,
            Integer totalTowers,
            Integer totalUnitsPlanned,
            Integer parkingSpaces,
            BigDecimal totalArea
    ) {}

    public record CondominiumResponse(
            Long id,
            Long companyId,
            String name,
            String cnpj,
            CondominiumType type,
            String typeLabel,
            String registrationNumber,
            String permitNumber,
            String zipCode,
            String street,
            String number,
            String complement,
            String neighborhood,
            String city,
            String state,

            // Responsáveis
            String managerName,
            String managerCpf,
            String managerPhone,
            String managerEmail,
            String administratorName,
            String administratorCnpj,
            String financialContactName,
            String financialContactPhone,
            String financialContactEmail,

            // Dados da Obra
            String workType,
            ConstructionStatus constructionStatus,
            String constructionStatusLabel,

            // Status Padronizado
            StandardStatus status,
            String statusLabel,
            String statusReason,
            String statusNotes,
            LocalDate statusDate,

            LocalDate startDate,
            LocalDate expectedCompletionDate,
            String haltReason,
            String constructionCompany,
            String chiefEngineer,
            String creaCau,
            String notes,

            // Estrutura
            Integer totalBlocks,
            Integer totalTowers,
            Integer totalUnitsPlanned,
            Integer parkingSpaces,
            BigDecimal totalArea,

            long actualBlocksCount,
            long actualUnitsCount,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}
