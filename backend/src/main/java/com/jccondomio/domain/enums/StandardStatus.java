package com.jccondomio.domain.enums;

public enum StandardStatus {
    ACTIVE("Ativo"),
    PAUSED("Pausado"),
    FINISHED("Encerrado"),
    CANCELLED("Cancelado");

    private final String label;

    StandardStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
