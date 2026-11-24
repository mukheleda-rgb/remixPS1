import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { hapticFeedback } from "@/lib/haptics";
import {
  compute,
  defaultReadings,
  emptyLevels,
  fmt,
  makeId,
  Reading,
  TOTAL_CAPACITY_M3,
  VISIBLE_TANKS,
  CAPACITY_PER_EXTRA_TANK_M3,
  CAPACITY_PER_EXTRA_TANK_ALT_M3,
  RECEIVE_PIPES,
  PUMP_PIPES,
  defaultFlowRows,
  computeFlow,
  FlowRow,
  flowGrandTotal,
  M3_TO_BARREL,
  addHours,
} from "@/lib/calculations";
import { TankCard } from "@/components/TankCard";
import { StatCard } from "@/components/StatCard";
import { ReadingsTable } from "@/components/ReadingsTable";
import { FlowTable } from "@/components/FlowTable";
import { StockChart } from "@/components/StockChart";
import { BranchesTable, useBranches, type BranchRow } from "@/components/BranchesTable";
import { DiagramPanel } from "@/components/DiagramPanel";
import { ValvesPanel } from "@/components/ValvesPanel";
import { TasksPanel } from "@/components/TasksPanel";
import { ShiftHandoff } from "@/components/ShiftHandoff";
import TrendsPanel from "@/components/TrendsPanel";
import { logAction } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  ClipboardList,
  Map as MapIcon,
  Wrench,
  Infinity as ValveIcon,
  CheckCircle2 as TasksIcon,
  Menu,
  Settings,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Sun,
  Moon,
  Save,
  Printer,
  FileCheck,
  FileText,
  Droplets,
  Gauge,
  TrendingUp,
  Database,
  RotateCcw,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  Share2,
  ArrowUpDown,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { toast } from "sonner";
