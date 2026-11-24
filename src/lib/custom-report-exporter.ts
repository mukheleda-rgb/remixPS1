import { savePdf, sharePdf } from "./native-save";
import { fmt, M3_TO_BARREL } from "./calculations";
import { CustomReportComputedData } from "./custom-report-types";

// ==========================================
// 1. CSV EXPORT
// ==========================================
export function exportCustomReportCsv(data: CustomReportComputedData): void {
  const { filter, materialSpec } = data;
  const lines: string[] = [];

  const sanitize = (val: any) => {
    if (val == null) return "";
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Header metadata
  lines.push("================================================================================");
  lines.push(`تقرير إدارة مستودعات النفط - محطة الضخ PS1 - ${data.filter.reportTitle}`);
  lines.push("================================================================================");
  lines.push(`رقم المرجع / Batch Ref,${sanitize(filter.referenceNo || "REF-PS1-AUTO")}`);
  lines.push(`تاريخ التوليد / Generation Date,${sanitize(data.generatedAt)}`);
  lines.push(`الفترة الزمنية / Time Period,${sanitize(`${filter.startDate} إلى ${filter.endDate} (${filter.timePreset})`)}`);
  lines.push(`نوع المادة / Material,${sanitize(`${materialSpec.nameAr} (${materialSpec.nameEn})`)}`);
  lines.push(`الكثافة النوعية / API Gravity,${sanitize(materialSpec.apiGravity.toFixed(1))} ,الكثافة Density (kg/m³),${sanitize(materialSpec.density)}`);
  lines.push(`المستودع / Warehouse Scope,${sanitize(filter.warehouseScope)}`);
  lines.push(`المهندس المسؤول / Prepared By,${sanitize(filter.preparedBy || "PS1 Operations Engineer")}`);
  lines.push(`مشرف الوردية / Shift Supervisor,${sanitize(filter.shiftSupervisor || "Duty Supervisor")}`);
  lines.push("");

  // Executive Summary KPIs
  if (filter.includeKpis) {
    lines.push("--- 1. ملخص المؤشرات التشغيلية التنفيذية (EXECUTIVE KPI SUMMARY) ---");
    lines.push("المؤشر / Metric,القيمة بالمتر المكعب (M³),القيمة بالبرميل (Barrels / bbl)");
    lines.push(`المخزون الحالي / Current Stock,${data.currentStockM3.toFixed(2)},${data.currentStockBbl.toFixed(2)}`);
    lines.push(`المخزون الابتدائي / Initial Stock,${data.initialStockM3.toFixed(2)},${(data.initialStockM3 * M3_TO_BARREL).toFixed(2)}`);
    lines.push(`إجمالي الاستلام / Total Received,${data.totalReceiveM3.toFixed(2)},${data.totalReceiveBbl.toFixed(2)}`);
    lines.push(`إجمالي الضخ / Total Pumped,${data.totalPumpM3.toFixed(2)},${data.totalPumpBbl.toFixed(2)}`);
    lines.push(`صافي التغير / Net Stock Change,${data.netStockChangeM3.toFixed(2)},${(data.netStockChangeM3 * M3_TO_BARREL).toFixed(2)}`);
    lines.push(`المتاح للضخ / Available for Pump,${data.availPumpM3.toFixed(2)},${data.availPumpBbl.toFixed(2)}`);
    lines.push(`السعة الحرة / Free Ullage Capacity,${data.freeVolumeM3.toFixed(2)},${(data.freeVolumeM3 * M3_TO_BARREL).toFixed(2)}`);
    lines.push(`السعة الإجمالية / Total Depot Capacity,${data.totalCapacityM3.toFixed(2)},${(data.totalCapacityM3 * M3_TO_BARREL).toFixed(2)}`);
    lines.push(`نسبة إشغال السعة / Capacity Fill %,${data.fillPercentage.toFixed(2)}%,-`);
    lines.push("");
  }

  // Tank Levels Breakdown
  if (filter.includeTankLevels && data.tankLevelsBreakdown.length > 0) {
    lines.push("--- 2. جرد ومناسيب الخزانات (TANK INVENTORY BREAKDOWN) ---");
    lines.push("الخزان / Tank,المنسوب / Level (cm),المخزون / Stock (M³),المخزون / Stock (BBL),السعة / Capacity (M³),نسبة الامتلاء / Fill %,الحالة / Status");
    for (const t of data.tankLevelsBreakdown) {
      lines.push(
        `${sanitize(t.tank)},${t.levelCm != null ? t.levelCm : "-"},${t.stockM3.toFixed(2)},${t.stockBbl.toFixed(2)},${t.capacityM3},${t.fillPct.toFixed(1)}%,${sanitize(t.status)}`
      );
    }
    lines.push("");
  }

  // Receive Flow Table
  if (filter.includeFlowTables && data.filteredReceiveRows.length > 0) {
    lines.push("--- 3. تدفقات خطوط الاستلام (RECEIVING PIPELINES INFLOW) (M³) ---");
    const recHeaders = ["الساعة / Hour", ...filter.selectedReceivePipes];
    lines.push(recHeaders.map(sanitize).join(","));
    for (const row of data.filteredReceiveRows) {
      const vals = [row.hour, ...filter.selectedReceivePipes.map((p) => (row.values[p] != null ? row.values[p] : 0))];
      lines.push(vals.join(","));
    }
    // Totals row
    const recTotals = [
      "المجموع الكلي / Total",
      ...filter.selectedReceivePipes.map((p) => (data.receiveBreakdown[p] ?? 0).toFixed(2)),
    ];
    lines.push(recTotals.join(","));
    lines.push("");
  }

  // Pump Flow Table
  if (filter.includeFlowTables && data.filteredPumpRows.length > 0) {
    lines.push("--- 4. تدفقات خطوط الضخ والتصدير (PUMPING PIPELINES OUTFLOW) (M³) ---");
    const pumpHeaders = ["الساعة / Hour", ...filter.selectedPumpPipes];
    lines.push(pumpHeaders.map(sanitize).join(","));
    for (const row of data.filteredPumpRows) {
      const vals = [row.hour, ...filter.selectedPumpPipes.map((p) => (row.values[p] != null ? row.values[p] : 0))];
      lines.push(vals.join(","));
    }
    // Totals row
    const pumpTotals = [
      "المجموع الكلي / Total",
      ...filter.selectedPumpPipes.map((p) => (data.pumpBreakdown[p] ?? 0).toFixed(2)),
    ];
    lines.push(pumpTotals.join(","));
    lines.push("");
  }

  // Branches
  if (filter.includeBranches && data.filteredBranches.length > 0) {
    lines.push("--- 5. موازنة المحطات والفروع المرتبطة (CONNECTED TERMINALS & BRANCHES) ---");
    lines.push("المحطة / Station,السعة الحرة / Free (M³),الضخ / Pump (M³),الاستلام / Receive (M³),المتاح للضخ / Avail (BBL),ملاحظات / Notes");
    for (const b of data.filteredBranches) {
      lines.push(
        `${sanitize(b.name)},${fmt(b.freeM3)},${fmt(b.pump)},${fmt(b.receive)},${fmt(b.availPumpBbl)},${sanitize(b.notes || "")}`
      );
    }
    lines.push("");
  }

  if (filter.notes) {
    lines.push("--- 6. الملاحظات التشغيلية والتوصيات (OPERATIONAL NOTES) ---");
    lines.push(sanitize(filter.notes));
    lines.push("");
  }

  // UTF-8 BOM so Excel opens Arabic correctly
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `PS1-Custom-Report-${data.filter.referenceNo || "export"}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==========================================
// 2. EXCEL (XLSX) EXPORT
// ==========================================
export async function exportCustomReportXlsx(data: CustomReportComputedData): Promise<void> {
  const { filter, materialSpec } = data;
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary & Executive Overview
  const summaryRows: any[] = [
    { "معيار التقرير (Parameter)": "عنوان التقرير / Report Title", "القيمة (Value)": filter.reportTitle },
    { "معيار التقرير (Parameter)": "رقم المرجع / Reference No.", "القيمة (Value)": filter.referenceNo },
    { "معيار التقرير (Parameter)": "تاريخ التوليد / Generated Date", "القيمة (Value)": data.generatedAt },
    { "معيار التقرير (Parameter)": "الفترة الزمنية / Time Period", "القيمة (Value)": `${filter.startDate} إلى ${filter.endDate}` },
    { "معيار التقرير (Parameter)": "الوردية / Shift", "القيمة (Value)": filter.shift },
    { "معيار التقرير (Parameter)": "نوع المادة / Material", "القيمة (Value)": `${materialSpec.nameAr} (${materialSpec.nameEn})` },
    { "معيار التقرير (Parameter)": "الكثافة النوعية / API Gravity", "القيمة (Value)": `${materialSpec.apiGravity.toFixed(1)} °API` },
    { "معيار التقرير (Parameter)": "كثافة المادة / Density", "القيمة (Value)": `${materialSpec.density} kg/m³` },
    { "معيار التقرير (Parameter)": "نطاق المستودع / Warehouse Scope", "القيمة (Value)": filter.warehouseScope },
    { "معيار التقرير (Parameter)": "المهندس المسؤول / Prepared By", "القيمة (Value)": filter.preparedBy || "PS1 Operations" },
    { "معيار التقرير (Parameter)": "مشرف الوردية / Supervisor", "القيمة (Value)": filter.shiftSupervisor || "Duty Supervisor" },
    {},
    { "معيار التقرير (Parameter)": "--- المؤشرات الحجمية ---", "القيمة (Value)": "--- M³ ---", "القيمة بالبرميل (Barrels)": "--- BBL ---" },
    { "معيار التقرير (Parameter)": "المخزون الحالي الكلي / Current Total Stock", "القيمة (Value)": data.currentStockM3, "القيمة بالبرميل (Barrels)": data.currentStockBbl },
    { "معيار التقرير (Parameter)": "المخزون الابتدائي / Initial Stock", "القيمة (Value)": data.initialStockM3, "القيمة بالبرميل (Barrels)": data.initialStockM3 * M3_TO_BARREL },
    { "معيار التقرير (Parameter)": "إجمالي المستلم / Total Received", "القيمة (Value)": data.totalReceiveM3, "القيمة بالبرميل (Barrels)": data.totalReceiveBbl },
    { "معيار التقرير (Parameter)": "إجمالي المضخوخ / Total Pumped", "القيمة (Value)": data.totalPumpM3, "القيمة بالبرميل (Barrels)": data.totalPumpBbl },
    { "معيار التقرير (Parameter)": "صافي التغير / Net Variation", "القيمة (Value)": data.netStockChangeM3, "القيمة بالبرميل (Barrels)": data.netStockChangeM3 * M3_TO_BARREL },
    { "معيار التقرير (Parameter)": "المتاح للضخ / Available For Pump", "القيمة (Value)": data.availPumpM3, "القيمة بالبرميل (Barrels)": data.availPumpBbl },
    { "معيار التقرير (Parameter)": "السعة الحرة / Free Ullage", "القيمة (Value)": data.freeVolumeM3, "القيمة بالبرميل (Barrels)": data.freeVolumeM3 * M3_TO_BARREL },
    { "معيار التقرير (Parameter)": "السعة الكلية للمستودع / Total Capacity", "القيمة (Value)": data.totalCapacityM3, "القيمة بالبرميل (Barrels)": data.totalCapacityM3 * M3_TO_BARREL },
    { "معيار التقرير (Parameter)": "نسبة إشغال المستودع / Fill %", "القيمة (Value)": `${data.fillPercentage.toFixed(1)}%` },
  ];
  if (filter.notes) {
    summaryRows.push({});
    summaryRows.push({ "معيار التقرير (Parameter)": "الملاحظات / Notes", "القيمة (Value)": filter.notes });
  }
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "الملخص_Summary");

  // Sheet 2: Tank Inventory
  if (data.tankLevelsBreakdown.length > 0) {
    const tankRows = data.tankLevelsBreakdown.map((t) => ({
      "الخزان (Tank)": t.tank,
      "المنسوب (Level cm)": t.levelCm ?? "",
      "المخزون (Stock M³)": t.stockM3,
      "المخزون (Stock BBL)": t.stockBbl,
      "السعة الكلية (Capacity M³)": t.capacityM3,
      "نسبة الامتلاء (Fill %)": `${t.fillPct.toFixed(1)}%`,
      "الحالة (Status)": t.status,
    }));
    const wsTanks = XLSX.utils.json_to_sheet(tankRows);
    XLSX.utils.book_append_sheet(wb, wsTanks, "جرد_الخزانات_Tanks");
  }

  // Sheet 3: Receiving Lines
  if (data.filteredReceiveRows.length > 0) {
    const recRows = data.filteredReceiveRows.map((r) => {
      const row: Record<string, any> = { "الساعة (Hour)": r.hour };
      filter.selectedReceivePipes.forEach((p) => {
        row[p] = r.values[p] ?? 0;
      });
      return row;
    });
    const wsRec = XLSX.utils.json_to_sheet(recRows);
    XLSX.utils.book_append_sheet(wb, wsRec, "خطوط_الاستلام_Receive");
  }

  // Sheet 4: Pumping Lines
  if (data.filteredPumpRows.length > 0) {
    const pumpRows = data.filteredPumpRows.map((r) => {
      const row: Record<string, any> = { "الساعة (Hour)": r.hour };
      filter.selectedPumpPipes.forEach((p) => {
        row[p] = r.values[p] ?? 0;
      });
      return row;
    });
    const wsPump = XLSX.utils.json_to_sheet(pumpRows);
    XLSX.utils.book_append_sheet(wb, wsPump, "خطوط_الضخ_Pump");
  }

  // Sheet 5: Branches
  if (data.filteredBranches.length > 0) {
    const branchRows = data.filteredBranches.map((b) => ({
      "المحطة (Station)": b.name,
      "السعة الحرة (Free M³)": b.freeM3 ?? "",
      "معدل الضخ (Pump M³)": b.pump ?? "",
      "معدل الاستلام (Receive M³)": b.receive ?? "",
      "المتاح للضخ (Avail BBL)": b.availPumpBbl ?? "",
      "الملاحظات (Notes)": b.notes || "",
    }));
    const wsBranch = XLSX.utils.json_to_sheet(branchRows);
    XLSX.utils.book_append_sheet(wb, wsBranch, "المحطات_الفروع_Branches");
  }

  const filename = `PS1-Custom-Report-${filter.referenceNo || "report"}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ==========================================
// 3. PDF EXPORT
// ==========================================
export async function generateCustomReportPdf(
  data: CustomReportComputedData,
  mode: "download" | "share" = "download"
): Promise<void> {
  const { filter, materialSpec } = data;
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as { default: typeof import("jspdf-autotable").default }).default;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 14;

  // Header Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(10, currentY, pageWidth - 20, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PS-1 CRUDE OIL DEPOT & PUMPING STATION", pageWidth / 2, currentY + 7, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(filter.reportTitle.toUpperCase() || "CUSTOM OPERATIONAL REPORT", pageWidth / 2, currentY + 13, {
    align: "center",
  });

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    `Ref: ${filter.referenceNo || "PS1-CUSTOM"}  |  Generated: ${data.generatedAt}  |  Period: ${filter.startDate} to ${filter.endDate}`,
    pageWidth / 2,
    currentY + 19,
    { align: "center" }
  );

  currentY += 28;

  // Metadata / Criteria Table
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("REPORT CRITERIA & MATERIAL SPECIFICATIONS", 10, currentY);
  currentY += 2;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: "grid",
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    body: [
      [
        { content: "Product / Material:", fontStyle: "bold" },
        `${materialSpec.nameEn} (${materialSpec.nameAr})`,
        { content: "API Gravity / Density:", fontStyle: "bold" },
        `${materialSpec.apiGravity.toFixed(1)} °API | ${materialSpec.density} kg/m³ | Sulfur: ${materialSpec.sulfurPct}%`,
      ],
      [
        { content: "Warehouse Scope:", fontStyle: "bold" },
        filter.warehouseScope,
        { content: "Active Shift / Interval:", fontStyle: "bold" },
        `Shift: ${filter.shift.toUpperCase()} | Intervals: ${filter.selectedHours.length} pts`,
      ],
      [
        { content: "Prepared By / Engineer:", fontStyle: "bold" },
        filter.preparedBy || "PS1 Depot Ops Engineer",
        { content: "Shift Supervisor:", fontStyle: "bold" },
        filter.shiftSupervisor || "PS1 Shift Supervisor",
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Executive KPI Grid
  if (filter.includeKpis) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("EXECUTIVE STOCK & FLOW METRICS", 10, currentY);
    currentY += 2;

    autoTable(doc, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      theme: "plain",
      head: [["Total Stock (M³)", "Total Received (M³)", "Total Pumped (M³)", "Net Change (M³)", "Avail Pump (M³)", "Capacity Fill %"]],
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 8, halign: "center" },
      body: [
        [
          fmt(data.currentStockM3),
          fmt(data.totalReceiveM3),
          fmt(data.totalPumpM3),
          `${data.netStockChangeM3 >= 0 ? "+" : ""}${fmt(data.netStockChangeM3)}`,
          fmt(data.availPumpM3),
          `${data.fillPercentage.toFixed(1)}%`,
        ],
        [
          `${fmt(data.currentStockBbl)} bbl`,
          `${fmt(data.totalReceiveBbl)} bbl`,
          `${fmt(data.totalPumpBbl)} bbl`,
          `${fmt(data.netStockChangeM3 * M3_TO_BARREL)} bbl`,
          `${fmt(data.availPumpBbl)} bbl`,
          `Cap: ${fmt(data.totalCapacityM3)} M³`,
        ],
      ],
      bodyStyles: { fontSize: 8, halign: "center", fontStyle: "bold" },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Tank Levels Breakdown Table
  if (filter.includeTankLevels && data.tankLevelsBreakdown.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("TANK INVENTORY & ULLAGE STATUS", 10, currentY);
    currentY += 2;

    const tankBody = data.tankLevelsBreakdown.map((t) => [
      t.tank,
      t.levelCm != null ? `${t.levelCm} cm` : "—",
      fmt(t.stockM3),
      fmt(t.stockBbl),
      fmt(t.capacityM3),
      `${t.fillPct.toFixed(1)}%`,
      t.status.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      theme: "striped",
      head: [["Tank", "Level (cm)", "Stock (M³)", "Stock (BBL)", "Capacity (M³)", "Fill %", "Status"]],
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.5, fontStyle: "bold" },
      bodyStyles: { fontSize: 7, textColor: [15, 23, 42] },
      body: tankBody,
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Pipeline Flow Table (Receive & Pump)
  if (filter.includeFlowTables) {
    if (currentY > pageHeight - 65) {
      doc.addPage();
      currentY = 15;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("PIPELINE FLOW THROUGHPUT (M³)", 10, currentY);
    currentY += 2;

    const recPipes = filter.selectedReceivePipes;
    const pumpPipes = filter.selectedPumpPipes;

    const flowHead = ["Hour", ...recPipes.slice(0, 4).map((p) => `IN: ${p}`), ...pumpPipes.slice(0, 3).map((p) => `OUT: ${p}`)];
    const flowBody = data.filteredReceiveRows.map((r, idx) => {
      const pRow = data.filteredPumpRows[idx];
      return [
        r.hour,
        ...recPipes.slice(0, 4).map((p) => fmt(r.values[p] ?? 0)),
        ...pumpPipes.slice(0, 3).map((p) => fmt(pRow?.values[p] ?? 0)),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      theme: "grid",
      head: [flowHead],
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 6.5 },
      body: flowBody,
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Notes & Signatures
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 15;
  }

  if (filter.notes) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("OPERATIONAL NOTES & OBSERVATIONS:", 10, currentY);
    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(filter.notes, 10, currentY, { maxWidth: pageWidth - 20 });
    currentY += 12;
  }

  if (filter.includeSignatures) {
    doc.setDrawColor(203, 213, 225);
    doc.line(10, currentY, pageWidth - 10, currentY);
    currentY += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);

    doc.text("Operations Engineer", 25, currentY);
    doc.text("Shift Supervisor", pageWidth / 2, currentY, { align: "center" });
    doc.text("Depot Manager Approval", pageWidth - 25, currentY, { align: "right" });

    currentY += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);

    doc.text(`Name: ${filter.preparedBy || "........................"}`, 25, currentY);
    doc.text(`Name: ${filter.shiftSupervisor || "........................"}`, pageWidth / 2, currentY, { align: "center" });
    doc.text("Signature: ........................", pageWidth - 25, currentY, { align: "right" });
  }

  // Save / Share
  const fileStamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const fileName = `PS1-Custom-Report-${filter.referenceNo || "report"}-${fileStamp}.pdf`;

  if (mode === "share") {
    await sharePdf(doc, fileName);
  } else {
    await savePdf(doc, fileName);
  }
}
