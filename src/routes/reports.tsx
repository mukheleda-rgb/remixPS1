import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  Download,
  Eye,
  X,
  FileText,
  Share2,
  SlidersHorizontal,
  FolderArchive,
  FileSpreadsheet,
} from "lucide-react";
import {
  loadReports,
  deleteReport,
  deleteAllReports,
  saveReports,
  type ReportSnapshot,
} from "@/lib/reports";
import { generateReportPdf, snapshotToPdfInput } from "@/lib/report-pdf";
import {
  compute,
  fmt,
  RECEIVE_PIPES,
  PUMP_PIPES,
  computeFlow,
  flowGrandTotal,
  VISIBLE_TANKS,
  M3_TO_BARREL,
  TOTAL_CAPACITY_M3,
} from "@/lib/calculations";
import { CustomReportBuilder } from "@/components/CustomReportBuilder";
import { SystemSpecModal } from "@/components/SystemSpecModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "التقارير المخصصة وإدارة المستودع — PS1" },
      {
        name: "description",
        content: "واجهة إنشاء وتصدير التقارير المخصصة وإدارة الأرشيف لمحطة ومستودع الضخ PS1.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [reports, setReports] = useState<ReportSnapshot[]>([]);
  const [preview, setPreview] = useState<ReportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<string>("custom_builder");

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await loadReports();
      setReports(data);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const reportToDelete = reports.find((r) => r.id === id);
    if (!reportToDelete) return;

    // Apply deletion immediately
    const updatedReports = reports.filter((r) => r.id !== id);
    setReports(updatedReports);
    await deleteReport(id);

    toast(t("reports.deleteSuccess"), {
      description: name,
      action: {
        label: t("common.undo") || "Undo",
        onClick: async () => {
          // Restore state and storage
          setReports((prev) => {
            const exists = prev.some((r) => r.id === id);
            if (exists) return prev;
            const restored = [...prev, reportToDelete].sort((a, b) => b.createdAt - a.createdAt);
            saveReports(restored);
            return restored;
          });
          toast.info(t("common.restored") || "Restored");
        },
      },
    });
  };

  const handleDeleteAll = async () => {
    const oldReports = [...reports];
    if (oldReports.length === 0) return;

    // Apply deletion immediately
    setReports([]);
    await deleteAllReports();

    toast.warning(t("reports.allDeleted"), {
      action: {
        label: t("common.undo") || "Undo",
        onClick: async () => {
          setReports(oldReports);
          await saveReports(oldReports);
          toast.info(t("common.restored") || "Restored");
        },
      },
    });
  };

  const handleDownload = async (snap: ReportSnapshot) => {
    const tMsg = toast.loading(t("reports.downloading"));
    try {
      await generateReportPdf(snapshotToPdfInput(snap));
      toast.success(t("reports.downloadSuccess"), { id: tMsg });
    } catch (err) {
      toast.error(t("reports.downloadError"), {
        id: tMsg,
        description: String((err as Error)?.message ?? err),
      });
    }
  };

  const handleShare = async (snap: ReportSnapshot) => {
    const tMsg = toast.loading(t("common.sharing") || "جاري المشاركة...");
    try {
      await generateReportPdf({
        ...snapshotToPdfInput(snap),
        mode: "share",
      });
      toast.dismiss(tMsg);
    } catch (err) {
      toast.error(t("common.shareError") || "خطأ في المشاركة", {
        id: tMsg,
        description: String((err as Error)?.message ?? err),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card no-print sticky top-0 z-40">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-foreground">
                {isRtl ? "مركز إدارة وتوليد التقارير المخصصة" : "Reports Center & Custom Generator"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isRtl
                  ? "إنشاء تقارير تشغيلية مخصصة، تصدير CSV / XLSX / PDF، وإدارة الأرشيف"
                  : "Custom operational reports generator, multi-format export, and snapshot archive"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SystemSpecModal />
            <LanguageSwitcher />
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" /> {t("reports.backToDashboard")}
              </Link>
            </Button>
          </div>
        </div>

        {/* Tab Navigation in Header */}
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex border-b border-border/40 gap-6 text-sm font-semibold">
            <button
              onClick={() => setActiveMainTab("custom_builder")}
              className={`flex items-center gap-2 py-3 border-b-2 transition-all ${
                activeMainTab === "custom_builder"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>{isRtl ? "مُنشئ التقارير المخصصة" : "Custom Report Builder"}</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                {isRtl ? "جديد" : "New"}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab("saved_archive")}
              className={`flex items-center gap-2 py-3 border-b-2 transition-all ${
                activeMainTab === "saved_archive"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderArchive className="h-4 w-4" />
              <span>{isRtl ? "أرشيف التقارير المحفوظة" : "Saved Reports Archive"}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {reports.length}
              </span>
            </button>

            <Link
              to="/boc-report"
              className="flex items-center gap-2 py-3 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              <span>{isRtl ? "تقرير BOC اليومي الرسمي" : "Official BOC Daily Report"}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:px-6">
        {activeMainTab === "custom_builder" ? (
          <CustomReportBuilder onReportSaved={refresh} />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {isRtl ? "سجل وأرشيف التقارير السابقة" : "Saved Reports Archive"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isRtl
                    ? `يتضمن ${reports.length} تقريراً محفوظاً في قاعدة البيانات المحلية`
                    : `Contains ${reports.length} reports saved in local database`}
                </p>
              </div>
              {reports.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDeleteAll}
                >
                  <Trash2 className="h-4 w-4" /> {t("reports.deleteAll")}
                </Button>
              )}
            </div>

            {reports.length === 0 ? (
              <div className="rounded-2xl border bg-card p-10 text-center shadow-[var(--shadow-card)]">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-3 text-lg font-bold text-foreground">{t("reports.noReports")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("reports.noReportsDesc")}</p>
                <div className="mt-4 flex justify-center gap-3">
                  <Button onClick={() => setActiveMainTab("custom_builder")} className="gap-1.5">
                    <SlidersHorizontal className="h-4 w-4" />
                    {isRtl ? "إنشاء تقرير مخصص الآن" : "Create Custom Report"}
                  </Button>
                  <Button asChild variant="outline" className="gap-1.5">
                    <Link to="/">{t("reports.goToDashboard")}</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {reports.map((r) => {
                  const date = new Date(r.createdAt).toLocaleString(
                    i18n.language === "ar" ? "ar-IQ" : "en-US",
                  );
                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] transition-all hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-foreground">{r.name}</h3>
                          <p className="text-xs text-muted-foreground">{date}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <span className="rounded-md bg-muted/40 px-2 py-1">
                          {t("reports.readingsCount", { count: r.readings.length })}
                        </span>
                        <span className="rounded-md bg-muted/40 px-2 py-1">
                          {t("reports.extraTanksCount", { count: r.customTanks.length })}
                        </span>
                        <span className="rounded-md bg-muted/40 px-2 py-1">
                          {t("reports.branchesCount", { count: r.branches.length })}
                        </span>
                        <span className="rounded-md bg-muted/40 px-2 py-1">
                          {t("reports.balance", { pipe: r.balancedPipe || "—" })}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setPreview(r)}
                        >
                          <Eye className="h-3.5 w-3.5" /> {t("reports.view")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleDownload(r)}
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleShare(r)}
                        >
                          <Share2 className="h-3.5 w-3.5" /> {t("common.share") || "مشاركة"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(r.id, r.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t("reports.delete")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {preview && <ReportPreview snap={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function ReportPreview({ snap, onClose }: { snap: ReportSnapshot; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const bonusCapacity = Object.values(snap.tankBoosts).reduce((a, b) => a + b, 0);
  const totalCapacity = TOTAL_CAPACITY_M3 + bonusCapacity;
  const rows = compute(snap.readings, snap.customTanks, bonusCapacity);
  const latest = [...rows].reverse().find((r) => r.totalStockM3 != null);
  const fillPct = latest?.totalStockM3 ? (latest.totalStockM3 / totalCapacity) * 100 : 0;
  // Re-compute the same auto-balance the dashboard uses so the WQ (or any user-chosen
  // balanced pipe) shows real values in the saved-report preview.
  const balancedValues = (() => {
    if (!snap.balancedPipe) return null;
    const otherReceive = RECEIVE_PIPES.filter((p) => p !== snap.balancedPipe);
    return snap.receiveRows.map((row, idx) => {
      const pumpSum = PUMP_PIPES.reduce((a, p) => a + (snap.pumpRows[idx]?.values[p] ?? 0), 0);
      const otherRecvSum = otherReceive.reduce((a, p) => a + (row.values[p] ?? 0), 0);
      const curComp = rows[idx + 1];

      // Calculate level change directly from levels: (Σ Δlevels × 43)
      const prevReading = snap.readings[idx];
      const curReading = snap.readings[idx + 1];
      let levelDiffSum = 0;
      if (prevReading && curReading) {
        const allKeys = [...VISIBLE_TANKS, ...snap.customTanks];
        for (const k of allKeys) {
          const b = prevReading.levels[k];
          const a = curReading.levels[k];
          if (a != null && b != null) {
            levelDiffSum += a - b;
          }
        }
      }

      const wq = pumpSum + levelDiffSum * 43 - otherRecvSum;
      const hasAny = curComp?.totalStockM3 != null && rows[idx]?.totalStockM3 != null;
      if (!hasAny && pumpSum === 0 && otherRecvSum === 0) return null;
      return Math.round(wq * 100) / 100;
    });
  })();
  const receiveComputed = computeFlow(
    snap.receiveRows,
    RECEIVE_PIPES,
    snap.balancedPipe && balancedValues ? { [snap.balancedPipe]: balancedValues } : undefined,
  );
  const pumpComputed = computeFlow(snap.pumpRows, PUMP_PIPES);
  const totalReceiveM3 = flowGrandTotal(receiveComputed, RECEIVE_PIPES);
  const totalPumpM3 = flowGrandTotal(pumpComputed, PUMP_PIPES);
  // PS1 row in branches summary: sum of pipes for the LAST non-empty 2-hour interval.
  const ps1Receive = (() => {
    for (let i = receiveComputed.length - 1; i >= 0; i--) {
      const t = RECEIVE_PIPES.reduce((a, p) => a + (receiveComputed[i].values[p] ?? 0), 0);
      if (t > 0) return t;
    }
    return 0;
  })();

  const ps1Pump = (() => {
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
  const allTanks = [...VISIBLE_TANKS, ...snap.customTanks];
  const lbl = (s: string) => snap.pipeLabels?.[s] || s;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">{snap.name}</h2>
            <p className="text-xs text-muted-foreground">
              {new Date(snap.createdAt).toLocaleString(i18n.language === "ar" ? "ar-IQ" : "en-US")}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label={t("settings.close")}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label={`${t("stats.totalStock")} (${t("common.m3")})`}
            value={fmt(latest?.totalStockM3)}
          />
          <Kpi
            label={`${t("stats.availPump")} (${t("common.m3")})`}
            value={fmt(latest?.availPumpM3)}
          />
          <Kpi
            label={`${t("stats.freeVolume")} (${t("common.m3")})`}
            value={fmt(latest?.freeVolumeM3)}
          />
          <Kpi label={t("stats.fillRate")} value={`${fillPct.toFixed(1)} %`} />
          <Kpi
            label={`${t("stats.accumReceive")} (${t("common.m3")})`}
            value={fmt(totalReceiveM3)}
          />
          <Kpi label={`${t("stats.accumPump")} (${t("common.m3")})`} value={fmt(totalPumpM3)} />
          <Kpi label={`السعة الكلية (${t("common.m3")})`} value={fmt(totalCapacity)} />
          <Kpi label={t("nav.readings")} value={String(snap.readings.length)} />
        </div>

        <h3 className="mt-5 mb-2 text-sm font-bold text-foreground">{t("reports.branchTable")}</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-2 text-right">{t("reports.station")}</th>
                <th className="p-2 text-center">{t("reports.freeM3")}</th>
                <th className="p-2 text-center">{t("reports.pump")}</th>
                <th className="p-2 text-center">{t("reports.receive")}</th>
                <th className="p-2 text-center">{t("reports.availPumpBbl")}</th>
              </tr>
            </thead>
            <tbody>
              {snap.branches.map((b) => {
                const isPs1 = b.name === "PS1";
                return (
                  <tr key={b.name} className="border-t">
                    <td className="p-2 font-bold">{b.name}</td>
                    <td className="p-2 text-center tabular-nums">
                      {fmt(isPs1 ? (latest?.freeVolumeM3 ?? null) : b.freeM3)}
                    </td>
                    <td className="p-2 text-center tabular-nums">
                      {fmt(isPs1 ? ps1Pump : b.pump)}
                    </td>
                    <td className="p-2 text-center tabular-nums">
                      {fmt(isPs1 ? ps1Receive : b.receive)}
                    </td>
                    <td className="p-2 text-center tabular-nums">
                      {fmt(
                        isPs1 && latest?.availPumpM3 != null
                          ? latest.availPumpM3 * M3_TO_BARREL
                          : b.availPumpBbl,
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h3 className="mt-5 mb-2 text-sm font-bold text-foreground">{t("reports.tankReadings")}</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs" dir="ltr">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-2">Hour</th>
                {allTanks.map((t) => (
                  <th key={t} className="p-2">
                    {t}
                  </th>
                ))}
                <th className="p-2">Stock M³</th>
                <th className="p-2">Free M³</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.reading.id} className="border-t">
                  <td className="p-1.5 text-center font-mono">{r.reading.hour}</td>
                  {allTanks.map((t) => (
                    <td key={t} className="p-1.5 text-center tabular-nums">
                      {r.reading.levels[t] ?? "—"}
                    </td>
                  ))}
                  <td className="p-1.5 text-center tabular-nums">{fmt(r.totalStockM3)}</td>
                  <td className="p-1.5 text-center tabular-nums">{fmt(r.freeVolumeM3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-bold text-success">{t("tables.oilReceived")}</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs" dir="ltr">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-2">Hour</th>
                    {RECEIVE_PIPES.map((p) => (
                      <th key={p} className="p-2">
                        {lbl(p)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receiveComputed.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-1.5 text-center font-mono">{r.hour}</td>
                      {RECEIVE_PIPES.map((p) => (
                        <td key={p} className="p-1.5 text-center tabular-nums">
                          {fmt(r.values[p])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-primary">{t("tables.oilPumped")}</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs" dir="ltr">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-2">Hour</th>
                    {PUMP_PIPES.map((p) => (
                      <th key={p} className="p-2">
                        {lbl(p)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pumpComputed.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-1.5 text-center font-mono">{r.hour}</td>
                      {PUMP_PIPES.map((p) => (
                        <td key={p} className="p-1.5 text-center tabular-nums">
                          {fmt(r.values[p])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>
            {t("settings.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
