package com.jccondomio.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "renegotiations")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Renegotiation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Column(name = "renegotiation_date", nullable = false)
    private LocalDate renegotiationDate;

    @Column(name = "previous_outstanding_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal previousOutstandingBalance;

    @Column(name = "agreed_interest_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal agreedInterestAmount = BigDecimal.ZERO;

    @Column(name = "agreed_discount_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal agreedDiscountAmount = BigDecimal.ZERO;

    @Column(name = "new_total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal newTotalAmount;

    @Column(name = "new_installments_count", nullable = false)
    private Integer newInstallmentsCount;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "CONFIRMED";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_user_id")
    private User performedByUser;

    @ManyToMany
    @JoinTable(
        name = "renegotiation_installments",
        joinColumns = @JoinColumn(name = "renegotiation_id"),
        inverseJoinColumns = @JoinColumn(name = "installment_id")
    )
    @Builder.Default
    private List<Installment> replacedInstallments = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
