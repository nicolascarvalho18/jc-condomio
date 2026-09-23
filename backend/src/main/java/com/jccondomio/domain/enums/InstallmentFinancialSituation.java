package com.jccondomio.domain.enums;

/** Situação financeira calculada; não é um status editável da parcela. */
public enum InstallmentFinancialSituation {
    EM_ABERTO("Não paga"),
    VENCE_HOJE("Vence hoje"),
    VENCIDA("Vencida"),
    PARCIALMENTE_PAGA("Parcialmente paga"),
    PAGA("Paga"),
    CANCELADA("Cancelada");

    private final String label;

    InstallmentFinancialSituation(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
