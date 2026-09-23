package com.jccondomio.domain.entity;

import com.jccondomio.domain.enums.CondominiumType;
import com.jccondomio.domain.enums.ConstructionStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "condominiums")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Condominium {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    // --- Seção 1: Dados do Condomínio / Empreendimento ---
    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 18)
    private String cnpj;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CondominiumType type;

    @Column(name = "registration_number", length = 50)
    private String registrationNumber;

    @Column(name = "permit_number", length = 50)
    private String permitNumber;

    @Column(name = "zip_code", length = 10)
    private String zipCode;

    @Column(length = 150)
    private String street;

    @Column(length = 20)
    private String number;

    @Column(length = 100)
    private String complement;

    @Column(length = 100)
    private String neighborhood;

    @Column(length = 100)
    private String city;

    @Column(length = 2)
    private String state;

    // --- Seção 2: Responsáveis ---
    @Column(name = "manager_name", length = 150)
    private String managerName;

    @Column(name = "manager_cpf", length = 14)
    private String managerCpf;

    @Column(name = "manager_phone", length = 20)
    private String managerPhone;

    @Column(name = "manager_email", length = 120)
    private String managerEmail;

    @Column(name = "administrator_name", length = 150)
    private String administratorName;

    @Column(name = "administrator_cnpj", length = 18)
    private String administratorCnpj;

    @Column(name = "financial_contact_name", length = 150)
    private String financialContactName;

    @Column(name = "financial_contact_phone", length = 20)
    private String financialContactPhone;

    @Column(name = "financial_contact_email", length = 120)
    private String financialContactEmail;

    // --- Seção 3: Dados da Obra ---
    @Column(name = "work_type", length = 100)
    private String workType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private com.jccondomio.domain.enums.StandardStatus status = com.jccondomio.domain.enums.StandardStatus.ACTIVE;

    @Column(name = "status_reason", columnDefinition = "TEXT")
    private String statusReason;

    @Column(name = "status_notes", columnDefinition = "TEXT")
    private String statusNotes;

    @Column(name = "status_date")
    private LocalDate statusDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "construction_status", nullable = false, length = 30)
    private ConstructionStatus constructionStatus;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "expected_completion_date")
    private LocalDate expectedCompletionDate;

    @Column(name = "halt_reason", columnDefinition = "TEXT")
    private String haltReason;

    @Column(name = "construction_company", length = 150)
    private String constructionCompany;

    @Column(name = "chief_engineer", length = 150)
    private String chiefEngineer;

    @Column(name = "crea_cau", length = 50)
    private String creaCau;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // --- Seção 4: Estrutura ---
    @Column(name = "total_blocks")
    @Builder.Default
    private Integer totalBlocks = 0;

    @Column(name = "total_towers")
    @Builder.Default
    private Integer totalTowers = 0;

    @Column(name = "total_units_planned")
    @Builder.Default
    private Integer totalUnitsPlanned = 0;

    @Column(name = "parking_spaces")
    @Builder.Default
    private Integer parkingSpaces = 0;

    @Column(name = "total_area", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalArea = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private Boolean deleted = false;

    @OneToMany(mappedBy = "condominium", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BuildingBlock> blocks = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
