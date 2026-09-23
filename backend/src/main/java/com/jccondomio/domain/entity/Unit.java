package com.jccondomio.domain.entity;

import com.jccondomio.domain.enums.UnitStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "units", uniqueConstraints = {
    @UniqueConstraint(name = "uk_block_unit", columnNames = {"building_block_id", "unit_number"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Unit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_block_id", nullable = false)
    private BuildingBlock buildingBlock;

    @Column(name = "unit_number", nullable = false, length = 30)
    private String unitNumber;

    @Column(name = "floor_number")
    private Integer floorNumber;

    @Column(length = 50)
    private String typology;

    @Column(name = "private_area", precision = 10, scale = 2)
    private BigDecimal privateArea;

    @Column(name = "total_area", precision = 10, scale = 2)
    private BigDecimal totalArea;

    @Column(name = "parking_spaces")
    @Builder.Default
    private Integer parkingSpaces = 0;

    @Column(name = "ideal_fraction", precision = 8, scale = 6)
    private BigDecimal idealFraction;

    @Column(name = "base_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal basePrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UnitStatus status;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
