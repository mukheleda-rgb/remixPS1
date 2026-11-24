// Reusable PDF generator for a report snapshot. Produces the same layout the dashboard uses.
import i18n from "i18next";
import { savePdf, sharePdf } from "./native-save";
import {
  compute,
  fmt,
  TOTAL_CAPACITY_M3,
  VISIBLE_TANKS,
  RECEIVE_PIPES,
  PUMP_PIPES,
  computeFlow,
  flowGrandTotal,
  M3_TO_BARREL,
  type Reading,
  type FlowRow,
} from "./calculations";
import type { BranchRow } from "@/components/BranchesTable";
import type { ReportSnapshot } from "./reports";

interface PdfInput {
  readings: Reading[];
  customTanks: string[];
  tankBoosts: Record<string, number>;
  receiveRows: FlowRow[];
  pumpRows: FlowRow[];
  branches: BranchRow[];
  balancedPipe: string;
  pipeLabels?: Record<string, string>;
  /** Optional report title shown in the header */
  reportName?: string;
  /** Optional creation timestamp; defaults to now */
  createdAt?: number;
  /** Whether to trigger share dialog instead of download */
  mode?: "download" | "share";
}

export async function generateReportPdf(input: PdfInput): Promise<void> {
  const {
    readings,
    customTanks,
    tankBoosts,
    receiveRows,
    pumpRows,
    branches,
    balancedPipe,
    pipeLabels = {},
    reportName,
    createdAt,
    mode = "download",
  } = input;

  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = (autoTableMod as { default: typeof import("jspdf-autotable").default }).default;

  const bonusCapacity = Object.values(tankBoosts).reduce((a, b) => a + b, 0);
  const totalCapacity = TOTAL_CAPACITY_M3 + bonusCapacity;
  const rows = compute(readings, customTanks, bonusCapacity);
  const latest = [...rows].reverse().find((r) => r.totalStockM3 != null);
  const fillPct = latest?.totalStockM3 ? (latest.totalStockM3 / totalCapacity) * 100 : 0;

  // Auto-balance for receive
  const balancedValues = (() => {
    if (!balancedPipe) return null;
    const otherReceive = RECEIVE_PIPES.filter((p) => p !== balancedPipe);
    return receiveRows.map((row, idx) => {
      const pumpSum = PUMP_PIPES.reduce((a, p) => a + (pumpRows[idx]?.values[p] ?? 0), 0);
      const otherRecvSum = otherReceive.reduce((a, p) => a + (row.values[p] ?? 0), 0);
      const curComp = rows[idx + 1];
      
      // Calculate level change directly from levels: (Σ Δlevels × 43)
      const prevReading = readings[idx];
      const curReading = readings[idx + 1];
      let levelDiffSum = 0;
      if (prevReading && curReading) {
        const allKeys = [...VISIBLE_TANKS, ...customTanks];
        for (const k of allKeys) {
          const b = prevReading.levels[k];
          const a = curReading.levels[k];
          if (a != null && b != null) {
            levelDiffSum += a - b;
          }
        }
      }
      
      const wq = pumpSum + (levelDiffSum * 43) - otherRecvSum;
      const hasAny = curComp?.totalStockM3 != null && rows[idx]?.totalStockM3 != null;
      if (!hasAny && pumpSum === 0 && otherRecvSum === 0) return null;
      return Math.round(wq * 100) / 100;
    });
  })();

  const receiveComputed = computeFlow(
    receiveRows,
    RECEIVE_PIPES,
    balancedPipe && balancedValues ? { [balancedPipe]: balancedValues } : undefined,
  );
  const pumpComputed = computeFlow(pumpRows, PUMP_PIPES);
  const totalReceiveM3 = flowGrandTotal(receiveComputed, RECEIVE_PIPES);
  const totalPumpM3 = flowGrandTotal(pumpComputed, PUMP_PIPES);

  // PS1 row in branches summary: sum of pipes for the LAST non-empty 2-hour interval.
  const lastReceiveM3 = (() => {
    for (let i = receiveComputed.length - 1; i >= 0; i--) {
      const t = RECEIVE_PIPES.reduce((a, p) => a + (receiveComputed[i].values[p] ?? 0), 0);
      if (t > 0) return t;
    }
    return 0;
  })();

  const lastPumpM3 = (() => {
    for (let i = pumpComputed.length - 1; i >= 0; i--) {
      const hasFlow = PUMP_PIPES.some((p) => (pumpComputed[i].values[p] ?? 0) > 0);
      if (hasFlow) {
        const strat = pumpComputed[i].values["STRATIGIC PIPE"] ?? 0;
        const faw = pumpComputed[i].values["FAW"] ?? 0;
        return strat + faw;
      }
    }
    return 0;
  })();

  const lbl = (s: string) => pipeLabels[s] || s;

  const pdf = new jsPDF("l", "mm", "a4");
  
  // Force English regardless of app language
  const tEn = (key: string, options?: any) => i18n.t(key, { ...options, lng: "en" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const stamp = new Date(createdAt ?? Date.now()).toLocaleString("en-GB");

  // Official Header Background
  pdf.setFillColor(245, 247, 250);
  pdf.rect(0, 0, pageWidth, 40, "F");
  pdf.setDrawColor(15, 76, 129);
  pdf.setLineWidth(1);
  pdf.line(0, 40, pageWidth, 40);

  // Header Left: PS-1 Identification
  pdf.setTextColor(15, 76, 129);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("PUMPING STATION ONE (PS-1)", margin, 12);
  pdf.text("Operations Reporting System", margin, 17);
  pdf.text("Daily Data Summary", margin, 22);

  // Center: Station Logo (Text-based)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text("PS-1", pageWidth / 2, 20, { align: "center" });
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("CRUDE OIL STORAGE & PUMPING", pageWidth / 2, 26, { align: "center" });

  // Right Side: Generation Metadata (English Only)
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("OFFICIAL REPORT", pageWidth - margin, 12, { align: "right" });
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(reportName || "Daily Operational Report", pageWidth - margin, 17, { align: "right" });
  pdf.text(`Generated: ${stamp}`, pageWidth - margin, 22, { align: "right" });
  pdf.text(`Ref: SOC-PS1-${new Date().getFullYear()}`, pageWidth - margin, 27, { align: "right" });

  pdf.setTextColor(0, 0, 0);

  let cursorY = 48;
  const sectionTitle = (title: string) => {
    if (cursorY > 180) {
      pdf.addPage();
      cursorY = 15;
    }
    pdf.setFillColor(230, 238, 247);
    pdf.rect(margin, cursorY - 4, pageWidth - margin * 2, 7, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(15, 76, 129);
    // Ensure title is translated to English
    const engTitle = i18n.t(title, { lng: "en" }) || title;
    pdf.text(engTitle.toUpperCase(), margin + 2, cursorY + 1, { align: "left" });
    pdf.setTextColor(0, 0, 0);
    cursorY += 6;
  };

  const headStyles = {
    fillColor: [15, 76, 129] as [number, number, number],
    textColor: 255,
    fontStyle: "bold" as const,
    fontSize: 8,
    font: "helvetica",
    halign: "left" as any,
  };
  const bodyStyles = { 
    fontSize: 8, 
    cellPadding: 1.4, 
    font: "helvetica",
    halign: "left" as any,
  };

  sectionTitle("reports.pdf_keyIndicators");
  autoTable(pdf, {
    startY: cursorY,
    head: [
      [tEn("reports.pdf_metric"), tEn("reports.pdf_valueM3"), tEn("reports.pdf_valueBbl")],
    ],
    body: [
      [tEn("stats.totalStock"), fmt(latest?.totalStockM3), fmt(latest?.totalStockBarrel)],
      [tEn("stats.availPump"), fmt(latest?.availPumpM3), fmt(latest?.availPumpBarrel)],
      [tEn("reports.pdf_deadStock"), fmt(latest?.unavailPumpM3), fmt(latest?.unavailPumpBarrel)],
      [tEn("stats.freeVolume"), fmt(latest?.freeVolumeM3), fmt(latest?.freeVolumeBarrel)],
      [tEn("labels.capacity"), fmt(totalCapacity), fmt(totalCapacity * M3_TO_BARREL)],
      [tEn("reports.pdf_fillPct"), `${fillPct.toFixed(2)} %`, "—"],
      [tEn("stats.accumReceive"), fmt(totalReceiveM3), fmt(totalReceiveM3 * M3_TO_BARREL)],
      [tEn("stats.accumPump"), fmt(totalPumpM3), fmt(totalPumpM3 * M3_TO_BARREL)],
    ],
    headStyles,
    bodyStyles,
    margin: { left: margin, right: margin },
    theme: "grid",
  });
  // @ts-expect-error lastAutoTable
  cursorY = pdf.lastAutoTable.finalY + 6;

  sectionTitle("reports.pdf_branchesSummary");
  autoTable(pdf, {
    startY: cursorY,
    head: [
      [
        tEn("reports.pdf_station"),
        tEn("reports.freeM3"),
        tEn("reports.pump"),
        tEn("reports.receive"),
        tEn("reports.pdf_availPumpBbl"),
        tEn("branches.col_notes"),
      ],
    ],
    body: branches.map((b) => {
      const isPs1 = b.name === "PS1";
      const free = isPs1 ? (latest?.freeVolumeM3 ?? null) : b.freeM3;
      const pump = isPs1 ? lastPumpM3 : b.pump;
      const recv = isPs1 ? lastReceiveM3 : b.receive;
      const avail = isPs1
        ? latest?.availPumpM3 != null
          ? latest.availPumpM3 * M3_TO_BARREL
          : null
        : b.availPumpBbl;
      return [b.name, fmt(free), fmt(pump), fmt(recv), fmt(avail), b.notes || "—"];
    }),
    headStyles,
    bodyStyles,
    margin: { left: margin, right: margin },
    theme: "grid",
  });
  // @ts-expect-error lastAutoTable
  cursorY = pdf.lastAutoTable.finalY + 6;

  const allTanks = [...VISIBLE_TANKS, ...customTanks];
  sectionTitle("reports.pdf_tankLevels");
  autoTable(pdf, {
    startY: cursorY,
    head: [
      [
        tEn("reports.pdf_hour"),
        ...allTanks.map((tk) => lbl(tk)),
        tEn("tables.col_stockOilM3"),
        tEn("stats.availPump") + " (M³)",
        tEn("stats.freeVolume") + " (M³)",
      ],
    ],
    body: rows.map((r) => [
      r.reading.hour,
      ...allTanks.map((tk) => (r.reading.levels[tk] != null ? String(r.reading.levels[tk]) : "—")),
      fmt(r.totalStockM3),
      fmt(r.availPumpM3),
      fmt(r.freeVolumeM3),
    ]),
    headStyles,
    bodyStyles,
    margin: { left: margin, right: margin },
    theme: "grid",
  });
  // @ts-expect-error lastAutoTable
  cursorY = pdf.lastAutoTable.finalY + 6;

  pdf.addPage();
  cursorY = 15;
  sectionTitle(
    `${tEn("reports.pdf_oilReceived")}${balancedPipe ? ` — Balanced pipe: ${lbl(balancedPipe)}` : ""}`,
  );
  autoTable(pdf, {
    startY: cursorY,
    head: [[tEn("reports.pdf_hour"), ...RECEIVE_PIPES.map((p) => lbl(p)), "Total"]],
    body: receiveComputed.map((r) => {
      const total = RECEIVE_PIPES.reduce((a, p) => a + (r.values[p] ?? 0), 0);
      return [r.hour, ...RECEIVE_PIPES.map((p) => fmt(r.values[p])), fmt(total)];
    }),
    foot: [
      [
        "ACCUM",
        ...RECEIVE_PIPES.map((p) =>
          fmt(receiveComputed[receiveComputed.length - 1]?.accum[p] ?? 0),
        ),
        fmt(totalReceiveM3),
      ],
    ],
    headStyles,
    bodyStyles,
    footStyles: { fillColor: [220, 235, 220], textColor: 0, fontStyle: "bold", fontSize: 8 },
    margin: { left: margin, right: margin },
    theme: "grid",
  });
  // @ts-expect-error lastAutoTable
  cursorY = pdf.lastAutoTable.finalY + 6;

  sectionTitle(tEn("reports.pdf_oilPumped"));
  autoTable(pdf, {
    startY: cursorY,
    head: [[tEn("reports.pdf_hour"), ...PUMP_PIPES.map((p) => lbl(p)), "Total"]],
    body: pumpComputed.map((r) => {
      const total = PUMP_PIPES.reduce((a, p) => a + (r.values[p] ?? 0), 0);
      return [r.hour, ...PUMP_PIPES.map((p) => fmt(r.values[p])), fmt(total)];
    }),
    foot: [
      [
        "ACCUM",
        ...PUMP_PIPES.map((p) => fmt(pumpComputed[pumpComputed.length - 1]?.accum[p] ?? 0)),
        fmt(totalPumpM3),
      ],
    ],
    headStyles,
    bodyStyles,
    footStyles: { fillColor: [235, 220, 220], textColor: 0, fontStyle: "bold", fontSize: 8 },
    margin: { left: margin, right: margin },
    theme: "grid",
  });

  // Signature Section
  // @ts-expect-error lastAutoTable
  cursorY = pdf.lastAutoTable.finalY + 20;
  if (cursorY > pageHeight - 40) {
    pdf.addPage();
    cursorY = 20;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(15, 76, 129);

  const sigWidth = (pageWidth - margin * 2) / 3;
  
  // Column 1
  pdf.text("SHIFT OFFICER", margin + sigWidth / 2, cursorY, { align: "center" });
  pdf.line(margin + 10, cursorY + 15, margin + sigWidth - 10, cursorY + 15);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("Name & Signature", margin + sigWidth / 2, cursorY + 20, { align: "center" });

  // Column 2
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("MEAL ENGINEER", margin + sigWidth + sigWidth / 2, cursorY, { align: "center" });
  pdf.line(margin + sigWidth + 10, cursorY + 15, margin + sigWidth * 2 - 10, cursorY + 15);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("Name & Signature", margin + sigWidth + sigWidth / 2, cursorY + 20, { align: "center" });

  // Column 3
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("STATION MANAGER", margin + sigWidth * 2 + sigWidth / 2, cursorY, { align: "center" });
  pdf.line(margin + sigWidth * 2 + 10, cursorY + 15, margin + sigWidth * 3 - 10, cursorY + 15);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("Official Stamp", margin + sigWidth * 2 + sigWidth / 2, cursorY + 20, { align: "center" });

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(
      tEn("reports.pdf_page", { current: i, total: pageCount }),
      pageWidth - margin,
      pdf.internal.pageSize.getHeight() - 5,
      { align: "right" },
    );
  }

  const safeName = (reportName || "PS1-Report").replace(/[^a-zA-Z0-9-_]+/g, "_");
  const fileStamp = new Date(createdAt ?? Date.now())
    .toISOString()
    .slice(0, 16)
    .replace(/[:T]/g, "-");
  const finalFileName = `${safeName}-${fileStamp}.pdf`;

  if (mode === "share") {
    await sharePdf(pdf, finalFileName);
  } else {
    await savePdf(pdf, finalFileName);
  }
}

export function snapshotToPdfInput(snap: ReportSnapshot): PdfInput {
  return {
    readings: snap.readings,
    customTanks: snap.customTanks,
    tankBoosts: snap.tankBoosts,
    receiveRows: snap.receiveRows,
    pumpRows: snap.pumpRows,
    branches: snap.branches,
    balancedPipe: snap.balancedPipe,
    pipeLabels: snap.pipeLabels,
    reportName: snap.name,
    createdAt: snap.createdAt,
  };
}
