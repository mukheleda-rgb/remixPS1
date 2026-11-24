import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { fmt, M3_TO_BARREL } from "@/lib/calculations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Share2, Eraser, Copy, Scissors, ClipboardPaste, Download, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";
import { savePdf } from "@/lib/native-save";
import { Capacitor } from "@capacitor/core";
import { hapticFeedback } from "@/lib/haptics";

export interface BranchRow {
  name: string;
  freeM3: number | null;
  pump: number | null;
  receive: number | null;
  /** Manual override for "Available for pump (BBL)" — used by non-PS1 rows */
  availPumpBbl: number | null;
  notes: string;
}

const DEFAULT_BRANCHES: BranchRow[] = [
  { name: "PS1", freeM3: null, pump: null, receive: null, availPumpBbl: null, notes: "" },
  { name: "ZUB.1", freeM3: null, pump: null, receive: null, availPumpBbl: null, notes: "" },
  { name: "ZUB.2", freeM3: null, pump: null, receive: null, availPumpBbl: null, notes: "" },
  { name: "TUBA", freeM3: null, pump: null, receive: null, availPumpBbl: null, notes: "" },
];

export function useBranches() {
  return useLocalStorageState<BranchRow[]>(
    "ps1-branches",
    DEFAULT_BRANCHES,
  );
}

interface Ps1Auto {
  availPumpM3: number | null;
  freeVolumeM3: number | null;
  totalReceiveM3: number;
  totalPumpM3: number;
}

interface Props {
  rows: BranchRow[];
  onChange: (idx: number, patch: Partial<BranchRow>) => void;
  onClearAll?: () => void;
  ps1?: Ps1Auto;
}

