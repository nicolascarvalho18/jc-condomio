package com.jccondomio.domain.entity;

import com.jccondomio.domain.enums.InstallmentStatus;
import com.jccondomio.domain.enums.InstallmentType;
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
@Table(name = "installments")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Installment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "total_installments", nullable = false)
    private Integer totalInstallments;

    @Enumerated(EnumType.STRING)
    @Column(name = "installment_type", nullable = false, length = 30)
    private InstallmentType installmentType;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "business_due_date", nullable = false)
    private LocalDate businessDueDate;

    @Column(name = "base_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal baseAmount;

    @Column(name = "original_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal originalAmount = BigDecimal.ZERO;

    @Column(name = "penalty_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal penaltyAmount = BigDecimal.ZERO;

    @Column(name = "interest_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal interestAmount = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "paid_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "balance_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal balanceAmount;

    @Column(name = "days_late", nullable = false)
    @Builder.Default
    private Integer daysLate = 0;

    @Column(name = "updated_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal updatedAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private InstallmentStatus status = InstallmentStatus.ACTIVE;

    @Column(name = "status_reason", columnDefinition = "TEXT")
    private String statusReason;

    @Column(name = "status_notes", columnDefinition = "TEXT")
    private String statusNotes;

    @Column(name = "status_date")
    private LocalDate statusDate;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(length = 255)
    private String notes;

    @OneToMany(mappedBy = "installment", cascade = CascadeType.ALL)
    @OrderBy("paymentDate ASC")
    @Builder.Default
    private List<Payment> payments = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public BigDecimal getTotalPayable() {
        if (updatedAmount != null && updatedAmount.compareTo(BigDecimal.ZERO) > 0) {
            return updatedAmount;
        }
        return baseAmount
                .add(penaltyAmount != null ? penaltyAmount : BigDecimal.ZERO)
                .add(interestAmount != null ? interestAmount : BigDecimal.ZERO)
                .subtract(discountAmount != null ? discountAmount : BigDecimal.ZERO);
    }

    @PrePersist
    void initializeMoraFields() {
        if (originalAmount == null || originalAmount.compareTo(BigDecimal.ZERO) == 0) {
            originalAmount = baseAmount;
        }
        if (updatedAmount == null || updatedAmount.compareTo(BigDecimal.ZERO) == 0) {
            updatedAmount = baseAmount
                    .add(penaltyAmount != null ? penaltyAmount : BigDecimal.ZERO)
                    .add(interestAmount != null ? interestAmount : BigDecimal.ZERO)
                    .subtract(discountAmount != null ? discountAmount : BigDecimal.ZERO);
        }
    }
}
