package com.jccondomio.domain.entity;

import com.jccondomio.domain.enums.AdjustmentIndex;
import com.jccondomio.domain.enums.ContractStatus;
import com.jccondomio.domain.enums.ContractType;
import com.jccondomio.domain.enums.PricingModel;
import com.jccondomio.domain.enums.ServiceType;
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
@Table(name = "contracts")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type", length = 30)
    @Builder.Default
    private ContractType contractType = ContractType.CUSTOMER_PURCHASE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id")
    private Unit unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "condominium_id")
    private Condominium condominium;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", length = 50)
    private ServiceType serviceType;

    @Column(name = "service_description", columnDefinition = "TEXT")
    private String serviceDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_model", length = 30)
    @Builder.Default
    private PricingModel pricingModel = PricingModel.TOTAL_VALUE;

    @Column(name = "billing_type", length = 30)
    @Builder.Default
    private String billingType = "PARCELED";

    @Column(name = "payment_method", length = 30)
    @Builder.Default
    private String paymentMethod = "BOLETO";

    @Column(name = "payment_condition", length = 100)
    private String paymentCondition;

    @Column(name = "discount_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "termination_date")
    private LocalDate terminationDate;

    @Column(name = "termination_reason", columnDefinition = "TEXT")
    private String terminationReason;

    @Column(name = "contract_number", nullable = false, unique = true, length = 50)
    private String contractNumber;

    @Column(name = "contract_date", nullable = false)
    private LocalDate contractDate;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "down_payment", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal downPayment = BigDecimal.ZERO;

    @Column(name = "balance_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal balanceAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ContractStatus status = ContractStatus.ACTIVE;

    @Column(name = "status_reason", columnDefinition = "TEXT")
    private String statusReason;

    @Column(name = "status_notes", columnDefinition = "TEXT")
    private String statusNotes;

    @Column(name = "status_date")
    private LocalDate statusDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_index", length = 30)
    @Builder.Default
    private AdjustmentIndex adjustmentIndex = AdjustmentIndex.NONE;

    @Column(name = "penalty_percent", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal penaltyPercent = new BigDecimal("2.00");

    @Column(name = "interest_percent_monthly", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal interestPercentMonthly = new BigDecimal("1.00");

    @Column(name = "grace_days", nullable = false)
    @Builder.Default
    private Integer graceDays = 0;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @OneToOne(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true)
    private FinancialPlan financialPlan;

    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("installmentNumber ASC")
    @Builder.Default
    private List<Installment> installments = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
