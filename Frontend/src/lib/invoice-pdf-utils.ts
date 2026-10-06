/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from "jspdf";
import { applyPlugin, autoTable } from "jspdf-autotable";
import { InvoiceData, convertCurrency, CURRENCIES } from "../invoice-types";

applyPlugin(jsPDF);

// Extend jsPDF with autotable types
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateInvoicePDF = async (data: InvoiceData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const template = data.templateStyle || "classic";
  const isModern = template === "modern";
  const navy = [10, 22, 40];
  const blue = [79, 142, 247];
  const teal = [0, 212, 170];
  const muted = [107, 119, 140];
  const border = [225, 231, 239];
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2;

  const formatMoney = (value: number) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const addFooter = (doc: jsPDF, pageNumber: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const footerText = "Coded Clouds | codedclouds.org | info@codedclouds.org | PK: +92 3199737649 | KSA: +966 557385262";
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.text(`Page ${pageNumber}`, pageWidth - 12, pageHeight - 10, { align: "right" });
  };

  const addSectionTitle = (title: string, x: number, y: number) => {
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, x, y);
  };

  const drawInfoCard = (x: number, y: number, w: number, h: number) => {
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, w, h, 1.3, 1.3, "FD");
  };

  const infoCardY = 46;
  const infoCardH = 25;
  const infoCardGap = 6;
  const infoCardWidth = (contentWidth - infoCardGap) / 2;
  const detailLineGap = 5.5;
  const tableStartY = 79;

  const grandTotal = data.services.reduce((acc, s) => acc + s.amount, 0);
  const totalConv = convertCurrency(grandTotal, data.currency);

  const tableRows = data.services.map((s) => {
    const conv = convertCurrency(s.amount, data.currency);
    const convStr = [
      data.currency !== "USD" ? `($${conv.USD.toFixed(2)})` : "",
      data.currency !== "EUR" ? `(€${conv.EUR.toFixed(2)})` : "",
      data.currency !== "PKR" ? `(Rs${conv.PKR.toFixed(2)})` : "",
      data.currency !== "SAR" ? `(SAR${conv.SAR.toFixed(2)})` : "",
    ].filter(Boolean).join(" ");

    return [
      s.description || "—",
      `${CURRENCIES[data.currency].symbol} ${formatMoney(s.amount)}${convStr ? `\n${convStr}` : ""}`,
    ];
  });

  // --- PAGE 1 ---
  if (isModern) {
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(0, 0, pageWidth, 42, "F");
    doc.setFillColor(teal[0], teal[1], teal[2]);
    doc.roundedRect(pageWidth - 68, 10, 58, 18, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MODERN PDF", pageWidth - 58, 20);
  } else {
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(0, 0, pageWidth, 38, "F");
    doc.setDrawColor(blue[0], blue[1], blue[2]);
    doc.setLineWidth(1);
    doc.line(0, 38, pageWidth, 38);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isModern ? 22 : 24);
  doc.text("CODED CLOUDS", marginX, isModern ? 16 : 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(isModern ? 9 : 10);
  doc.text("Your Cloud, Our Code", marginX, isModern ? 24 : 28);

  if (!isModern) {
    doc.setFillColor(teal[0], teal[1], teal[2]);
    doc.rect(pageWidth - 60, 11, 45, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("INVOICE", pageWidth - 38, 19, { align: "center" });
  }

  drawInfoCard(marginX + infoCardWidth + infoCardGap, infoCardY, infoCardWidth, infoCardH);
  drawInfoCard(marginX, infoCardY, infoCardWidth, infoCardH);

  const sectionTitleY = infoCardY + 5.5;
  const infoTextY = infoCardY + 12.2;

  addSectionTitle("Invoice Details", marginX + infoCardWidth + infoCardGap + 4, sectionTitleY);
  addSectionTitle("Client Information", marginX + 4, sectionTitleY);

  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  const invoiceTextX = marginX + infoCardWidth + infoCardGap + 4;
  const clientTextX = marginX + 4;

  doc.text(`Invoice Number: ${data.invoiceNumber}`, invoiceTextX, infoTextY);
  doc.text(`Date: ${data.date}`, invoiceTextX, infoTextY + detailLineGap);
  doc.text(`Base Currency: ${data.currency}`, invoiceTextX, infoTextY + detailLineGap * 2);

  doc.text(`Name: ${data.clientName || "—"}`, clientTextX, infoTextY);
  doc.text(`Contact: ${data.clientContact || "—"}`, clientTextX, infoTextY + detailLineGap);
  doc.text(`Bill No: ${data.billNumber || "—"}`, clientTextX, infoTextY + detailLineGap * 2);

  // Services table
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    tableWidth: contentWidth,
    head: [["Description", "Amount"]],
    body: tableRows,
    theme: "striped",
    styles: {
      fontSize: 9,
      textColor: [navy[0], navy[1], navy[2]] as [number, number, number],
      cellPadding: 3.2,
      lineColor: [border[0], border[1], border[2]] as [number, number, number],
      lineWidth: 0.3,
      overflow: "linebreak" as const,
    },
    headStyles: {
      fillColor: [navy[0], navy[1], navy[2]] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 9,
      halign: "left" as const,
    },
    columnStyles: {
      0: { cellWidth: contentWidth - 42, fontStyle: "normal" },
      1: { cellWidth: 42, halign: "right", fontStyle: "bold", minCellWidth: 42 },
    },
    didParseCell: (cellData) => {
      if (cellData.section === "body" && cellData.column.index === 0) {
        cellData.cell.styles.valign = "middle";
      }
      if (cellData.section === "body" && cellData.column.index === 1) {
        cellData.cell.styles.fontSize = 8.5;
        cellData.cell.styles.valign = "middle";
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 5;

  const totalsBoxY = finalY;
  const totalsBoxH = 16;
  const totalsX = pageWidth - marginX;
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(marginX, totalsBoxY, contentWidth, totalsBoxH, 1.3, 1.3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text("TOTAL PAYABLE", marginX + 4, totalsBoxY + 6.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`${CURRENCIES[data.currency].symbol} ${formatMoney(grandTotal)}`, totalsX, totalsBoxY + 11.5, { align: "right" });

  let totalY = totalsBoxY + totalsBoxH + 2;
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  if (data.currency !== "USD") {
    doc.text(`USD: ${totalConv.USD.toFixed(2)}`, totalsX, totalY, { align: "right" });
    totalY += 4;
  }
  if (data.currency !== "EUR") {
    doc.text(`EUR: ${totalConv.EUR.toFixed(2)}`, totalsX, totalY, { align: "right" });
    totalY += 4;
  }
  if (data.currency !== "PKR") {
    doc.text(`PKR: ${totalConv.PKR.toFixed(2)}`, totalsX, totalY, { align: "right" });
    totalY += 4;
  }
  if (data.currency !== "SAR") {
    doc.text(`SAR: ${totalConv.SAR.toFixed(2)}`, totalsX, totalY, { align: "right" });
  }

  const notesBoxH = 18;
  const notesY = Math.max(totalY + 7, 146);
  if (data.notes) {
    doc.setFillColor(250, 251, 255);
    doc.roundedRect(marginX, notesY, contentWidth, notesBoxH, 1.3, 1.3, "F");
    addSectionTitle("Payment Terms", marginX + 4, notesY + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    const splitNotes = doc.splitTextToSize(data.notes, contentWidth - 10);
    doc.text(splitNotes, marginX + 4, notesY + 11.5);
  }

  const paymentY = Math.max(notesY + notesBoxH + 7, 172);
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(marginX, paymentY, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PAYMENT DETAILS", marginX + 4, paymentY + 5);

  const bankY = paymentY + 12;
  const bankBoxH = 26;
  const leftWidth = (contentWidth - 6) / 2;
  drawInfoCard(marginX, bankY, leftWidth, bankBoxH);
  drawInfoCard(marginX + leftWidth + 6, bankY, leftWidth, bankBoxH);

  const bankTextX1 = marginX + 4;
  const bankTextX2 = marginX + leftWidth + 10;
  const bankTextTop = bankY + 5;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Bank Transfer – UBL Bank", bankTextX1, bankTextTop);
  doc.text("Bank Transfer – STC Bank", bankTextX2, bankTextTop);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(`Account Title: Tasneem Ahsan`, bankTextX1, bankTextTop + 5);
  doc.text(`Account Number: 0208301848233`, bankTextX1, bankTextTop + 9);
  doc.text(`IBAN: PK36UNIL0109000301848233`, bankTextX1, bankTextTop + 13);
  doc.text(`Account Title: Muhammad Ali`, bankTextX2, bankTextTop + 5);
  doc.text(`IBAN: SA1378000000001252725888`, bankTextX2, bankTextTop + 9);
  doc.text(`Currency: USD / Riyal / Euro`, bankTextX2, bankTextTop + 13);

  addFooter(doc, 1);

  // --- PAGE 2 ---
  doc.addPage();
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TERMS & CONDITIONS", marginX, 12);

  let tcY = 28;
  const sections = [
    { title: "1. Service Scope & Nature", body: "Coded Clouds provides digital, technical, development, and marketing services as outlined in this invoice. Services may be one-time or recurring, depending on the agreed scope." },
    { title: "2. Payment Terms", body: "All fees must be paid in advance. Monthly recurring services must be cleared before the 5th of each billing month. Failure to make timely payments may result in service suspension." },
    { title: "3. Advertising Budget", body: "Paid advertising budgets are separate from service fees and are not included unless explicitly stated." },
    { title: "4. Client Payment Options", body: "The client may choose one of the following: client-paid ads or Coded Clouds-managed ads." },
    { title: "5. Currency Disclaimer", body: "When ads are paid through Coded Clouds, USD and EUR conversions are indicative only. Final payable amounts may vary due to foreign exchange rate fluctuations." },
    { title: "6. Taxes & Regulatory Charges", body: "Applicable Tax (10%) and ITF (6%) apply only when Coded Clouds collects or processes funds on behalf of the client." },
    { title: "7. Non-Refundable Ad Spend", body: "Advertising budgets are non-refundable once campaigns are launched or funds are allocated, regardless of performance, reach, or conversions." },
    { title: "8. Performance Disclaimer", body: "Coded Clouds does not guarantee specific results, leads, sales, reach, or engagement. Outcomes depend on platform algorithms, market conditions, audience behavior, and third-party policies." },
    { title: "9. Client Responsibilities", body: "The client is responsible for providing accurate information, brand assets, approvals, content inputs, and timely feedback required to execute services effectively." },
    { title: "10. Access & Permissions", body: "The client must grant required administrative, advertiser, or system access. Delays or limitations in access may impact timelines and performance and are not the responsibility of Coded Clouds." },
    { title: "11. Content Approval & Execution", body: "Where content approval is required, delays in client feedback may result in adjusted schedules. If no response is received within a reasonable time, Coded Clouds may proceed based on the approved strategy." },
    { title: "12. Strategy & Optimization Rights", body: "Coded Clouds reserves the right to adjust strategies, formats, schedules, or campaign structures to improve performance while remaining within the agreed scope." },
    { title: "13. Scope Limitations", body: "Any services, platforms, campaigns, or deliverables outside the agreed scope require separate discussion, approval, and additional charges." },
    { title: "14. Platform Policies & Third Parties", body: "Coded Clouds is not responsible for policy changes, technical issues, downtime, restrictions, or suspensions imposed by third-party platforms." },
    { title: "15. Intellectual Property Rights", body: "All creatives, designs, code, content, and materials produced by Coded Clouds remain the property of the agency until full payment is received. Upon payment, usage rights are granted to the client." },
    { title: "16. Portfolio & Marketing Usage", body: "Coded Clouds reserves the right to showcase completed work in its portfolio, website, or marketing materials unless the client requests otherwise in writing." },
    { title: "17. Confidentiality", body: "Both parties agree to maintain confidentiality of all sensitive business information, credentials, strategies, and data shared during the engagement." },
    { title: "18. Limitation of Liability", body: "Coded Clouds shall not be liable for any indirect, incidental, special, or consequential damages, including loss of revenue, profit, data, or business opportunities." },
    { title: "19. Indemnification", body: "The client agrees to indemnify and hold harmless Coded Clouds from any claims, penalties, damages, or legal costs arising from client-provided content, instructions, or business activities." },
    { title: "20. Service Suspension & Termination", body: "Coded Clouds reserves the right to suspend or terminate services due to non-payment, breach of terms, or misuse of services. Outstanding dues must be settled prior to termination." },
  ];

  let currentPage = 2;
  sections.forEach((section) => {
    const lines = doc.splitTextToSize(section.body, contentWidth - 4);
    const sectionHeight = 6 + lines.length * 3.8;

    if (tcY + sectionHeight > pageHeight - 18) {
      addFooter(doc, currentPage);
      doc.addPage();
      currentPage += 1;
      tcY = 22;
      doc.setFillColor(navy[0], navy[1], navy[2]);
      doc.rect(0, 0, pageWidth, 18, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TERMS & CONDITIONS (CONTINUED)", marginX, 12);
    }

    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(section.title, marginX, tcY);

    doc.setTextColor(70, 70, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(lines, marginX + 2, tcY + 4);

    tcY += sectionHeight;
  });

  addFooter(doc, currentPage);
  doc.save(`Invoice_${data.invoiceNumber}.pdf`);
};