import { addReport, loadReports, type ReportSnapshot } from "@/lib/reports";
import { generateReportPdf } from "@/lib/report-pdf";
import { motion } from "motion/react";
import { ResponsiveContainer, AreaChart, Area, Tooltip as RechartsTooltip } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "محطة الضخ PS1 — الرئيسية" },
      {
        name: "description",
        content: "نظام حساب مستويات خزانات محطة الضخ PS1 ومخزون النفط بالمتر المكعب والبرميل.",
      },
      { property: "og:title", content: "محطة الضخ PS1" },
      {
        property: "og:description",
        content: "لوحة تحكم احترافية لمتابعة مستويات الخزانات وحساب المخزون.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [readings, setReadings] = useLocalStorageState<Reading[]>(
    "ps1-readings",
    defaultReadings(),
  );
  const [customTanks, setCustomTanks] = useLocalStorageState<string[]>(
    "ps1-custom-tanks",
    [],
  );
  // map tank name → bonus capacity m³ (76000 or 70000). Absence = no boost.
  const [tankBoosts, setTankBoosts] = useLocalStorageState<Record<string, number>>(
    "ps1-tank-boosts",
    {},
  );
  const [receiveRows, setReceiveRows] = useLocalStorageState<FlowRow[]>(
    "ps1-receive",
    defaultFlowRows(RECEIVE_PIPES),
  );
  const [pumpRows, setPumpRows] = useLocalStorageState<FlowRow[]>(
    "ps1-pump",
    defaultFlowRows(PUMP_PIPES),
  );
  // Which receive pipe (if any) is auto-balanced. Default: WQ. "" = none.
  const [balancedPipe, setBalancedPipe] = useLocalStorageState<string>(
    "ps1-balanced-pipe",
    "WQ",
  );
  // User-renamed pipe/tank labels: original name → display label
  const [pipeLabels, setPipeLabels] = useLocalStorageState<Record<string, string>>(
    "ps1-pipe-labels",
    {},
  );
  const [branches, setBranches] = useBranches();
  const { theme, toggle: toggleTheme, mounted } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const [reports, setReports] = useState<ReportSnapshot[]>([]);

  useEffect(() => {
    loadReports().then(setReports);
  }, []);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ===== Tab navigation =====
  const TAB_ORDER = ["main", "readings", "diagram", "valves", "tasks"] as const;
  type TabKey = (typeof TAB_ORDER)[number];
  const [activeTab, setActiveTab] = useState<TabKey>("main");
  const [diagramSearch, setDiagramSearch] = useState<{ query: string; id: string } | null>(null);

  const updateBranch = (idx: number, patch: Partial<BranchRow>) => {
    setBranches((bs) => bs.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  const renameLabel = (original: string, label: string) => {
    setPipeLabels((m) => {
      const next = { ...m };
      const trimmed = label.trim();
      if (!trimmed || trimmed === original) delete next[original];
      else next[original] = trimmed;
      return next;
    });
  };

  const handleSaveReport = () => {
    hapticFeedback("light");
    const defaultName = t("dialog.defaultReportName", {
      date: new Date().toLocaleString(i18n.language === "ar" ? "ar-IQ" : "en-US"),
    });
    const name =
      (typeof window !== "undefined"
        ? window.prompt(t("dialog.reportName"), defaultName)
        : defaultName) || defaultName;
    addReport({
      id: makeId(),
      name: name.trim() || defaultName,
      createdAt: Date.now(),
      readings,
      customTanks,
      tankBoosts,
      receiveRows,
      pumpRows,
      branches,
      balancedPipe,
      pipeLabels,
    });
    toast.success(t("toast.saveSuccess"), { description: t("toast.saveDesc") });
  };

  const handlePrint = async () => {
    hapticFeedback("light");
    const tMsg = toast.loading(t("toast.pdfGenerating"));
    try {
      await generateReportPdf({
        readings,
        customTanks,
        tankBoosts,
        receiveRows,
        pumpRows,
        branches,
        balancedPipe,
        pipeLabels,
        mode: "download",
      });
      toast.success(t("toast.pdfSuccess"), { id: tMsg });
    } catch (err) {
      console.error(err);
      toast.error(t("toast.pdfError"), {
        id: tMsg,
        description: String((err as Error)?.message ?? err),
      });
    }
  };

  const handleShare = async () => {
    hapticFeedback("light");
    const tMsg = toast.loading(t("common.sharing") || "جاري التحضير للمشاركة...");
    try {
      await generateReportPdf({
        readings,
        customTanks,
        tankBoosts,
        receiveRows,
        pumpRows,
        branches,
        balancedPipe,
        pipeLabels,
        mode: "share",
      });
      toast.dismiss(tMsg);
    } catch (err) {
      console.error(err);
      toast.error(t("common.shareError") || "خطأ في المشاركة", {
        id: tMsg,
        description: String((err as Error)?.message ?? err),
      });
    }
  };

  const bonusCapacity = Object.values(tankBoosts).reduce((a, b) => a + b, 0);
  const totalCapacity = TOTAL_CAPACITY_M3 + bonusCapacity;
  const rows = useMemo(
    () => compute(readings, customTanks, bonusCapacity),
    [readings, customTanks, bonusCapacity],
  );
  const pumpComputed = useMemo(() => computeFlow(pumpRows, PUMP_PIPES), [pumpRows]);

  // Auto-balance for whichever pipe the user picked (default WQ). Empty string = no balancing.
  // Balanced Value = Pump(Interval) + DeltaStock(Interval) - OtherReceive(Interval)
  const balancedValues = useMemo(() => {
    if (!balancedPipe) return null;
    const otherReceive = RECEIVE_PIPES.filter((p) => p !== balancedPipe);

    return receiveRows.map((_, idx) => {
      // Row 'idx' in Flow tables represents the interval ending at RP_HOURS[idx]
      // Corresponding readings: idx (start) and idx + 1 (end)
      const curComp = rows[idx + 1];

      const pumpSum = PUMP_PIPES.reduce((a, p) => a + (pumpRows[idx]?.values[p] ?? 0), 0);
      const otherRecvSum = otherReceive.reduce((a, p) => a + (receiveRows[idx]?.values[p] ?? 0), 0);

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

      // PS1 Balance formula for the 2-hour interval
      const wqResult = pumpSum + levelDiffSum * 43 - otherRecvSum;

      // Only show a value if there is some activity in this interval
      const hasData =
        pumpSum !== 0 ||
        otherRecvSum !== 0 ||
        (curComp?.totalStockM3 != null && rows[idx]?.totalStockM3 != null);

      if (!hasData) return null;
      return Math.round(wqResult * 100) / 100;
    });
  }, [balancedPipe, receiveRows, pumpRows, rows, readings, customTanks]);

  const receiveComputed = useMemo(
    () =>
      computeFlow(
        receiveRows,
        RECEIVE_PIPES,
        balancedPipe && balancedValues ? { [balancedPipe]: balancedValues } : undefined,
      ),
    [receiveRows, balancedValues, balancedPipe],
  );

  const totalReceiveM3 = flowGrandTotal(receiveComputed, RECEIVE_PIPES);
  const totalPumpM3 = flowGrandTotal(pumpComputed, PUMP_PIPES);

  // PS1 row in the Branches table uses the LAST entered 2-hour interval (sum of pipes
  // for the most recent non-empty row).
  const lastIntervalReceiveM3 = useMemo(() => {
    for (let i = receiveComputed.length - 1; i >= 0; i--) {
      const total = RECEIVE_PIPES.reduce((a, p) => a + (receiveComputed[i].values[p] ?? 0), 0);
      if (total > 0) return total;
    }
    return 0;
  }, [receiveComputed]);
  const lastIntervalPumpM3 = useMemo(() => {
    for (let i = pumpComputed.length - 1; i >= 0; i--) {
      const hasFlow = PUMP_PIPES.some((p) => (pumpComputed[i].values[p] ?? 0) > 0);
      if (hasFlow) {
        const strat = pumpComputed[i].values["STRATIGIC PIPE"] ?? 0;
        const faw = pumpComputed[i].values["FAW"] ?? 0;
        return strat + faw;
      }
    }
    return 0;
  }, [pumpComputed]);

  const latest = useMemo(() => [...rows].reverse().find((r) => r.totalStockM3 != null), [rows]);
  const fillPct = latest?.totalStockM3 ? (latest.totalStockM3 / totalCapacity) * 100 : 0;

  // Selected reading row for tank status drag-to-adjust, linked with readings table
  const [selectedReadingId, setSelectedReadingId] = useState<string>("");
  const activeReading = useMemo(() => {
    if (selectedReadingId) {
      const found = readings.find((r) => r.id === selectedReadingId);
      if (found) return found;
    }
    return latest?.reading ?? readings[readings.length - 1] ?? readings[0];
  }, [readings, selectedReadingId, latest]);

  const chartData = useMemo(() => {
    return rows
      .map((r) => ({
        hour: r.reading.hour,
        stock: r.totalStockM3 ?? 0,
      }))
      .filter((d) => d.stock > 0);
  }, [rows]);

  const activeIntervals = receiveRows.filter((r) =>
    RECEIVE_PIPES.some((p) => r.values[p] != null && r.values[p] !== 0),
  ).length;

  const avgReceive = activeIntervals > 0 ? totalReceiveM3 / activeIntervals : 0;

  const updateLevel = (id: string, tank: string, value: number | null) => {
    setReadings((rs) =>
      rs.map((r) => (r.id === id ? { ...r, levels: { ...r.levels, [tank]: value } } : r)),
    );
  };
  const updateHour = (id: string, hour: string) => {
    setReadings((rs) => rs.map((r) => (r.id === id ? { ...r, hour } : r)));
  };
  const addRow = () => {
    setReadings((rs) => {
      const lastHour = rs.length > 0 ? rs[rs.length - 1].hour : null;
      const nextHour = lastHour ? addHours(lastHour, 2) : "00:00";
      return [...rs, { id: makeId(), hour: nextHour, levels: emptyLevels(customTanks) }];
    });
  };
  const deleteRow = (id: string) => {
    setReadings((rs) =>
      rs.map((r) => {
        if (r.id === id) {
          return { ...r, levels: {} };
        }
        return r;
      }),
    );
    toast.success(isRtl ? "تم مسح بيانات الصف" : "Row data cleared");
  };

  const addTank = (name: string, bonusM3: number) => {
    setCustomTanks((ts) => (ts.includes(name) ? ts : [...ts, name]));
    setReadings((rs) =>
      rs.map((r) => ({ ...r, levels: { ...r.levels, [name]: r.levels[name] ?? null } })),
    );
    logAction(
      "CREATE",
      "REPORT",
      name,
      `Added custom tank: ${name} with bonus: ${bonusM3} m³`,
    ).catch(console.error);
    if (bonusM3 > 0) {
      setTankBoosts((m) => ({ ...m, [name]: bonusM3 }));
      const newTotal = TOTAL_CAPACITY_M3 + bonusCapacity + bonusM3;
      toast.success(t("toast.tankAdded", { name }), {
        description: t("toast.tankCapacityDesc", {
          bonus: bonusM3.toLocaleString("en-US"),
          total: newTotal.toLocaleString("en-US"),
        }),
      });
    } else {
      toast(t("toast.tankAdded", { name }), {
        description: t("toast.tankNoCapacityDesc"),
      });
    }
  };
  const removeTank = (name: string) => {
    setCustomTanks((ts) => ts.filter((t) => t !== name));
    setTankBoosts((m) => {
      const { [name]: _removed, ...rest } = m;
      return rest;
    });
    setReadings((rs) =>
      rs.map((r) => {
        const { [name]: _removed, ...rest } = r.levels;
        return { ...r, levels: rest };
      }),
    );
    logAction("DELETE", "REPORT", name, `Removed custom tank: ${name}`).catch(console.error);
  };

  const updateFlow = (which: "r" | "p") => (id: string, pipe: string, value: number | null) => {
    const setter = which === "r" ? setReceiveRows : setPumpRows;
    setter((rs) =>
      rs.map((r) => (r.id === id ? { ...r, values: { ...r.values, [pipe]: value } } : r)),
    );
  };
  const updateFlowHour = (which: "r" | "p") => (id: string, hour: string) => {
    const setter = which === "r" ? setReceiveRows : setPumpRows;
    setter((rs) => rs.map((r) => (r.id === id ? { ...r, hour } : r)));
  };

  const resetAll = () => {
    setReadings(defaultReadings());
    setReceiveRows(defaultFlowRows(RECEIVE_PIPES));
    setPumpRows(defaultFlowRows(PUMP_PIPES));
    logAction("DELETE", "REPORT", "ALL_STATE", "Reset whole system to defaults").catch(
      console.error,
    );
  };

  const clearReadings = () => {
    // Keep rows (and their hours) — only wipe out level inputs
    setReadings((rs) => rs.map((r) => ({ ...r, levels: emptyLevels(customTanks) })));
    logAction("UPDATE", "REPORT", "READINGS", "Cleared all tank readings").catch(console.error);
  };
  const clearReceive = () => {
    setReceiveRows(defaultFlowRows(RECEIVE_PIPES).map((r) => ({ ...r, values: {} })));
    logAction("UPDATE", "REPORT", "RECEIVE", "Cleared all receive flow readings").catch(
      console.error,
    );
  };
  const clearPump = () => {
    setPumpRows(defaultFlowRows(PUMP_PIPES).map((r) => ({ ...r, values: {} })));
    logAction("UPDATE", "REPORT", "PUMP", "Cleared all pumped flow readings").catch(console.error);
  };
  const clearBranches = () => {
    setBranches((bs) =>
      bs.map((b) => ({
        ...b,
        freeM3: null,
        pump: null,
        receive: null,
        availPumpBbl: null,
        notes: "",
      })),
    );
  };

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/20 transition-colors duration-500">
      {showSplash && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d1b2a] text-white animate-in fade-in duration-500">
          <div className="relative h-48 w-48 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
            <div className="relative z-10 text-8xl font-black tracking-tighter text-white drop-shadow-2xl">
              PS
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-widest text-[#e0e1dd]">PS-1</h1>
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-blue-500" />
            <p className="text-[10px] text-white/50 uppercase tracking-[0.2em]">
              Pumping Station One
            </p>
          </div>
        </div>
      )}

      {/* Hero */}
      <header
        className={cn(
          "sticky top-0 z-50 overflow-hidden border-b shadow-sm backdrop-blur-md transition-all duration-300",
          scrolled
            ? "bg-white/40 dark:bg-slate-950/40 py-2"
            : "bg-white/30 dark:bg-slate-950/30 py-4 md:py-6",
        )}
      >
        <div className="container relative mx-auto px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <h1
                  className={cn(
                    "font-black tracking-tighter transition-all truncate text-foreground uppercase",
                    scrolled ? "text-lg" : "text-xl md:text-3xl",
                  )}
                >
                  {activeTab === "main" && t("app.mainTitle")}
                  {activeTab === "readings" && t("app.readingsTitle")}
                  {activeTab === "diagram" && t("app.diagramTitle")}
                  {activeTab === "valves" && t("app.valvesTitle")}
                  {activeTab === "tasks" && t("app.tasksTitle")}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5 no-print shrink-0">
              <Button
                onClick={toggleTheme}
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-full hover:bg-muted"
                aria-label="تبديل النمط"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="h-4 w-4 text-orange-400" />
                ) : (
                  <Moon className="h-4 w-4 text-blue-600" />
                )}
              </Button>

              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-10 w-10 p-0 shadow-md rounded-full"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[350px]">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-primary" />
                      {t("app.title")}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="grid gap-4">
                    <div className="space-y-3">
                      <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.actions") || "إجراءات"}
                      </p>

                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          onClick={handleSaveReport}
                          variant="outline"
                          className="w-full justify-start gap-3 h-11"
                        >
                          <Save className="h-5 w-5 text-primary" /> {t("buttons.saveReport")}
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full justify-start gap-3 h-11"
                        >
                          <Link to="/reports">
                            <FileText className="h-5 w-5 text-primary" /> {t("nav.reports")}
                          </Link>
                        </Button>
                        <Button
                          onClick={() => {
                            setActiveTab("tasks");
                          }}
                          variant="outline"
                          className="w-full justify-start gap-3 h-11"
                        >
                          <TasksIcon className="h-5 w-5 text-primary" /> {t("nav.tasks")}
                        </Button>
                        <Button
                          onClick={handlePrint}
                          variant="outline"
                          className="w-full justify-start gap-3 h-11"
                        >
                          <Printer className="h-5 w-5 text-primary" /> {t("buttons.printPdf")}
                        </Button>
                        <Button
                          onClick={handleShare}
                          variant="outline"
                          className="w-full justify-start gap-3 h-11"
                        >
                          <Share2 className="h-5 w-5 text-primary" />{" "}
                          {t("common.share") || "مشاركة"}
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full justify-start gap-3 h-11 border-primary/40 bg-primary/10 hover:bg-primary/20 shadow-lg shadow-primary/10"
                        >
                          <Link to="/boc-report">
                            <FileCheck className="h-5 w-5 text-primary" />{" "}
                            {t("reports.boc_official")}
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("common.settings") || "إعدادات"}
                      </p>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">
                          {t("common.language") || "اللغة"}
                        </span>
                        <LanguageSwitcher />
                      </div>
                      <Button
                        onClick={resetAll}
                        variant="ghost"
                        className="w-full justify-start gap-3 h-11 text-destructive hover:bg-destructive/10"
                      >
                        <RotateCcw className="h-5 w-5" /> {t("buttons.resetAll")}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "transition-all duration-500",
          activeTab === "diagram"
            ? "w-full max-w-none px-0 py-0 space-y-0 pb-16"
            : "container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10 pb-32",
        )}
      >
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            hapticFeedback("light");
            setActiveTab(v as TabKey);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="w-full"
        >
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/10 dark:bg-black/10 backdrop-blur-3xl border-t border-white/20 dark:border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.1)] px-4 pb-4 no-print">
            <div className="container mx-auto max-w-xl py-2">
              <TabsList className="grid w-full grid-cols-5 h-auto gap-1 bg-transparent p-0">
                <TabsTrigger
                  value="main"
                  className="flex flex-col gap-1 py-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-none shadow-none"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{t("nav.home")}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="readings"
                  className="flex flex-col gap-1 py-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-none shadow-none"
                >
                  <ClipboardList className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{t("nav.readings")}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="diagram"
                  className="flex flex-col gap-1 py-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-none shadow-none"
                >
                  <MapIcon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{t("nav.diagram")}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="valves"
                  className="flex flex-col gap-1 py-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-none shadow-none"
                >
                  <ValveIcon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{t("nav.valves")}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="flex flex-col gap-1 py-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-none shadow-none"
                >
                  <TasksIcon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{t("nav.tasks")}</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* ===== الرئيسية ===== */}
          <TabsContent value="main" className="space-y-10 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-10"
            >
              <section className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
                <StatCard
                  label={t("stats.totalStock")}
                  value={fmt(latest?.totalStockM3)}
                  unit={t("common.m3")}
                  hint={latest ? `${fmt(latest.totalStockBarrel)} ${t("common.barrel")}` : "—"}
                  variant="primary"
                  icon={<Database className="h-5 w-5" />}
                  history={[245000, 248000, 252000, 250000, 249000, 251000, 254000]}
                />
                <StatCard
                  label={t("stats.availPump")}
                  value={fmt(latest?.availPumpM3)}
                  unit={t("common.m3")}
                  hint={latest ? `${fmt(latest.availPumpBarrel)} ${t("common.barrel")}` : "—"}
                  variant="success"
                  icon={<TrendingUp className="h-5 w-5" />}
                  history={[180000, 182000, 181000, 185000, 184000, 187000, 189000]}
                />
                <StatCard
                  label={t("stats.freeVolume")}
                  value={fmt(latest?.freeVolumeM3)}
                  unit={t("common.m3")}
                  hint={latest ? `${fmt(latest.freeVolumeBarrel)} ${t("common.barrel")}` : "—"}
                  variant="warning"
                  icon={<Gauge className="h-5 w-5" />}
                  isCritical={latest && latest.freeVolumeM3 < 50000}
                  history={[65000, 62000, 60000, 58000, 55000, 52000, 51000]}
                />
                <StatCard
                  label={t("stats.fillRate")}
                  value={fillPct.toFixed(1)}
                  unit="%"
                  variant="accent"
                  icon={<Droplets className="h-5 w-5" />}
                  history={[75, 76, 75.5, 77, 78, 77.5, 79]}
                />
                <StatCard
                  label={t("stats.accumReceive")}
                  value={fmt(totalReceiveM3)}
                  unit={t("common.m3")}
                  hint={`${fmt(totalReceiveM3 * M3_TO_BARREL)} ${t("common.barrel")}`}
                  variant="success"
                  icon={<ArrowDownToLine className="h-5 w-5" />}
                />
                <StatCard
                  label={t("stats.accumPump")}
                  value={fmt(totalPumpM3)}
                  unit={t("common.m3")}
                  hint={`${fmt(totalPumpM3 * M3_TO_BARREL)} ${t("common.barrel")}`}
                  variant="primary"
                  icon={<ArrowUpFromLine className="h-5 w-5" />}
                />
              </section>

              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                      {t("tanks.currentStatus")}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Linked Reading Hour Selector */}
                    <div className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs shadow-sm">
                      <span className="text-muted-foreground font-semibold text-[11px]">
                        {isRtl ? "القراءة المرتبطة:" : "Linked Row:"}
                      </span>
                      <select
                        value={activeReading?.id ?? ""}
                        onChange={(e) => setSelectedReadingId(e.target.value)}
                        className="h-6 rounded bg-transparent font-bold text-foreground text-xs focus:outline-none cursor-pointer"
                        title={isRtl ? "تحديد وقت القراءة التي يتم تحديثها في الجدول" : "Select reading row to update"}
                      >
                        {readings.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.hour}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8">
                  {VISIBLE_TANKS.map((tk) => {
                    const maxLvl = tk.startsWith("K") || tk === "R3" ? 1400 : 1800;
                    return (
                      <TankCard
                        key={tk}
                        tank={tk}
                        level={activeReading?.levels[tk] ?? null}
                        diff={latest?.diffs[tk] ?? null}
                        maxLevel={maxLvl}
                        onLevelChange={(tankName, newLvl) => {
                          if (activeReading) {
                            updateLevel(activeReading.id, tankName, newLvl);
                          }
                        }}
                      />
                    );
                  })}
                  {customTanks.map((tk) => (
                    <TankCard
                      key={tk}
                      tank={tk}
                      custom
                      level={activeReading?.levels[tk] ?? null}
                      diff={latest?.diffs[tk] ?? null}
                      maxLevel={1800}
                      onLevelChange={(tankName, newLvl) => {
                        if (activeReading) {
                          updateLevel(activeReading.id, tankName, newLvl);
                        }
                      }}
                    />
                  ))}
                </div>
              </section>

              <section>
                <TrendsPanel reports={reports} />
              </section>

              <section>
                <StockChart rows={rows} />
              </section>

              <section className="print-branches">
                <BranchesTable
                  rows={branches}
                  onChange={updateBranch}
                  onClearAll={clearBranches}
                  ps1={{
                    availPumpM3: latest?.availPumpM3 ?? null,
                    freeVolumeM3: latest?.freeVolumeM3 ?? null,
                    totalReceiveM3: lastIntervalReceiveM3,
                    totalPumpM3: lastIntervalPumpM3,
                  }}
                />
              </section>

              <section className="no-print">
                <ShiftHandoff />
              </section>
            </motion.div>
          </TabsContent>

          {/* ===== القراءات ===== */}
          <TabsContent value="readings" className="space-y-10 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-10"
            >
              <section>
                <ReadingsTable
                  rows={rows}
                  customTanks={customTanks}
                  onChangeLevel={updateLevel}
                  onChangeHour={updateHour}
                  onDelete={deleteRow}
                  onAdd={addRow}
                  onAddTank={addTank}
                  onRemoveTank={removeTank}
                  onClearAll={clearReadings}
                  labels={pipeLabels}
                  onRenameLabel={renameLabel}
                />
              </section>

              <section>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="h-5 w-5 text-success" />
                    <h2 className="text-lg font-bold text-foreground">{t("tables.oilReceived")}</h2>
                  </div>
                  <label className="flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs no-print">
                    <span className="text-muted-foreground">{t("tables.balancingStation")}</span>
                    <select
                      value={balancedPipe}
                      onChange={(e) => setBalancedPipe(e.target.value)}
                      className="h-7 rounded border bg-background px-1.5 text-xs font-semibold text-foreground"
                    >
                      <option value="">{t("tables.noBalancing")}</option>
                      {RECEIVE_PIPES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <FlowTable
                  title={t("tables.readingsTitle")}
                  pipes={RECEIVE_PIPES}
                  rows={receiveComputed}
                  onChange={updateFlow("r")}
                  onChangeHour={updateFlowHour("r")}
                  accentClass="text-success"
                  readOnlyPipes={balancedPipe ? [balancedPipe] : []}
                  onClearAll={clearReceive}
                  labels={pipeLabels}
                  onRenameLabel={renameLabel}
                />
              </section>

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <ArrowUpFromLine className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">{t("tables.oilPumped")}</h2>
                </div>
                <FlowTable
                  title={t("tables.oilPumped")}
                  pipes={PUMP_PIPES}
                  rows={pumpComputed}
                  onChange={updateFlow("p")}
                  onChangeHour={updateFlowHour("p")}
                  accentClass="text-primary"
                  onClearAll={clearPump}
                  labels={pipeLabels}
                  onRenameLabel={renameLabel}
                />
              </section>

              <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
                <h3 className="text-base font-bold text-foreground">{t("calculations.title")}</h3>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <div
                    className="rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed"
                    dir="ltr"
                  >
                    <div className="text-muted-foreground"># {t("calculations.totalStock")}</div>
                    <div>stock_m3 = (Σ levels × 43) − (600 × active_tanks)</div>
                    <div>stock_bbl = stock_m3 × 6.2898</div>
                  </div>
                  <div
                    className="rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed"
                    dir="ltr"
                  >
                    <div className="text-muted-foreground"># {t("calculations.pumping")}</div>
                    <div>unavail_pump = 70,000 + (10,000 × extra_tanks)</div>
                    <div>avail_pump = stock_m3 − unavail_pump</div>
                    <div>free_volume = total_capacity − stock_m3</div>
                  </div>
                  <div
                    className="rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed"
                    dir="ltr"
                  >
                    <div className="text-muted-foreground"># {t("calculations.balance")}</div>
                    <div>
                      {balancedPipe || "Balance"} = Σ pump + (Σ Δlevels × 43) − Σ other receive
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          </TabsContent>

          {/* ===== المخطط ===== */}
          <TabsContent value="diagram" className="m-0 p-0 border-none outline-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full h-full"
            >
              <DiagramPanel initialSearch={activeTab === "diagram" ? diagramSearch : null} />
            </motion.div>
          </TabsContent>

          {/* ===== الصمامات ===== */}
          <TabsContent value="valves" className="mt-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <ValvesPanel
                onLocateOnDiagram={(q) => {
                  setDiagramSearch({ query: q, id: Math.random().toString(36) });
                  setActiveTab("diagram");
                  toast.success(`جاري البحث عن "${q}" في المخطط`);
                }}
              />
            </motion.div>
          </TabsContent>

          {/* ===== المهام ===== */}
          <TabsContent value="tasks" className="mt-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <TasksPanel />
            </motion.div>
          </TabsContent>
        </Tabs>

        <footer className="pt-8 pb-12 text-center border-t border-white/10 mt-12 bg-white/5 dark:bg-black/20 backdrop-blur-md rounded-t-[3rem] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative z-10">
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 mb-1">
              {t("footer.stationName")}
            </div>
            <div className="h-px w-12 bg-primary/30 mx-auto mb-4" />
            <div className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground/80 to-foreground/40 tracking-wider">
              {t("footer.designed") || "Eng. Mokhalad Ahmed"}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
