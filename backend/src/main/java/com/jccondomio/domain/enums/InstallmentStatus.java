package com.jccondomio.domain.enums;

public enum InstallmentStatus {
    ACTIVE("Ativo"),
    PAUSED("Pausado"),
    FINISHED("Encerrado"),
    CANCELLED("Cancelado"),

    // Aliases legados para compatibilidade
    PENDING("Ativo"),
    PAID("Encerrado"),
    PARTIALLY_PAID("Ativo"),
    OVERDUE("Ativo"),
    RENEGOTIATED("Cancelado");

    private final String label;

    InstallmentStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
