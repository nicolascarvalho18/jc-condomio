package com.jccondomio.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

public class BuildingBlockDto {

    public record BuildingBlockRequest(
            @NotBlank(message = "Nome ou identificação do bloco/torre é obrigatório")
            String name,

            Integer totalFloors,
            String notes
    ) {}

    public record BuildingBlockResponse(
            Long id,
            Long condominiumId,
            String condominiumName,
            String name,
            Integer totalFloors,
            String notes,
            long totalUnits,
            LocalDateTime createdAt
    ) {}
}
