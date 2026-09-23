package com.jccondomio.config;

import com.jccondomio.domain.entity.*;
import com.jccondomio.domain.enums.*;
import com.jccondomio.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
// Dados de demonstração só podem ser ativados explicitamente em ambiente local controlado.
@Profile("demo")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final CondominiumRepository condominiumRepository;
    private final BuildingBlockRepository buildingBlockRepository;
    private final UnitRepository unitRepository;
    private final CustomerRepository customerRepository;
    private final ContractRepository contractRepository;
    private final InstallmentRepository installmentRepository;
    private final PaymentRepository paymentRepository;

    @Override
    @Transactional
    public void run(String... args) {
        Company company = companyRepository.findAll().stream().findFirst().orElse(null);
        User admin = userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.ADMIN && Boolean.TRUE.equals(user.getActive()))
                .findFirst()
                .orElse(null);

        if (company == null) {
            log.info("Inicializando empresa padrão e usuário administrador...");
            company = Company.builder()
                    .cnpj("00.000.000/0001-00")
                    .tradeName("JC Empreendimentos")
                    .corporateName("JC Construtora e Incorporadora LTDA")
                    .defaultPenaltyPercent(new BigDecimal("2.00"))
                    .defaultInterestPercentMonthly(new BigDecimal("1.00"))
                    .defaultGraceDays(0)
                    .build();
            company = companyRepository.save(company);
        }

        if (admin == null) {
            log.warn("Dados demo não carregados: configure o primeiro administrador pelo fluxo oficial antes de ativar o perfil demo.");
            return;
        }

        if (condominiumRepository.count() == 0) {
            log.info("Populando 2 empreendimentos de demonstração com clientes, contratos e parcelas financeiras...");
            seedDemoData(company, admin);
            log.info("Demonstração carregada com sucesso!");
        }

        if (!condominiumRepository.existsByCompanyIdAndNameIgnoreCaseAndDeletedFalse(company.getId(), "Residencial Vista do Vale")) {
            log.info("Populando 3 novos empreendimentos com clientes, contratos e parcelas financeiras...");
            seedThreeUserRequestedDatasets(company, admin);
            log.info("3 conjuntos de dados fake carregados com sucesso!");
        }

        // Garante o cliente Nicolas Carvalho Ferreira Ceifador cadastrado e salvo
        LocalDate today = LocalDate.now();
        Customer nicolas;
        java.util.Optional<Customer> existingNicolas = customerRepository.findByCompanyIdAndDocumentAndDeletedFalse(company.getId(), "58122291187");
        if (existingNicolas.isPresent()) {
            nicolas = existingNicolas.get();
        } else {
            Customer n = Customer.builder()
                    .company(company)
                    .customerType(CustomerType.INDIVIDUAL)
                    .name("Nicolas Carvalho Ferreira Ceifador")
                    .document("58122291187")
                    .stateOrIdDocument("1223")
                    .maritalStatus("Solteiro(a)")
                    .profession("Engenheiro Civil")
                    .email("nicolasbdhshdh@gmail.com")
                    .phone("(13) 99150-9733")
                    .zipCode("58122-918")
                    .street("Rua Juiz")
                    .number("123")
                    .complement("1223")
                    .neighborhood("11223")
                    .city("Santos")
                    .state("SP")
                    .lgpdConsent(true)
                    .lgpdConsentDate(LocalDateTime.now())
                    .status(com.jccondomio.domain.enums.StandardStatus.ACTIVE)
                    .build();
            nicolas = customerRepository.save(n);
            log.info("Cliente Nicolas Carvalho Ferreira Ceifador persistido com sucesso!");
        }

        // Contrato e parcelas do Nicolas (CTR-2026-6001)
        if (!contractRepository.existsByContractNumber("CTR-2026-6001")) {
            Condominium condo = condominiumRepository.findByCompanyIdAndDeletedFalse(company.getId()).stream()
                    .filter(c -> "Residencial Jardins do Lago".equalsIgnoreCase(c.getName()))
                    .findFirst().orElse(null);
            if (condo != null && nicolas != null) {
                Unit unit102 = unitRepository.findByCondominiumId(condo.getId()).stream()
                        .filter(u -> "102".equals(u.getUnitNumber()))
                        .findFirst().orElse(null);
                if (unit102 != null) {
                    unit102.setStatus(UnitStatus.SOLD);
                    unitRepository.save(unit102);

                    Contract ctrNicolas = Contract.builder()
                            .company(company)
                            .contractType(ContractType.CUSTOMER_PURCHASE)
                            .customer(nicolas)
                            .unit(unit102)
                            .condominium(condo)
                            .description("Aquisição Unidade 102 - Residencial Jardins do Lago")
                            .contractNumber("CTR-2026-6001")
                            .contractDate(today.minusDays(15))
                            .totalAmount(new BigDecimal("360000.00"))
                            .downPayment(new BigDecimal("50000.00"))
                            .balanceAmount(new BigDecimal("310000.00"))
                            .status(ContractStatus.ACTIVE)
                            .adjustmentIndex(AdjustmentIndex.INCC)
                            .penaltyPercent(new BigDecimal("2.00"))
                            .interestPercentMonthly(new BigDecimal("1.00"))
                            .graceDays(5)
                            .paymentMethod("PIX")
                            .billingType("PARCELED")
                            .notes("Contrato padrão de promessa de compra e venda imobiliária.")
                            .build();
                    ctrNicolas = contractRepository.save(ctrNicolas);

                    // Parcela de Entrada (Quitada)
                    Installment instDown = Installment.builder()
                            .contract(ctrNicolas)
                            .installmentNumber(1)
                            .totalInstallments(32)
                            .installmentType(InstallmentType.DOWN_PAYMENT)
                            .dueDate(today.minusDays(15))
                            .businessDueDate(today.minusDays(15))
                            .baseAmount(new BigDecimal("50000.00"))
                            .paidAmount(new BigDecimal("50000.00"))
                            .balanceAmount(BigDecimal.ZERO)
                            .status(InstallmentStatus.PAID)
                            .notes("Entrada quitada via PIX.")
                            .build();
                    instDown = installmentRepository.save(instDown);

                    Payment payDown = Payment.builder()
                            .installment(instDown)
                            .paymentDate(today.minusDays(15))
                            .amountReceived(new BigDecimal("50000.00"))
                            .paymentMethod(PaymentMethod.PIX)
                            .transactionReference("PIX-NICOLAS-01")
                            .registeredByUser(admin)
                            .notes("Sinal e princípio de pagamento liquidado.")
                            .build();
                    paymentRepository.save(payDown);

                    // Parcelas mensais
                    List<Installment> insts = new ArrayList<>();
                    for (int i = 2; i <= 32; i++) {
                        LocalDate d = today.plusMonths(i - 1).withDayOfMonth(10);
                        insts.add(Installment.builder()
                                .contract(ctrNicolas)
                                .installmentNumber(i)
                                .totalInstallments(32)
                                .installmentType(i == 32 ? InstallmentType.KEYS : InstallmentType.MONTHLY)
                                .dueDate(d)
                                .businessDueDate(d)
                                .baseAmount(new BigDecimal("10000.00"))
                                .paidAmount(BigDecimal.ZERO)
                                .balanceAmount(new BigDecimal("10000.00"))
                                .status(InstallmentStatus.PENDING)
                                .build());
                    }
                    installmentRepository.saveAll(insts);
                    log.info("Contrato CTR-2026-6001 do Nicolas persistido com sucesso!");
                }
            }
        }
    }

    private void seedDemoData(Company company, User admin) {
        LocalDate today = LocalDate.now();

        // =========================================================================
        // 1. EMPREENDIMENTO RESIDENCIAL: Residencial Jardins do Lago
        // =========================================================================
        Condominium condo1 = Condominium.builder()
                .company(company)
                .name("Residencial Jardins do Lago")
                .cnpj("12.345.678/0001-90")
                .type(CondominiumType.RESIDENTIAL_CONDOMINIUM)
                .registrationNumber("RI-45.892/2025")
                .permitNumber("ALV-8941/2025")
                .zipCode("04571-010")
                .street("Avenida das Palmeiras")
                .number("500")
                .complement("Gleba 3")
                .neighborhood("Jardim Acácia")
                .city("São Paulo")
                .state("SP")
                .managerName("Eng. Carlos Alberto Ribeiro")
                .managerCpf("123.456.789-00")
                .managerPhone("(11) 98765-4321")
                .managerEmail("carlos.eng@jardinsdolago.com.br")
                .administratorName("Gestão Patrimonial Prime")
                .administratorCnpj("98.765.432/0001-10")
                .financialContactName("Marina Duarte")
                .financialContactPhone("(11) 97654-3210")
                .financialContactEmail("financeiro@jardinsdolago.com.br")
                .constructionStatus(ConstructionStatus.IN_PROGRESS)
                .startDate(today.minusMonths(6))
                .expectedCompletionDate(today.plusMonths(18))
                .constructionCompany("JC Construtora e Incorporadora LTDA")
                .chiefEngineer("Carlos Alberto Ribeiro")
                .creaCau("SP-50629481")
                .totalBlocks(1)
                .totalTowers(1)
                .totalUnitsPlanned(24)
                .parkingSpaces(32)
                .totalArea(new BigDecimal("3500.00"))
                .deleted(false)
                .build();
        condo1 = condominiumRepository.save(condo1);

        BuildingBlock block1 = BuildingBlock.builder()
                .condominium(condo1)
                .name("Torre Acácia")
                .totalFloors(8)
                .notes("Torre residencial de 8 andares com unidades de 2 e 3 dormitórios.")
                .build();
        block1 = buildingBlockRepository.save(block1);

        Unit unit101 = Unit.builder()
                .buildingBlock(block1)
                .unitNumber("101")
                .floorNumber(1)
                .typology("3 Quartos (1 Suíte)")
                .privateArea(new BigDecimal("85.50"))
                .totalArea(new BigDecimal("115.00"))
                .parkingSpaces(2)
                .idealFraction(new BigDecimal("0.041667"))
                .basePrice(new BigDecimal("450000.00"))
                .status(UnitStatus.SOLD)
                .notes("Unidade vendida para Dr. Roberto Mendes Silveira.")
                .build();

        Unit unit102 = Unit.builder()
                .buildingBlock(block1)
                .unitNumber("102")
                .floorNumber(1)
                .typology("2 Quartos (1 Suíte)")
                .privateArea(new BigDecimal("68.00"))
                .totalArea(new BigDecimal("92.00"))
                .parkingSpaces(1)
                .idealFraction(new BigDecimal("0.033333"))
                .basePrice(new BigDecimal("360000.00"))
                .status(UnitStatus.AVAILABLE)
                .notes("Disponível para comercialização.")
                .build();

        Unit unit201 = Unit.builder()
                .buildingBlock(block1)
                .unitNumber("201")
                .floorNumber(2)
                .typology("3 Quartos (1 Suíte)")
                .privateArea(new BigDecimal("85.50"))
                .totalArea(new BigDecimal("115.00"))
                .parkingSpaces(2)
                .idealFraction(new BigDecimal("0.041667"))
                .basePrice(new BigDecimal("465000.00"))
                .status(UnitStatus.AVAILABLE)
                .notes("Disponível para comercialização.")
                .build();

        unit101 = unitRepository.save(unit101);
        unit102 = unitRepository.save(unit102);
        unit201 = unitRepository.save(unit201);

        // Cliente 1 (Pessoa Física)
        Customer customer1 = Customer.builder()
                .company(company)
                .customerType(CustomerType.INDIVIDUAL)
                .name("Dr. Roberto Mendes Silveira")
                .document("529.982.247-25")
                .stateOrIdDocument("41.234.567-8")
                .maritalStatus("Casado")
                .profession("Médico Cardiologista")
                .spouseName("Dra. Beatriz Helena Silveira")
                .spouseDocument("284.195.378-01")
                .email("roberto.silveira@hospitalmed.com.br")
                .phone("(11) 99123-4567")
                .zipCode("04571-010")
                .street("Rua dos Pinheiros")
                .number("1250")
                .complement("Apto 82")
                .neighborhood("Pinheiros")
                .city("São Paulo")
                .state("SP")
                .lgpdConsent(true)
                .lgpdConsentDate(LocalDateTime.now().minusMonths(3))
                .build();
        customer1 = customerRepository.save(customer1);

        // Contrato 1: R$ 450.000,00 (Entrada R$ 50.000 + 35 parcelas de R$ 11.428,57)
        Contract contract1 = Contract.builder()
                .company(company)
                .contractType(ContractType.CUSTOMER_PURCHASE)
                .customer(customer1)
                .unit(unit101)
                .condominium(condo1)
                .description("Aquisição Unidade 101 - Residencial Jardins do Lago")
                .contractNumber("CTR-2026-1001")
                .contractDate(today.minusMonths(2))
                .totalAmount(new BigDecimal("450000.00"))
                .downPayment(new BigDecimal("50000.00"))
                .balanceAmount(new BigDecimal("400000.00"))
                .status(ContractStatus.ACTIVE)
                .adjustmentIndex(AdjustmentIndex.INCC)
                .penaltyPercent(new BigDecimal("2.00"))
                .interestPercentMonthly(new BigDecimal("1.00"))
                .graceDays(5)
                .paymentMethod("PIX")
                .billingType("PARCELED")
                .notes("Contrato padrão de promessa de compra e venda imobiliária com alienação fiduciária.")
                .build();
        contract1 = contractRepository.save(contract1);

        // Parcelas do Contrato 1
        List<Installment> instList1 = new ArrayList<>();

        // Parcela 1: Entrada Quitada via PIX há 2 meses
        Installment inst1_1 = Installment.builder()
                .contract(contract1)
                .installmentNumber(1)
                .totalInstallments(36)
                .installmentType(InstallmentType.DOWN_PAYMENT)
                .dueDate(today.minusMonths(2))
                .businessDueDate(today.minusMonths(2))
                .baseAmount(new BigDecimal("50000.00"))
                .paidAmount(new BigDecimal("50000.00"))
                .balanceAmount(BigDecimal.ZERO)
                .status(InstallmentStatus.PAID)
                .notes("Sinal e princípio de pagamento recebido integralmente via PIX.")
                .build();
        inst1_1 = installmentRepository.save(inst1_1);

        Payment pay1_1 = Payment.builder()
                .installment(inst1_1)
                .paymentDate(today.minusMonths(2))
                .amountReceived(new BigDecimal("50000.00"))
                .penaltyApplied(BigDecimal.ZERO)
                .interestApplied(BigDecimal.ZERO)
                .discountApplied(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.PIX)
                .transactionReference("PIX-SINAL-1001-OK")
                .registeredByUser(admin)
                .notes("Baixa automática de sinal via PIX.")
                .build();
        paymentRepository.save(pay1_1);

        // Parcela 2: Mensal Quitada há 1 mês
        Installment inst1_2 = Installment.builder()
                .contract(contract1)
                .installmentNumber(2)
                .totalInstallments(36)
                .installmentType(InstallmentType.MONTHLY)
                .dueDate(today.minusMonths(1))
                .businessDueDate(today.minusMonths(1))
                .baseAmount(new BigDecimal("11428.57"))
                .paidAmount(new BigDecimal("11428.57"))
                .balanceAmount(BigDecimal.ZERO)
                .status(InstallmentStatus.PAID)
                .notes("Parcela mensal 01/35 quitada pontualmente.")
                .build();
        inst1_2 = installmentRepository.save(inst1_2);

        Payment pay1_2 = Payment.builder()
                .installment(inst1_2)
                .paymentDate(today.minusMonths(1))
                .amountReceived(new BigDecimal("11428.57"))
                .penaltyApplied(BigDecimal.ZERO)
                .interestApplied(BigDecimal.ZERO)
                .discountApplied(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.BOLETO)
                .transactionReference("BOL-1001-M01")
                .registeredByUser(admin)
                .notes("Baixa de boleto bancário compensado.")
                .build();
        paymentRepository.save(pay1_2);

        // Parcela 3: Mensal em Aberto com vencimento em 5 dias (aciona filtro de próximos 7 e 15 dias!)
        Installment inst1_3 = Installment.builder()
                .contract(contract1)
                .installmentNumber(3)
                .totalInstallments(36)
                .installmentType(InstallmentType.MONTHLY)
                .dueDate(today.plusDays(5))
                .businessDueDate(today.plusDays(5))
                .baseAmount(new BigDecimal("11428.57"))
                .paidAmount(BigDecimal.ZERO)
                .balanceAmount(new BigDecimal("11428.57"))
                .status(InstallmentStatus.PENDING)
                .notes("Boleto registrado aguardando pagamento do comprador.")
                .build();
        installmentRepository.save(inst1_3);

        // Parcelas 4 a 36: Mensais futuras
        for (int i = 4; i <= 36; i++) {
            LocalDate dueDate = today.plusMonths(i - 3).withDayOfMonth(Math.min(10, today.lengthOfMonth()));
            Installment instFuture = Installment.builder()
                    .contract(contract1)
                    .installmentNumber(i)
                    .totalInstallments(36)
                    .installmentType(i == 36 ? InstallmentType.KEYS : InstallmentType.MONTHLY)
                    .dueDate(dueDate)
                    .businessDueDate(dueDate)
                    .baseAmount(new BigDecimal("11428.57"))
                    .paidAmount(BigDecimal.ZERO)
                    .balanceAmount(new BigDecimal("11428.57"))
                    .status(InstallmentStatus.PENDING)
                    .build();
            instList1.add(instFuture);
        }
        installmentRepository.saveAll(instList1);


        // =========================================================================
        // 2. EMPREENDIMENTO COMERCIAL: Horizon Corporate Business
        // =========================================================================
        Condominium condo2 = Condominium.builder()
                .company(company)
                .name("Horizon Corporate Business")
                .cnpj("34.567.890/0001-22")
                .type(CondominiumType.COMMERCIAL_CONDOMINIUM)
                .registrationNumber("RI-99.123/2024")
                .permitNumber("ALV-1205/2024")
                .zipCode("01452-000")
                .street("Avenida Brigadeiro Faria Lima")
                .number("3200")
                .complement("Edifício Office Tower")
                .neighborhood("Itaim Bibi")
                .city("São Paulo")
                .state("SP")
                .managerName("Dra. Patrícia Albuquerque")
                .managerCpf("234.567.890-12")
                .managerPhone("(11) 99887-7665")
                .managerEmail("patricia.corp@horizonbusiness.com.br")
                .administratorName("Global Corporate Facilities")
                .administratorCnpj("87.654.321/0001-99")
                .financialContactName("Rodrigo Fonseca")
                .financialContactPhone("(11) 98112-2334")
                .financialContactEmail("financeiro@horizonbusiness.com.br")
                .constructionStatus(ConstructionStatus.COMPLETED)
                .startDate(today.minusMonths(24))
                .expectedCompletionDate(today.minusMonths(2))
                .constructionCompany("JC Construtora e Incorporadora LTDA")
                .chiefEngineer("Eng. Fernando Silveira")
                .creaCau("SP-44910283")
                .totalBlocks(1)
                .totalTowers(1)
                .totalUnitsPlanned(40)
                .parkingSpaces(80)
                .totalArea(new BigDecimal("5200.00"))
                .deleted(false)
                .build();
        condo2 = condominiumRepository.save(condo2);

        BuildingBlock block2 = BuildingBlock.builder()
                .condominium(condo2)
                .name("Torre Empresarial")
                .totalFloors(12)
                .notes("Torre comercial com piso elevado, gerador e infraestrutura tecnológica.")
                .build();
        block2 = buildingBlockRepository.save(block2);

        Unit unit501 = Unit.builder()
                .buildingBlock(block2)
                .unitNumber("Sala 501")
                .floorNumber(5)
                .typology("Conjunto Comercial 65m²")
                .privateArea(new BigDecimal("65.00"))
                .totalArea(new BigDecimal("95.00"))
                .parkingSpaces(2)
                .idealFraction(new BigDecimal("0.025000"))
                .basePrice(new BigDecimal("380000.00"))
                .status(UnitStatus.SOLD)
                .notes("Sala comercial 501 vendida para Nexus Soluções.")
                .build();

        Unit unit502 = Unit.builder()
                .buildingBlock(block2)
                .unitNumber("Sala 502")
                .floorNumber(5)
                .typology("Conjunto Comercial 65m²")
                .privateArea(new BigDecimal("65.00"))
                .totalArea(new BigDecimal("95.00"))
                .parkingSpaces(2)
                .idealFraction(new BigDecimal("0.025000"))
                .basePrice(new BigDecimal("385000.00"))
                .status(UnitStatus.AVAILABLE)
                .notes("Disponível para venda.")
                .build();

        unit501 = unitRepository.save(unit501);
        unit502 = unitRepository.save(unit502);

        // Cliente 2 (Pessoa Jurídica)
        Customer customer2 = Customer.builder()
                .company(company)
                .customerType(CustomerType.LEGAL_ENTITY)
                .name("Nexus Soluções em Tecnologia LTDA")
                .document("11.222.333/0001-81")
                .stateOrIdDocument("110.234.567.890")
                .profession("Serviços de Tecnologia da Informação")
                .email("contato@nexustech.com.br")
                .phone("(11) 3214-5678")
                .secondaryPhone("(11) 98222-3344")
                .zipCode("01452-000")
                .street("Avenida Brigadeiro Faria Lima")
                .number("3200")
                .complement("Conjunto 501")
                .neighborhood("Itaim Bibi")
                .city("São Paulo")
                .state("SP")
                .lgpdConsent(true)
                .lgpdConsentDate(LocalDateTime.now().minusMonths(4))
                .build();
        customer2 = customerRepository.save(customer2);

        // Contrato 2: R$ 380.000,00 (Entrada R$ 60.000 + 24 parcelas de R$ 13.333,33)
        Contract contract2 = Contract.builder()
                .company(company)
                .contractType(ContractType.CUSTOMER_PURCHASE)
                .customer(customer2)
                .unit(unit501)
                .condominium(condo2)
                .description("Aquisição Sala 501 - Horizon Corporate Business")
                .contractNumber("CTR-2026-2002")
                .contractDate(today.minusMonths(1))
                .totalAmount(new BigDecimal("380000.00"))
                .downPayment(new BigDecimal("60000.00"))
                .balanceAmount(new BigDecimal("320000.00"))
                .status(ContractStatus.ACTIVE)
                .adjustmentIndex(AdjustmentIndex.IGPM)
                .penaltyPercent(new BigDecimal("2.00"))
                .interestPercentMonthly(new BigDecimal("1.00"))
                .graceDays(0)
                .paymentMethod("BOLETO")
                .billingType("PARCELED")
                .notes("Contrato corporativo de compra e venda de imóvel comercial.")
                .build();
        contract2 = contractRepository.save(contract2);

        // Parcelas do Contrato 2
        // Parcela 1: Entrada Quitada via Transferência Bancária há 1 mês
        Installment inst2_1 = Installment.builder()
                .contract(contract2)
                .installmentNumber(1)
                .totalInstallments(25)
                .installmentType(InstallmentType.DOWN_PAYMENT)
                .dueDate(today.minusMonths(1))
                .businessDueDate(today.minusMonths(1))
                .baseAmount(new BigDecimal("60000.00"))
                .paidAmount(new BigDecimal("60000.00"))
                .balanceAmount(BigDecimal.ZERO)
                .status(InstallmentStatus.PAID)
                .notes("Entrada quitada via TED Corporativo.")
                .build();
        inst2_1 = installmentRepository.save(inst2_1);

        Payment pay2_1 = Payment.builder()
                .installment(inst2_1)
                .paymentDate(today.minusMonths(1))
                .amountReceived(new BigDecimal("60000.00"))
                .penaltyApplied(BigDecimal.ZERO)
                .interestApplied(BigDecimal.ZERO)
                .discountApplied(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .transactionReference("TED-NEXUS-ENTRADA")
                .registeredByUser(admin)
                .notes("Liquidação de sinal corporativo.")
                .build();
        paymentRepository.save(pay2_1);

        // Parcela 2: Mensal Vencida há 10 dias (demonstra inadimplência e cálculo de mora/multa)
        Installment inst2_2 = Installment.builder()
                .contract(contract2)
                .installmentNumber(2)
                .totalInstallments(25)
                .installmentType(InstallmentType.MONTHLY)
                .dueDate(today.minusDays(10))
                .businessDueDate(today.minusDays(10))
                .baseAmount(new BigDecimal("13333.33"))
                .penaltyAmount(new BigDecimal("266.67"))
                .interestAmount(new BigDecimal("44.44"))
                .paidAmount(BigDecimal.ZERO)
                .balanceAmount(new BigDecimal("13333.33"))
                .status(InstallmentStatus.OVERDUE)
                .notes("Parcela em atraso (10 dias). Notificação amigável enviada.")
                .build();
        installmentRepository.save(inst2_2);

        // Parcela 3: Mensal em Aberto com vencimento em 12 dias (aciona filtro de próximos 15 dias!)
        Installment inst2_3 = Installment.builder()
                .contract(contract2)
                .installmentNumber(3)
                .totalInstallments(25)
                .installmentType(InstallmentType.MONTHLY)
                .dueDate(today.plusDays(12))
                .businessDueDate(today.plusDays(12))
                .baseAmount(new BigDecimal("13333.33"))
                .paidAmount(BigDecimal.ZERO)
                .balanceAmount(new BigDecimal("13333.33"))
                .status(InstallmentStatus.PENDING)
                .notes("Boleto disponível para liquidação.")
                .build();
        installmentRepository.save(inst2_3);

        // Parcelas 4 a 25: Mensais futuras
        List<Installment> instList2 = new ArrayList<>();
        for (int i = 4; i <= 25; i++) {
            LocalDate dueDate = today.plusMonths(i - 2).withDayOfMonth(Math.min(15, today.lengthOfMonth()));
            Installment instFuture = Installment.builder()
                    .contract(contract2)
                    .installmentNumber(i)
                    .totalInstallments(25)
                    .installmentType(i == 25 ? InstallmentType.KEYS : InstallmentType.MONTHLY)
                    .dueDate(dueDate)
                    .businessDueDate(dueDate)
                    .baseAmount(new BigDecimal("13333.33"))
                    .paidAmount(BigDecimal.ZERO)
                    .balanceAmount(new BigDecimal("13333.33"))
                    .status(InstallmentStatus.PENDING)
                    .build();
            instList2.add(instFuture);
        }
        installmentRepository.saveAll(instList2);
    }

    private void seedThreeUserRequestedDatasets(Company company, User admin) {
        LocalDate today = LocalDate.now();

        // -------------------------------------------------------------------------
        // 1. CONJUNTO FAKE 1: Residencial Vista do Vale + Dr. Gabriel Ferreira Castro
        // -------------------------------------------------------------------------
        Condominium condo1 = Condominium.builder()
                .company(company)
                .name("Residencial Vista do Vale")
                .cnpj("76.127.261/0001-39")
                .type(CondominiumType.RESIDENTIAL_CONDOMINIUM)
                .registrationNumber("RI-78.921/2026")
                .permitNumber("ALV-2026/1042")
                .zipCode("74230-100")
                .street("Av. T-63")
                .number("1200")
                .complement("Torre A e B")
                .neighborhood("Setor Bueno")
                .city("Goiânia")
                .state("GO")
                .managerName("Marcos Vinícius Rocha")
                .managerCpf("611.512.751-31")
                .managerPhone("(62) 98123-4567")
                .managerEmail("marcos.sindico@vistadovale.com.br")
                .administratorName("Prime Gestão Condominial LTDA")
                .administratorCnpj("06.504.762/0001-01")
                .financialContactName("Amanda Cavalcante")
                .financialContactPhone("(62) 98765-1122")
                .financialContactEmail("financeiro@vistadovale.com.br")
                .constructionStatus(ConstructionStatus.IN_PROGRESS)
                .startDate(today.minusMonths(3))
                .expectedCompletionDate(today.plusMonths(15))
                .constructionCompany("Construtora Aliança Goiás LTDA")
                .chiefEngineer("Eng. Marcelo Albuquerque")
                .creaCau("CREA-GO 45291/D")
                .notes("Empreendimento residencial com 2 torres, varanda gourmet e lazer completo.")
                .totalBlocks(2)
                .totalTowers(2)
                .totalUnitsPlanned(48)
                .parkingSpaces(64)
                .totalArea(new BigDecimal("6200.00"))
                .deleted(false)
                .build();
        condo1 = condominiumRepository.save(condo1);

        Customer cust1 = Customer.builder()
                .company(company)
                .customerType(CustomerType.INDIVIDUAL)
                .name("Dr. Gabriel Ferreira Castro")
                .document("611.512.751-31")
                .stateOrIdDocument("MG-14.892.401")
                .maritalStatus("Casado")
                .profession("Advogado Especialista em Direito Tributário")
                .spouseName("Mariana Soares Castro")
                .spouseDocument("722.533.250-31")
                .email("gabriel.castro@advocacia.com.br")
                .phone("(62) 99182-7364")
                .secondaryPhone("(62) 3214-5500")
                .zipCode("74150-100")
                .street("Rua T-30")
                .number("450")
                .complement("Apto 802")
                .neighborhood("Setor Marista")
                .city("Goiânia")
                .state("GO")
                .lgpdConsent(true)
                .lgpdConsentDate(LocalDateTime.now())
                .deleted(false)
                .build();
        cust1 = customerRepository.save(cust1);

        Contract ctr1 = Contract.builder()
                .company(company)
                .contractNumber("CTR-2026-5001")
                .contractDate(today)
                .contractType(ContractType.CUSTOMER_PURCHASE)
                .customer(cust1)
                .condominium(condo1)
                .serviceType(ServiceType.ELECTRICAL)
                .serviceDescription("Execução de infraestrutura elétrica e automação residencial completa")
                .pricingModel(PricingModel.TOTAL_VALUE)
                .paymentCondition("Entrada à vista + 36 parcelas mensais")
                .totalAmount(new BigDecimal("420000.00"))
                .downPayment(new BigDecimal("60000.00"))
                .balanceAmount(new BigDecimal("360000.00"))
                .status(ContractStatus.ACTIVE)
                .penaltyPercent(new BigDecimal("2.00"))
                .interestPercentMonthly(new BigDecimal("1.00"))
                .graceDays(5)
                .notes("Contrato com garantia técnica e plano financeiro em 36 meses.")
                .build();
        ctr1 = contractRepository.save(ctr1);

        Installment inst1_1 = Installment.builder()
                .contract(ctr1)
                .installmentNumber(1)
                .totalInstallments(37)
                .installmentType(InstallmentType.DOWN_PAYMENT)
                .dueDate(today)
                .businessDueDate(today)
                .baseAmount(new BigDecimal("60000.00"))
                .paidAmount(new BigDecimal("60000.00"))
                .balanceAmount(BigDecimal.ZERO)
                .status(InstallmentStatus.PAID)
                .notes("Entrada quitada via PIX.")
                .build();
        inst1_1 = installmentRepository.save(inst1_1);

        Payment pay1_1 = Payment.builder()
                .installment(inst1_1)
                .paymentDate(today)
                .amountReceived(new BigDecimal("60000.00"))
                .paymentMethod(PaymentMethod.PIX)
                .transactionReference("PIX-VISTADOVALE-01")
                .registeredByUser(admin)
                .notes("Recebimento integral de entrada via PIX.")
                .build();
        paymentRepository.save(pay1_1);

        List<Installment> instListCtr1 = new ArrayList<>();
        for (int i = 2; i <= 37; i++) {
            LocalDate d = today.plusMonths(i - 1).withDayOfMonth(10);
            instListCtr1.add(Installment.builder()
                    .contract(ctr1)
                    .installmentNumber(i)
                    .totalInstallments(37)
                    .installmentType(InstallmentType.MONTHLY)
                    .dueDate(d)
                    .businessDueDate(d)
                    .baseAmount(new BigDecimal("10000.00"))
                    .paidAmount(BigDecimal.ZERO)
                    .balanceAmount(new BigDecimal("10000.00"))
                    .status(InstallmentStatus.PENDING)
                    .build());
        }
        installmentRepository.saveAll(instListCtr1);


        // -------------------------------------------------------------------------
        // 2. CONJUNTO FAKE 2: Parque das Flores Eco Residence + Dra. Letícia Monteiro
        // -------------------------------------------------------------------------
        Condominium condo2 = Condominium.builder()
                .company(company)
                .name("Parque das Flores Eco Residence")
                .cnpj("03.207.040/0001-05")
                .type(CondominiumType.LOT)
                .registrationNumber("RI-32.145/2026")
                .permitNumber("ALV-2026/0855")
                .zipCode("13080-000")
                .street("Rodovia Dom Pedro I")
                .number("S/N")
                .complement("Km 124 - Fazenda Santa Maria")
                .neighborhood("Distrito de Barão Geraldo")
                .city("Campinas")
                .state("SP")
                .managerName("Beatriz Vasconcelos Prado")
                .managerCpf("722.533.250-31")
                .managerPhone("(19) 97412-8899")
                .managerEmail("beatriz@parquedasflores.com.br")
                .administratorName("EcoAdmin Administradora Predial")
                .administratorCnpj("74.540.800/0001-31")
                .financialContactName("Carlos Eduardo Toledo")
                .financialContactPhone("(19) 99881-2233")
                .financialContactEmail("carlos.toledo@parquedasflores.com.br")
                .constructionStatus(ConstructionStatus.PLANNING)
                .startDate(today.plusMonths(1))
                .expectedCompletionDate(today.plusMonths(20))
                .constructionCompany("Nova Terra Urbanismo & Obras")
                .chiefEngineer("Enga. Renata Farias")
                .creaCau("CREA-SP 98214/D")
                .notes("Loteamento ecológico fechado com clube privativo e lagos preservados.")
                .totalBlocks(1)
                .totalTowers(1)
                .totalUnitsPlanned(120)
                .parkingSpaces(150)
                .totalArea(new BigDecimal("45000.00"))
                .deleted(false)
                .build();
        condo2 = condominiumRepository.save(condo2);

        Customer cust2 = Customer.builder()
                .company(company)
                .customerType(CustomerType.INDIVIDUAL)
                .name("Dra. Letícia Monteiro Guimarães")
                .document("722.533.250-31")
                .stateOrIdDocument("SP-38.192.405-X")
                .maritalStatus("Solteira")
                .profession("Médica Neurologista")
                .email("leticia.guimaraes@hospital.med.br")
                .phone("(19) 98234-5678")
                .secondaryPhone("(19) 3344-9000")
                .zipCode("13025-320")
                .street("Av. José de Souza Campos")
                .number("890")
                .complement("Edifício Executive")
                .neighborhood("Cambuí")
                .city("Campinas")
                .state("SP")
                .lgpdConsent(true)
                .lgpdConsentDate(LocalDateTime.now())
                .deleted(false)
                .build();
        cust2 = customerRepository.save(cust2);

        Contract ctr2 = Contract.builder()
                .company(company)
                .contractNumber("CTR-2026-5002")
                .contractDate(today)
                .contractType(ContractType.CUSTOMER_PURCHASE)
                .customer(cust2)
                .condominium(condo2)
                .serviceType(ServiceType.CONSTRUCTION)
                .serviceDescription("Contrato de aquisição de lote residencial e infraestrutura")
                .pricingModel(PricingModel.TOTAL_VALUE)
                .paymentCondition("Entrada facilitada + 24 parcelas mensais")
                .totalAmount(new BigDecimal("320000.00"))
                .downPayment(new BigDecimal("40000.00"))
                .balanceAmount(new BigDecimal("280000.00"))
                .status(ContractStatus.ACTIVE)
                .penaltyPercent(new BigDecimal("2.00"))
                .interestPercentMonthly(new BigDecimal("1.00"))
                .graceDays(3)
                .notes("Aquisição de lote privativo no Parque das Flores Eco Residence.")
                .build();
        ctr2 = contractRepository.save(ctr2);

        Installment inst2_1 = Installment.builder()
                .contract(ctr2)
                .installmentNumber(1)
                .totalInstallments(25)
                .installmentType(InstallmentType.DOWN_PAYMENT)
                .dueDate(today)
                .businessDueDate(today)
                .baseAmount(new BigDecimal("40000.00"))
                .paidAmount(new BigDecimal("40000.00"))
                .balanceAmount(BigDecimal.ZERO)
                .status(InstallmentStatus.PAID)
                .notes("Entrada quitada via Boleto Bancário.")
                .build();
        inst2_1 = installmentRepository.save(inst2_1);

        Payment pay2_1 = Payment.builder()
                .installment(inst2_1)
                .paymentDate(today)
                .amountReceived(new BigDecimal("40000.00"))
                .paymentMethod(PaymentMethod.BOLETO)
                .transactionReference("BOL-PARQUEFLORES-01")
                .registeredByUser(admin)
                .notes("Liquidação de boleto bancário de entrada.")
                .build();
        paymentRepository.save(pay2_1);

        List<Installment> instListCtr2 = new ArrayList<>();
        for (int i = 2; i <= 25; i++) {
            LocalDate d = today.plusMonths(i - 1).withDayOfMonth(15);
            instListCtr2.add(Installment.builder()
                    .contract(ctr2)
                    .installmentNumber(i)
                    .totalInstallments(25)
                    .installmentType(InstallmentType.MONTHLY)
                    .dueDate(d)
                    .businessDueDate(d)
                    .baseAmount(new BigDecimal("11666.67"))
                    .paidAmount(BigDecimal.ZERO)
                    .balanceAmount(new BigDecimal("11666.67"))
                    .status(InstallmentStatus.PENDING)
                    .build());
        }
        installmentRepository.saveAll(instListCtr2);


        // -------------------------------------------------------------------------
        // 3. CONJUNTO FAKE 3: Metropolitan Office + Metrópole Tecnologia LTDA
        // -------------------------------------------------------------------------
        Condominium condo3 = Condominium.builder()
                .company(company)
                .name("Centro Empresarial Metropolitan Office")
                .cnpj("74.540.800/0001-31")
                .type(CondominiumType.COMMERCIAL_CONDOMINIUM)
                .registrationNumber("RI-99.102/2025")
                .permitNumber("ALV-2025/3910")
                .zipCode("30494-170")
                .street("Av. Raja Gabaglia")
                .number("2000")
                .complement("Edifício Central")
                .neighborhood("Estoril")
                .city("Belo Horizonte")
                .state("MG")
                .managerName("Luciano de Souza Freitas")
                .managerCpf("853.107.850-43")
                .managerPhone("(31) 99876-1122")
                .managerEmail("administracao@metropolitanofficemg.com.br")
                .administratorName("Horizon Gestão Corporativa LTDA")
                .administratorCnpj("06.099.436/0001-66")
                .financialContactName("Patrícia Magalhães")
                .financialContactPhone("(31) 98712-3344")
                .financialContactEmail("financeiro@metropolitanofficemg.com.br")
                .constructionStatus(ConstructionStatus.COMPLETED)
                .startDate(today.minusMonths(18))
                .expectedCompletionDate(today.minusMonths(1))
                .constructionCompany("Mineira Engenharia e Estruturas S/A")
                .chiefEngineer("Eng. Paulo Henrique Rezende")
                .creaCau("CREA-MG 11234/D")
                .notes("Torre comercial corporativa com heliponto homologado e salas modulares.")
                .totalBlocks(1)
                .totalTowers(1)
                .totalUnitsPlanned(36)
                .parkingSpaces(80)
                .totalArea(new BigDecimal("8900.00"))
                .deleted(false)
                .build();
        condo3 = condominiumRepository.save(condo3);

        Customer cust3 = Customer.builder()
                .company(company)
                .customerType(CustomerType.LEGAL_ENTITY)
                .name("Metrópole Tecnologia e Serviços Digitais LTDA")
                .document("06.099.436/0001-66")
                .stateOrIdDocument("003.892.401.0029")
                .profession("Desenvolvimento e Soluções em Nuvem")
                .spouseName("Juliana Mendes Paiva (Sócia-Administradora)")
                .email("contato@metropoletech.com.br")
                .phone("(31) 3245-8800")
                .secondaryPhone("(31) 98877-6655")
                .zipCode("30160-011")
                .street("Rua da Bahia")
                .number("1100")
                .complement("Sala 1402")
                .neighborhood("Centro")
                .city("Belo Horizonte")
                .state("MG")
                .lgpdConsent(true)
                .lgpdConsentDate(LocalDateTime.now())
                .deleted(false)
                .build();
        cust3 = customerRepository.save(cust3);

        Contract ctr3 = Contract.builder()
                .company(company)
                .contractNumber("CTR-2026-5003")
                .contractDate(today)
                .contractType(ContractType.CUSTOMER_PURCHASE)
                .customer(cust3)
                .condominium(condo3)
                .serviceType(ServiceType.MAINTENANCE)
                .serviceDescription("Contrato corporativo de retrofit e modernização predial")
                .pricingModel(PricingModel.TOTAL_VALUE)
                .paymentCondition("Sinal + 20 parcelas mensais corporativas")
                .totalAmount(new BigDecimal("250000.00"))
                .downPayment(new BigDecimal("50000.00"))
                .balanceAmount(new BigDecimal("200000.00"))
                .status(ContractStatus.ACTIVE)
                .penaltyPercent(new BigDecimal("2.00"))
                .interestPercentMonthly(new BigDecimal("1.00"))
                .graceDays(0)
                .notes("Prestação de serviços contínuos com emissão mensal de Nota Fiscal de Serviços.")
                .build();
        ctr3 = contractRepository.save(ctr3);

        Installment inst3_1 = Installment.builder()
                .contract(ctr3)
                .installmentNumber(1)
                .totalInstallments(21)
                .installmentType(InstallmentType.DOWN_PAYMENT)
                .dueDate(today)
                .businessDueDate(today)
                .baseAmount(new BigDecimal("50000.00"))
                .paidAmount(new BigDecimal("50000.00"))
                .balanceAmount(BigDecimal.ZERO)
                .status(InstallmentStatus.PAID)
                .notes("Entrada quitada via TED Bancária.")
                .build();
        inst3_1 = installmentRepository.save(inst3_1);

        Payment pay3_1 = Payment.builder()
                .installment(inst3_1)
                .paymentDate(today)
                .amountReceived(new BigDecimal("50000.00"))
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .transactionReference("TED-METROPOLE-01")
                .registeredByUser(admin)
                .notes("Transferência TED bancária corporativa liquidada.")
                .build();
        paymentRepository.save(pay3_1);

        List<Installment> instListCtr3 = new ArrayList<>();
        for (int i = 2; i <= 21; i++) {
            LocalDate d = today.plusMonths(i - 1).withDayOfMonth(20);
            instListCtr3.add(Installment.builder()
                    .contract(ctr3)
                    .installmentNumber(i)
                    .totalInstallments(21)
                    .installmentType(InstallmentType.MONTHLY)
                    .dueDate(d)
                    .businessDueDate(d)
                    .baseAmount(new BigDecimal("10000.00"))
                    .paidAmount(BigDecimal.ZERO)
                    .balanceAmount(new BigDecimal("10000.00"))
                    .status(InstallmentStatus.PENDING)
                    .build());
        }
        installmentRepository.saveAll(instListCtr3);
    }
}
