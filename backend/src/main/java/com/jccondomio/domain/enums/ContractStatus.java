package com.jccondomio.domain.enums;

public enum ContractStatus {
    ACTIVE("Ativo"),
    PAUSED("Pausado"),
    FINISHED("Encerrado"),
    CANCELLED("Cancelado"),

    // Aliases legados para compatibilidade
    DRAFT("Ativo"),
    SETTLED("Encerrado"),
    RESCINDED("Cancelado"),
    IN_RENEGOTIATION("Pausado"),
    TERMINATED("Encerrado");

    private final String label;

    ContractStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
