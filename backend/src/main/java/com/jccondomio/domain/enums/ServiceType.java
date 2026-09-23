package com.jccondomio.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ServiceType {
    CONSTRUCTION("Construção"),
    RENOVATION("Reforma"),
    MAINTENANCE("Manutenção"),
    INSTALLATION("Instalação"),
    PAINTING("Pintura"),
    ELECTRICAL("Elétrica"),
    PLUMBING("Hidráulica"),
    POST_CONSTRUCTION_CLEANING("Limpeza pós-obra"),
    SECURITY("Segurança"),
    ADMINISTRATION("Administração"),
    OTHER("Outro");

    private final String label;
}
