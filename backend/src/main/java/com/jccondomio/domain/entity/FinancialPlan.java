package com.jccondomio.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "financial_plans")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinancialPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false, unique = true)
    private Contract contract;

    @Column(name = "down_payment_installments_count", nullable = false)
    @Builder.Default
    private Integer downPaymentInstallmentsCount = 1;

    @Column(name = "monthly_installments_count", nullable = false)
    @Builder.Default
    private Integer monthlyInstallmentsCount = 1;

    @Column(name = "first_due_date", nullable = false)
    private LocalDate firstDueDate;

    @Column(name = "due_day_of_month", nullable = false)
    private Integer dueDayOfMonth;

    @Column(name = "has_intermediate_installments", nullable = false)
    @Builder.Default
    private Boolean hasIntermediateInstallments = false;

    @Column(name = "intermediate_installments_count")
    @Builder.Default
    private Integer intermediateInstallmentsCount = 0;

    @Column(name = "intermediate_frequency_months")
    @Builder.Default
    private Integer intermediateFrequencyMonths = 6;

    @Column(name = "intermediate_amount_per_installment", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal intermediateAmountPerInstallment = BigDecimal.ZERO;

    @Column(name = "keys_installment_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal keysInstallmentAmount = BigDecimal.ZERO;

    @Column(name = "keys_due_date")
    private LocalDate keysDueDate;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
