package com.jccondomio.dto;

import com.jccondomio.domain.enums.UnitStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class UnitDto {

    public record UnitRequest(
            @NotBlank(message = "Número da unidade é obrigatório")
            String unitNumber,

            Integer floorNumber,
            String typology,
            BigDecimal privateArea,
            BigDecimal totalArea,
            Integer parkingSpaces,
            BigDecimal idealFraction,

            @NotNull(message = "Preço base é obrigatório")
            @DecimalMin(value = "0.01", message = "O preço base deve ser maior que zero")
            BigDecimal basePrice,

            @NotNull(message = "Status da unidade é obrigatório")
            UnitStatus status,

            String notes
    ) {}

    public record UnitResponse(
            Long id,
            Long buildingBlockId,
            String buildingBlockName,
            Long condominiumId,
            String condominiumName,
            String unitNumber,
            Integer floorNumber,
            String typology,
            BigDecimal privateArea,
            BigDecimal totalArea,
            Integer parkingSpaces,
            BigDecimal idealFraction,
            BigDecimal basePrice,
            UnitStatus status,
            Long version,
            String notes,
            LocalDateTime createdAt
    ) {}

    public record UnitBatchCreateRequest(
            @NotBlank(message = "Prefixo é obrigatório (ex: Apto, Lote)")
            String prefix,

            int startNumber,
            int endNumber,
            Integer floorNumber,
            String typology,
            BigDecimal privateArea,
            BigDecimal totalArea,
            Integer parkingSpaces,
            BigDecimal basePrice
    ) {}
}
