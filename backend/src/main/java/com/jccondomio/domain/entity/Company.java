package com.jccondomio.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "companies")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 18)
    private String cnpj;

    @Column(name = "corporate_name", nullable = false, length = 150)
    private String corporateName;

    @Column(name = "trade_name", nullable = false, length = 150)
    private String tradeName;

    @Column(name = "state_registration", length = 30)
    private String stateRegistration;

    @Column(length = 100)
    private String email;

    @Column(length = 20)
    private String phone;

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

    @Column(name = "default_penalty_percent", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal defaultPenaltyPercent = new BigDecimal("2.00");

    @Column(name = "default_interest_percent_monthly", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal defaultInterestPercentMonthly = new BigDecimal("1.00");

    @Column(name = "default_grace_days", nullable = false)
    @Builder.Default
    private Integer defaultGraceDays = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