export function BranchesTable({ rows, onChange, onClearAll, ps1 }: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  // Inject PS1 auto-computed values (read-only display) over the row whose name === "PS1"
  const displayRows = rows.map((r) => {
    if (r.name !== "PS1" || !ps1) return r;
    return {
      ...r,
      freeM3: ps1.freeVolumeM3,
      pump: ps1.totalPumpM3,
      receive: ps1.totalReceiveM3,
    } as BranchRow;
  });

  const ps1Avail = ps1?.availPumpM3 ?? null;
  const ps1AvailBbl = ps1Avail != null ? ps1Avail * M3_TO_BARREL : null;

  const totalFree = displayRows.reduce((a, r) => a + (r.freeM3 ?? 0), 0);
  const totalPump = displayRows.reduce((a, r) => a + (r.pump ?? 0), 0);
  const totalRecv = displayRows.reduce((a, r) => a + (r.receive ?? 0), 0);
  // Total Avail (BBL): PS1 auto + manual entries from other branches
  const totalAvailBbl = displayRows.reduce((a, r) => {
    if (r.name === "PS1" && ps1) return a + (ps1AvailBbl ?? 0);
    return a + (r.availPumpBbl ?? 0);
  }, 0);

  const num = (v: string) => (v === "" ? null : Number(v));
  const isPs1Auto = (name: string) => name === "PS1" && !!ps1;

  // Combined notes: single cell across all rows
  const sharedNotes = rows[0]?.notes ?? "";
  const updateSharedNotes = (notes: string) => onChange(0, { notes });

  type BranchClip = Pick<BranchRow, "freeM3" | "pump" | "receive" | "availPumpBbl">;
  const [clipboard, setClipboard] = useState<BranchClip | null>(null);

  const exportToExcel = async () => {
    hapticFeedback("light");
    try {
      const { utils, writeFile } = await import("xlsx");
      const data = displayRows.map((r) => {
        const auto = isPs1Auto(r.name);
        return {
          "Station / Branch": r.name,
          "Avail. Pump (BBL)": auto ? (ps1AvailBbl ?? "") : (r.availPumpBbl ?? ""),
          "Free Volume (BBL)": r.freeM3 ? Math.round(r.freeM3 * M3_TO_BARREL) : "",
          "Pump (M3)": r.pump ?? "",
          "Receive (M3)": r.receive ?? "",
          "Notes": (r.name === displayRows[0].name ? sharedNotes : "")
        };
      });
      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "PS1_Branches");
      writeFile(wb, `PS1_Branches_${new Date().toISOString().split('T')[0]}.xlsx`);
      hapticFeedback("success");
      toast.success(t("toast.exportSuccess") || "تم التصدير بنجاح");
    } catch (err) {
      console.error(err);
      hapticFeedback("error");
      toast.error("خطأ في تصدير ملف الاكسل");
    }
  };

  const copyBranchRow = (r: BranchRow) => {
    hapticFeedback("light");
    setClipboard({
      freeM3: r.freeM3,
      pump: r.pump,
      receive: r.receive,
      availPumpBbl: r.availPumpBbl,
    });
    toast.success(t("toast.copyRow", { hour: r.name }));
  };
  const cutBranchRow = (idx: number, r: BranchRow) => {
    if (isPs1Auto(r.name)) {
      toast.error(t("branches.ps1ManualError"));
      return;
    }
    copyBranchRow(r);
    onChange(idx, { freeM3: null, pump: null, receive: null, availPumpBbl: null });
    toast.success(t("toast.cutRow", { hour: r.name }));
  };
  const pasteBranchRow = (idx: number, r: BranchRow) => {
    if (!clipboard) return;
    if (isPs1Auto(r.name)) {
      toast.error(t("branches.ps1ManualError"));
      return;
    }
    onChange(idx, { ...clipboard });
    toast.success(t("toast.pasteRow", { hour: r.name }));
  };

  const handleClearAll = () => {
    if (!onClearAll) return;
    onClearAll();
    hapticFeedback("warning");
    toast.success(t("toast.clearReadingsSuccess"));
  };

  const buildPdf = async () => {
    const [{ default: jsPDF }, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = (autoTableMod as { default: (doc: unknown, options: unknown) => void })
      .default;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // ... (rest of buildPdf logic)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PS1 — Branches / Stations Table", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, pageWidth / 2, 22, {
      align: "center",
    });

    const head = [
      ["Station", "Avail. Pump (BBL)", "Free Volume (BBL)", "Pump (M3)", "Receive (M3)"],
    ];

    const body = displayRows.map((r) => {
      const auto = isPs1Auto(r.name);
      const availBbl = auto
        ? ps1AvailBbl != null
          ? fmt(ps1AvailBbl)
          : "-"
        : r.availPumpBbl != null
          ? fmt(r.availPumpBbl)
          : "-";
      return [
        r.name,
        availBbl,
        r.freeM3 != null ? fmt(r.freeM3 * M3_TO_BARREL) : "-",
        r.pump != null ? fmt(r.pump) : "-",
        r.receive != null ? fmt(r.receive) : "-",
      ];
    });

    const foot = [
      ["TOTAL", fmt(totalAvailBbl), fmt(totalFree * M3_TO_BARREL), fmt(totalPump), fmt(totalRecv)],
    ];

    autoTable(doc, {
      head,
      body,
      foot,
      startY: 28,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 11, halign: "center", cellPadding: 3 },
      headStyles: { fillColor: [40, 80, 140], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
      columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
    });

    if (sharedNotes.trim()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable?.finalY ?? 28;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 14, finalY + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const noteLines = doc.splitTextToSize(sharedNotes.trim(), pageWidth - 28);
      doc.text(noteLines, 14, finalY + 16);
    }

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      "PS1 Receive & Pumping Calculations  ·  Designed by Eng. Mokhalad Ahmed",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );

    return doc;
  };

  const handleDownloadPdf = async () => {
    hapticFeedback("light");
    try {
      const doc = await buildPdf();
      const fileName = `PS1-Branches-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      hapticFeedback("success");
      toast.success(t("toast.sharePdfSuccess"));
    } catch (err) {
      console.error(err);
      hapticFeedback("error");
      toast.error(t("toast.sharePdfError"));
    }
  };

  const handleShare = async () => {
    hapticFeedback("light");
    let doc: any;
    try {
      doc = await buildPdf();
    } catch (err) {
      console.error(err);
      toast.error(t("toast.sharePdfError"));
      return;
    }

    const fileName = `PS1-Branches-${new Date().toISOString().slice(0, 10)}.pdf`;

    if (Capacitor.isNativePlatform()) {
      try {
        await savePdf(doc, fileName);
        toast.success(t("toast.sharePdfSuccess"));
        return;
      } catch (err) {
        console.error(err);
        toast.error(t("toast.sharePdfError"));
        return;
      }
    }

    // Web Fallback
    const blob = doc.output("blob");
    const file = new File([blob], fileName, { type: "application/pdf" });

    // Try Web Share API with file
    const nav =
      typeof navigator !== "undefined"
        ? (navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean })
        : null;
    if (nav?.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({
          files: [file],
          title: t("branches.title"),
          text: t("branches.subtitle"),
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // user cancelled
      }
    }

    doc.save(fileName);
    toast.success(t("toast.sharePdfSuccess"));
  };

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3 text-start">
        <h3 className="text-base font-bold text-foreground">{t("branches.title")}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {t("branches.subtitle")}
          </span>
          {onClearAll && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 no-print text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Eraser className="h-4 w-4" /> {t("buttons.resetAll")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-right">
                    {t("dialog.confirmTitle") || "تأكيد الإجراء"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-right">
                    {t("dialog.clearReadingsConfirm") || "هل أنت متأكد من رغبتك في مسح جميع البيانات؟"}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogCancel>{t("common.cancel") || "إلغاء"}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {t("common.confirm") || "تأكيد"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={handleShare} size="sm" variant="outline" className="gap-1.5 no-print">
            <Share2 className="h-4 w-4" /> {t("branches.sharePdf")}
          </Button>
          <Button onClick={handleDownloadPdf} size="sm" variant="outline" className="gap-1.5 no-print text-primary border-primary/20 hover:bg-primary/5">
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
              <th className="px-2 py-2 text-right">
                {t("branches.col_station")}
              </th>
              <th className="px-2 py-2 text-center whitespace-nowrap">
                {t("stats.availPump")} ({t("common.barrel")})
              </th>
              <th className="px-2 py-2 text-center whitespace-nowrap">
                {t("stats.freeVolume")} ({t("common.barrel")})
              </th>
              <th className="px-2 py-2 text-center whitespace-nowrap">
                {t("branches.col_pump2hr")} ({t("common.m3")})
              </th>
              <th className="px-2 py-2 text-center whitespace-nowrap">
                {t("branches.col_receive2hr")} ({t("common.m3")})
              </th>
              <th className="px-2 py-2 min-w-[300px] text-right">
                {t("branches.col_notes")}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((r, idx) => {
              const mainIdx = rows.findIndex(orig => orig.name === r.name);
              const auto = isPs1Auto(r.name);
              return (
                <tr key={r.name} className="border-b hover:bg-muted/30">
                  <td className="px-2 py-2 font-bold text-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span>{r.name}</span>
                      <div className="flex items-center gap-0.5 no-print">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => copyBranchRow(r)}
                          title={t("reports.copy")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {!auto && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => cutBranchRow(mainIdx, r)}
                            title={t("reports.cut")}
                          >
                            <Scissors className="h-3 w-3" />
                          </Button>
                        )}
                        {clipboard && !auto && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary hover:bg-primary/10"
                            onClick={() => pasteBranchRow(mainIdx, r)}
                            title={t("reports.paste")}
                          >
                            <ClipboardPaste className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-1 py-1">
                    {auto ? (
                      <div
                        className="flex h-9 items-center justify-center rounded-md border border-dashed bg-muted/40 font-semibold tabular-nums text-success"
                        title={t("branches.autoHintAvail")}
                      >
                        {ps1AvailBbl != null ? fmt(ps1AvailBbl) : "—"}
                      </div>
                    ) : (
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={r.availPumpBbl ?? ""}
                        onChange={(e) => onChange(mainIdx, { availPumpBbl: num(e.target.value) })}
                        className="h-9 min-w-[95px] text-center tabular-nums"
                        placeholder="—"
                      />
                    )}
                  </td>
                  <td className="px-1 py-1">
                    {auto ? (
                      <div
                        className="flex h-9 items-center justify-center rounded-md border border-dashed bg-muted/40 font-semibold tabular-nums text-warning"
                        title={t("branches.autoHintFree")}
                      >
                        {r.freeM3 != null ? fmt(r.freeM3 * M3_TO_BARREL) : "—"}
                      </div>
                    ) : (
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={r.freeM3 ?? ""}
                        onChange={(e) => onChange(mainIdx, { freeM3: num(e.target.value) })}
                        className="h-9 min-w-[95px] text-center tabular-nums"
                        placeholder="—"
                      />
                    )}
                  </td>
                  <td className="px-1 py-1">
                    {auto ? (
                      <div
                        className="flex h-9 items-center justify-center rounded-md border border-dashed bg-muted/40 font-semibold tabular-nums text-primary"
                        title={t("branches.autoHintPump")}
                      >
                        {r.pump != null ? fmt(r.pump) : "—"}
                      </div>
                    ) : (
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={r.pump ?? ""}
                        onChange={(e) => onChange(mainIdx, { pump: num(e.target.value) })}
                        className="h-9 min-w-[95px] text-center tabular-nums"
                        placeholder="—"
                      />
                    )}
                  </td>
                  <td className="px-1 py-1">
                    {auto ? (
                      <div
                        className="flex h-9 items-center justify-center rounded-md border border-dashed bg-muted/40 font-semibold tabular-nums text-success"
                        title={t("branches.autoHintReceive")}
                      >
                        {r.receive != null ? fmt(r.receive) : "—"}
                      </div>
                    ) : (
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={r.receive ?? ""}
                        onChange={(e) => onChange(mainIdx, { receive: num(e.target.value) })}
                        className="h-9 min-w-[95px] text-center tabular-nums"
                        placeholder="—"
                      />
                    )}
                  </td>
                  {idx === 0 && (
                    <td
                      rowSpan={displayRows.length}
                      className="border-r px-1 py-1 align-top min-w-[350px]"
                    >
                      <Textarea
                        value={sharedNotes}
                        onChange={(e) => updateSharedNotes(e.target.value)}
                        className="h-full min-h-[220px] resize-none text-xs"
                        placeholder={t("branches.notesPlaceholder")}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
            <tr className="bg-muted/50 font-bold">
              <td className="px-2 py-2 text-foreground">{t("tables.col_total")}</td>
              <td className="px-2 py-2 text-center tabular-nums text-success">
                {fmt(totalAvailBbl)}
              </td>
              <td className="px-2 py-2 text-center tabular-nums text-foreground">
                {fmt(totalFree * M3_TO_BARREL)}
              </td>
              <td className="px-2 py-2 text-center tabular-nums text-primary">{fmt(totalPump)}</td>
              <td className="px-2 py-2 text-center tabular-nums text-success">{fmt(totalRecv)}</td>
              <td className="px-2 py-2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
