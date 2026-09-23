package com.jccondomio.service;

import com.jccondomio.domain.entity.Contract;
import com.jccondomio.domain.entity.Installment;
import com.jccondomio.repository.InstallmentRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ContractService contractService;
    private final InstallmentFinancialSituationService installmentFinancialSituationService;
    private final InstallmentRepository installmentRepository;

    private static final Locale PT_BR = new Locale("pt", "BR");
    private static final NumberFormat CURRENCY_FMT = NumberFormat.getCurrencyInstance(PT_BR);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional(readOnly = true)
    public String getContractNumber(Long contractId, Long companyId) {
        return contractService.findEntity(contractId, companyId).getContractNumber();
    }

    /** Gera um XLSX real com resumo, parcelas, pagamentos, contratante e obra. */
    @Transactional(readOnly = true)
    public byte[] generateContractExcel(Long contractId, Long companyId) {
        Contract contract = contractService.findEntity(contractId, companyId);
        List<Installment> installments = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setWrapText(true);
            DataFormat dataFormat = workbook.createDataFormat();
            CellStyle currencyStyle = workbook.createCellStyle();
            currencyStyle.setDataFormat(dataFormat.getFormat("R$ #,##0.00"));
            CellStyle dateStyle = workbook.createCellStyle();
            dateStyle.setDataFormat(dataFormat.getFormat("dd/mm/yyyy"));

            Sheet summary = workbook.createSheet("Resumo do contrato");
            String[][] summaryRows = {
                    {"Souza Construção", ""}, {"Número do contrato", contract.getContractNumber()},
                    {"Contratante", contract.getCustomer() != null ? contract.getCustomer().getName() : "Não informado"},
                    {"Condomínio ou obra", contract.getCondominium() != null ? contract.getCondominium().getName() : "Não informado"},
                    {"Serviço", contract.getServiceDescription() != null ? contract.getServiceDescription() : (contract.getServiceType() != null ? contract.getServiceType().name() : "Não informado")},
                    {"Status", contract.getStatus().name()}, {"Valor total", contract.getTotalAmount().toString()},
                    {"Valor pago", installments.stream().map(Installment::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add).toString()},
                    {"Saldo devedor", installments.stream().map(Installment::getBalanceAmount).reduce(BigDecimal.ZERO, BigDecimal::add).toString()},
                    {"Data de emissão", contract.getContractDate().format(DATE_FMT)},
                    {"Data de término", contract.getTerminationDate() == null ? "Não informado" : contract.getTerminationDate().format(DATE_FMT)}
            };
            for (int i = 0; i < summaryRows.length; i++) { Row row = summary.createRow(i); row.createCell(0).setCellValue(summaryRows[i][0]); row.createCell(1).setCellValue(summaryRows[i][1]); if (i == 0) row.getCell(0).setCellStyle(headerStyle); }
            summary.autoSizeColumn(0); summary.autoSizeColumn(1);

            String[] installmentColumns = {"Parcela", "Número do contrato", "Contratante", "Vencimento", "Valor", "Data do pagamento", "Forma de pagamento", "Status", "Dias em atraso", "Observação"};
            Sheet installmentSheet = workbook.createSheet("Parcelas");
            Row installmentHeader = installmentSheet.createRow(0);
            for (int i = 0; i < installmentColumns.length; i++) { installmentHeader.createCell(i).setCellValue(installmentColumns[i]); installmentHeader.getCell(i).setCellStyle(headerStyle); }
            for (int r = 0; r < installments.size(); r++) {
                Installment inst = installments.get(r); Row row = installmentSheet.createRow(r + 1);
                row.createCell(0).setCellValue(inst.getInstallmentNumber() + "/" + inst.getTotalInstallments()); row.createCell(1).setCellValue(contract.getContractNumber()); row.createCell(2).setCellValue(contract.getCustomer() != null ? contract.getCustomer().getName() : "Não informado");
                row.createCell(3).setCellValue(inst.getDueDate().format(DATE_FMT)); row.createCell(4).setCellValue(inst.getTotalPayable().doubleValue()); row.getCell(4).setCellStyle(currencyStyle);
                String paymentDate = inst.getPayments().isEmpty() ? "Não informado" : inst.getPayments().get(inst.getPayments().size() - 1).getPaymentDate().format(DATE_FMT); row.createCell(5).setCellValue(paymentDate);
                row.createCell(6).setCellValue(inst.getPayments().isEmpty() ? "Não informado" : inst.getPayments().get(inst.getPayments().size() - 1).getPaymentMethod().name()); row.createCell(7).setCellValue(installmentFinancialSituationService.calculate(inst, java.time.LocalDate.now()).getLabel());
                long delay = inst.getDueDate().isBefore(java.time.LocalDate.now()) && inst.getBalanceAmount().compareTo(BigDecimal.ZERO) > 0 ? java.time.temporal.ChronoUnit.DAYS.between(inst.getDueDate(), java.time.LocalDate.now()) : 0; row.createCell(8).setCellValue(delay); row.createCell(9).setCellValue(inst.getNotes() == null ? "" : inst.getNotes().replace("=", "'").replace("+", "'").replace("-", "'").replace("@", "'"));
            }
            installmentSheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, installments.size(), 0, installmentColumns.length - 1)); installmentSheet.createFreezePane(0, 1); for (int i = 0; i < installmentColumns.length; i++) installmentSheet.autoSizeColumn(i);

            Sheet paymentsSheet = workbook.createSheet("Pagamentos"); String[] paymentColumns = {"Data", "Número do contrato", "Parcela", "Valor pago", "Forma de pagamento", "Comprovante", "Responsável pelo registro"}; Row paymentHeader = paymentsSheet.createRow(0); for (int i = 0; i < paymentColumns.length; i++) { paymentHeader.createCell(i).setCellValue(paymentColumns[i]); paymentHeader.getCell(i).setCellStyle(headerStyle); }
            int paymentRow = 1; for (Installment inst : installments) for (var payment : inst.getPayments()) { Row row = paymentsSheet.createRow(paymentRow++); row.createCell(0).setCellValue(payment.getPaymentDate().format(DATE_FMT)); row.createCell(1).setCellValue(contract.getContractNumber()); row.createCell(2).setCellValue(inst.getInstallmentNumber() + "/" + inst.getTotalInstallments()); row.createCell(3).setCellValue(payment.getAmountReceived().doubleValue()); row.getCell(3).setCellStyle(currencyStyle); row.createCell(4).setCellValue(payment.getPaymentMethod().name()); row.createCell(5).setCellValue(payment.getTransactionReference() == null ? "Não informado" : payment.getTransactionReference()); row.createCell(6).setCellValue(payment.getRegisteredByUser() == null ? "Não informado" : payment.getRegisteredByUser().getName()); }
            paymentsSheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, Math.max(1, paymentRow - 1), 0, paymentColumns.length - 1)); paymentsSheet.createFreezePane(0, 1); for (int i = 0; i < paymentColumns.length; i++) paymentsSheet.autoSizeColumn(i);

            Sheet customerSheet = workbook.createSheet("Dados do contratante"); String[][] customerRows = { {"Nome / Razão social", contract.getCustomer() == null ? "Não informado" : contract.getCustomer().getName()}, {"CPF / CNPJ", contract.getCustomer() == null ? "Não informado" : contract.getCustomer().getDocument()}, {"Telefone", contract.getCustomer() == null ? "Não informado" : contract.getCustomer().getPhone()}, {"E-mail", contract.getCustomer() == null ? "Não informado" : contract.getCustomer().getEmail()} }; for (int i = 0; i < customerRows.length; i++) { Row row = customerSheet.createRow(i); row.createCell(0).setCellValue(customerRows[i][0]); row.createCell(1).setCellValue(customerRows[i][1]); } customerSheet.autoSizeColumn(0); customerSheet.autoSizeColumn(1);
            Sheet workSheet = workbook.createSheet("Dados da obra"); String[][] workRows = { {"Nome", contract.getCondominium() == null ? "Não informado" : contract.getCondominium().getName()}, {"Endereço", contract.getCondominium() == null ? "Não informado" : contract.getCondominium().getStreet()}, {"Cidade / Estado", contract.getCondominium() == null ? "Não informado" : contract.getCondominium().getCity() + " / " + contract.getCondominium().getState()}, {"Serviço", contract.getServiceType() == null ? "Não informado" : contract.getServiceType().name()} }; for (int i = 0; i < workRows.length; i++) { Row row = workSheet.createRow(i); row.createCell(0).setCellValue(workRows[i][0]); row.createCell(1).setCellValue(workRows[i][1]); } workSheet.autoSizeColumn(0); workSheet.autoSizeColumn(1);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Erro ao gerar planilha Excel", e);
        }
    }

    /**
     * Gera relatório PDF elegante do extrato do contrato do cliente.
     */
    @Transactional(readOnly = true)
    public byte[] generateContractPdf(Long contractId, Long companyId) {
        Contract contract = contractService.findEntity(contractId, companyId);
        List<Installment> installments = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            // Fontes
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.DARK_GRAY);
            Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 11, Color.GRAY);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
            Font headerTableFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(23, 32, 51));

            // Cabeçalho
            java.net.URL logoUrl = getClass().getResource("/souza-construcao-mark.png");
            if (logoUrl != null) {
                Image logo = Image.getInstance(logoUrl);
                logo.scaleToFit(48, 48);
                logo.setAlignment(Element.ALIGN_CENTER);
                document.add(logo);
            }
            Paragraph title = new Paragraph(contract.getCompany().getTradeName(), titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph docType = new Paragraph("Extrato do contrato", subTitleFont);
            docType.setAlignment(Element.ALIGN_CENTER);
            docType.setSpacingAfter(15);
            document.add(docType);

            String companyContact = String.join(" • ",
                    contract.getCompany().getCnpj(),
                    contract.getCompany().getPhone() == null ? "" : contract.getCompany().getPhone(),
                    contract.getCompany().getEmail() == null ? "" : contract.getCompany().getEmail());
            if (!companyContact.replace(" • ", "").isBlank()) {
                Paragraph companyData = new Paragraph(companyContact, subTitleFont);
                companyData.setAlignment(Element.ALIGN_CENTER);
                companyData.setSpacingAfter(10);
                document.add(companyData);
            }

            // Informações do Contrato
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setSpacingAfter(15);

            String customerText = contract.getCustomer() != null
                    ? "Cliente: " + contract.getCustomer().getName() + " (" + contract.getCustomer().getDocument() + ")"
                    : "Condomínio: " + (contract.getCondominium() != null ? contract.getCondominium().getName() : "—");

            String condoText = contract.getCondominium() != null
                    ? "Empreendimento: " + contract.getCondominium().getName()
                    : (contract.getUnit() != null ? "Empreendimento: " + contract.getUnit().getBuildingBlock().getCondominium().getName() : "Empreendimento: —");

            String unitText = contract.getUnit() != null
                    ? "Unidade: " + contract.getUnit().getUnitNumber() + " - Bloco " + contract.getUnit().getBuildingBlock().getName()
                    : "Contrato / Obra: " + (contract.getDescription() != null ? contract.getDescription() : "Geral");

            infoTable.addCell(getInfoCell("Contrato: " + contract.getContractNumber(), boldFont));
            infoTable.addCell(getInfoCell("Data: " + contract.getContractDate().format(DATE_FMT), regularFont));
            infoTable.addCell(getInfoCell("Status: " + contract.getStatus().name(), boldFont));
            infoTable.addCell(getInfoCell("Término: " + (contract.getTerminationDate() == null ? "Não informado" : contract.getTerminationDate().format(DATE_FMT)), regularFont));
            infoTable.addCell(getInfoCell(customerText, boldFont));
            infoTable.addCell(getInfoCell(condoText, regularFont));
            infoTable.addCell(getInfoCell(unitText, regularFont));
            infoTable.addCell(getInfoCell("Valor Total Contrato: " + CURRENCY_FMT.format(contract.getTotalAmount()), boldFont));

            document.add(infoTable);

            // Tabela de Parcelas
            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.2f, 1.8f, 1.8f, 2.0f, 2.0f, 2.0f, 1.6f});

            String[] headers = {"Parc.", "Tipo", "Venc.", "Valor Base", "Pago", "Saldo", "Status"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerTableFont));
                cell.setBackgroundColor(new Color(243, 244, 246));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(5);
                table.addCell(cell);
            }

            BigDecimal totalBase = BigDecimal.ZERO;
            BigDecimal totalPaid = BigDecimal.ZERO;
            BigDecimal totalBalance = BigDecimal.ZERO;

            for (Installment i : installments) {
                table.addCell(getTableCell(i.getInstallmentNumber() + "/" + i.getTotalInstallments(), regularFont, Element.ALIGN_CENTER));
                table.addCell(getTableCell(i.getInstallmentType().name(), regularFont, Element.ALIGN_CENTER));
                table.addCell(getTableCell(i.getDueDate().format(DATE_FMT), regularFont, Element.ALIGN_CENTER));
                table.addCell(getTableCell(CURRENCY_FMT.format(i.getBaseAmount()), regularFont, Element.ALIGN_RIGHT));
                table.addCell(getTableCell(CURRENCY_FMT.format(i.getPaidAmount()), regularFont, Element.ALIGN_RIGHT));
                table.addCell(getTableCell(CURRENCY_FMT.format(i.getBalanceAmount()), regularFont, Element.ALIGN_RIGHT));
                table.addCell(getTableCell(installmentFinancialSituationService.calculate(i, java.time.LocalDate.now()).getLabel(), regularFont, Element.ALIGN_CENTER));

                totalBase = totalBase.add(i.getBaseAmount());
                totalPaid = totalPaid.add(i.getPaidAmount());
                totalBalance = totalBalance.add(i.getBalanceAmount());
            }

            // Linha de Totais
            PdfPCell totalLabelCell = new PdfPCell(new Phrase("TOTAIS", boldFont));
            totalLabelCell.setColspan(3);
            totalLabelCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalLabelCell.setPadding(5);
            table.addCell(totalLabelCell);

            table.addCell(getTableCell(CURRENCY_FMT.format(totalBase), boldFont, Element.ALIGN_RIGHT));
            table.addCell(getTableCell(CURRENCY_FMT.format(totalPaid), boldFont, Element.ALIGN_RIGHT));
            table.addCell(getTableCell(CURRENCY_FMT.format(totalBalance), boldFont, Element.ALIGN_RIGHT));
            table.addCell(getTableCell("", boldFont, Element.ALIGN_CENTER));

            document.add(table);

            // Rodapé com data de emissão
            Paragraph footer = new Paragraph("Relatório emitido em " + java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")) + " - JC Condomínio", subTitleFont);
            footer.setSpacingBefore(20);
            footer.setAlignment(Element.ALIGN_RIGHT);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (DocumentException | IOException e) {
            throw new RuntimeException("Erro ao gerar PDF", e);
        }
    }

    private PdfPCell getInfoCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(3);
        return cell;
    }

    private PdfPCell getTableCell(String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(alignment);
        cell.setPadding(4);
        return cell;
    }
}
