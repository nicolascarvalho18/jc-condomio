package com.jccondomio.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PricingModel {
    TOTAL_VALUE("Valor Total"),
    MONTHLY_VALUE("Valor Mensal Recorrente");

    private final String label;
}
