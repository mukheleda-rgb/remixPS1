import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, subDays, startOfMonth } from "date-fns";
import {
  FileText,
  Download,
  Printer,
  Share2,
  FileSpreadsheet,
  SlidersHorizontal,
  Calendar,
  Layers,
  Droplet,
  Building2,
  CheckSquare,
  Sparkles,
  Eye,
  Save,
  RotateCcw,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Clock,
  Zap,
  Tag,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

import { useLocalStorageState } from "@/hooks/use-local-storage";
import { hapticFeedback } from "@/lib/haptics";
import {
  Reading,
  FlowRow,
  defaultReadings,
  defaultFlowRows,
  compute,
  computeFlow,
  flowGrandTotal,
  M3_TO_BARREL,
  TOTAL_CAPACITY_M3,
  VISIBLE_TANKS,
  RECEIVE_PIPES,
  PUMP_PIPES,
  DEFAULT_HOURS,
  fmt,
} from "@/lib/calculations";
import { useBranches } from "@/components/BranchesTable";
import { addReport, type ReportSnapshot } from "@/lib/reports";
import {
  CustomReportFilter,
  CustomReportComputedData,
  MaterialType,
  MATERIAL_SPECS,
  ReportTimePreset,
  ShiftType,
  WarehouseScope,
} from "@/lib/custom-report-types";
import {
  exportCustomReportCsv,
  exportCustomReportXlsx,
  generateCustomReportPdf,
} from "@/lib/custom-report-exporter";

interface CustomReportBuilderProps {
  onReportSaved?: () => void;
}

export function CustomReportBuilder({ onReportSaved }: CustomReportBuilderProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Load operational data
  const [readings] = useLocalStorageState<Reading[]>(
    "ps1-readings",
    defaultReadings()
  );
  const [customTanks] = useLocalStorageState<string[]>(
    "ps1-custom-tanks",
    []
  );
  const [tankBoosts] = useLocalStorageState<Record<string, number>>(
    "ps1-tank-boosts",
    {}
  );
  const [receiveRows] = useLocalStorageState<FlowRow[]>(
    "ps1-receive",
    defaultFlowRows(RECEIVE_PIPES)
  );
  const [pumpRows] = useLocalStorageState<FlowRow[]>(
    "ps1-pump",
    defaultFlowRows(PUMP_PIPES)
  );
  const [balancedPipe] = useLocalStorageState<string>(
    "ps1-balanced-pipe",
    "WQ"
  );
  const [pipeLabels] = useLocalStorageState<Record<string, string>>(
    "ps1-pipe-labels",
    {}
  );
  const [branches] = useBranches();

  const allAvailableTanks = useMemo(() => [...VISIBLE_TANKS, ...customTanks], [customTanks]);

  // Filter & criteria state
  const [filter, setFilter] = useState<CustomReportFilter>({
    timePreset: "today",
    startDate: todayStr,
    endDate: todayStr,
    shift: "all",
    selectedHours: DEFAULT_HOURS,
    material: "basrah_heavy",
    warehouseScope: "all_ps1",
    selectedTanks: allAvailableTanks,
    selectedReceivePipes: [...RECEIVE_PIPES],
    selectedPumpPipes: [...PUMP_PIPES],
    selectedBranches: ["PS1", "TUBA", "ZUBAIR", "RUMAILA", "FAO"],
    reportTitle: isRtl ? "تقرير الحركة والموازنة اليومية للمستودع" : "Daily Depot Movement & Stock Balance Report",
    referenceNo: `REP-${format(new Date(), "yyyyMMdd")}-PS1`,
    preparedBy: isRtl ? "مهندس تشغيل الوردية" : "Duty Operations Engineer",
    shiftSupervisor: isRtl ? "مشرف الوجبة / المحطة" : "Shift Operations Supervisor",
    department: isRtl ? "شعبة إدارة وتشغيل المستودعات والخزانات" : "Terminal & Tank Farm Operations Dept.",
    notes: isRtl
      ? "تمت مطابقة قراءات المناسيب والتدفقات اللوجستية وفق معايير التشغيل القياسية دون تسجيل أي حيود أو تسريب."
      : "Tank ullage and pipeline flows have been reconciled according to standard operating procedures.",
    units: "both",
    includeKpis: true,
    includeTankLevels: true,
    includeFlowTables: true,
    includeBranches: true,
    includeCharts: true,
    includeMaterialSpecs: true,
    includeSignatures: true,
  });

  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder");
  const [isExporting, setIsExporting] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(true);

  // Quick preset templates
  const applyTemplate = (type: "daily_balance" | "tank_audit" | "export_pump" | "wq_inflow" | "shift_handover") => {
    hapticFeedback("medium");
    switch (type) {
      case "daily_balance":
        setFilter((prev) => ({
          ...prev,
          timePreset: "today",
          shift: "all",
          selectedHours: DEFAULT_HOURS,
          material: "all",
          warehouseScope: "all_ps1",
          selectedTanks: allAvailableTanks,
          selectedReceivePipes: [...RECEIVE_PIPES],
          selectedPumpPipes: [...PUMP_PIPES],
          reportTitle: isRtl ? "تقرير الموازنة اليومية الشامل" : "Comprehensive Daily Balance Report",
          includeKpis: true,
          includeTankLevels: true,
          includeFlowTables: true,
          includeBranches: true,
          includeCharts: true,
        }));
        toast.success(isRtl ? "تم تطبيق قالب الموازنة اليومية" : "Applied Daily Balance Template");
        break;

      case "tank_audit":
        setFilter((prev) => ({
          ...prev,
          timePreset: "today",
          warehouseScope: "all_ps1",
          selectedTanks: allAvailableTanks,
          reportTitle: isRtl ? "تقرير جرد ومناسيب مجمع الخزانات" : "Tank Farm Inventory & Ullage Audit",
          includeKpis: true,
          includeTankLevels: true,
          includeFlowTables: false,
          includeBranches: false,
          includeCharts: true,
        }));
        toast.success(isRtl ? "تم تطبيق قالب جرد الخزانات" : "Applied Tank Audit Template");
        break;

      case "export_pump":
        setFilter((prev) => ({
          ...prev,
          timePreset: "today",
          selectedPumpPipes: ["FAW", "STRATIGIC PIPE"],
          reportTitle: isRtl ? "تقرير ضخ وتصدير خطوط الفاو والاستراتيجي" : "Faw & Strategic Pipeline Export Report",
          includeKpis: true,
          includeTankLevels: false,
          includeFlowTables: true,
          includeBranches: true,
          includeCharts: true,
        }));
        toast.success(isRtl ? "تم تطبيق قالب ضخ التصدير" : "Applied Export Pumping Template");
        break;

      case "wq_inflow":
        setFilter((prev) => ({
          ...prev,
          timePreset: "today",
          material: "wq_crude",
          selectedReceivePipes: ["WQ", "N. RUMAILA"],
          reportTitle: isRtl ? "تقرير استلام نفط غرب القرنة والرميلة" : "West Qurna & Rumaila Crude Inflow Report",
          includeKpis: true,
          includeTankLevels: true,
          includeFlowTables: true,
          includeBranches: false,
          includeCharts: true,
        }));
        toast.success(isRtl ? "تم تطبيق قالب استلام غرب القرنة" : "Applied WQ Inflow Template");
        break;

      case "shift_handover":
        setFilter((prev) => ({
          ...prev,
          timePreset: "today",
          shift: "day",
          selectedHours: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
          reportTitle: isRtl ? "تقرير جرد وتسليم الوردية التشغيلية" : "Shift Handover Operations Report",
          includeKpis: true,
          includeTankLevels: true,
          includeFlowTables: true,
          includeBranches: true,
          includeCharts: true,
          includeSignatures: true,
        }));
        toast.success(isRtl ? "تم تطبيق قالب تسليم الوردية" : "Applied Shift Handover Template");
        break;
    }
  };

  // Time preset handlers
  const handleTimePresetChange = (preset: ReportTimePreset) => {
    hapticFeedback("light");
    let start = todayStr;
    let end = todayStr;
    if (preset === "last24h" || preset === "today") {
      start = todayStr;
      end = todayStr;
    } else if (preset === "last7days") {
      start = format(subDays(new Date(), 7), "yyyy-MM-dd");
      end = todayStr;
    } else if (preset === "thisMonth") {
      start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      end = todayStr;
    }
    setFilter((prev) => ({
      ...prev,
      timePreset: preset,
      startDate: start,
      endDate: end,
    }));
  };

  // Shift handler
  const handleShiftChange = (shift: ShiftType) => {
    hapticFeedback("light");
    let hours = DEFAULT_HOURS;
    if (shift === "day") {
      hours = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];
    } else if (shift === "night") {
      hours = ["18:00", "20:00", "22:00", "24:00", "02:00", "04:00", "06:00"];
    }
    setFilter((prev) => ({
      ...prev,
      shift,
      selectedHours: hours,
    }));
  };

  // Warehouse scope handler
  const handleWarehouseScopeChange = (scope: WarehouseScope) => {
    hapticFeedback("light");
    let tanks = allAvailableTanks;
    if (scope === "north_farm") {
      tanks = allAvailableTanks.filter((t) => ["B1", "B2", "K1", "K2"].includes(t));
    } else if (scope === "south_farm") {
      tanks = allAvailableTanks.filter((t) => ["K3", "K4", "R1", "R2", "R3", "R4"].includes(t));
    } else if (scope === "custom_tanks") {
      tanks = customTanks.length > 0 ? customTanks : allAvailableTanks.slice(0, 4);
    }
    setFilter((prev) => ({
      ...prev,
      warehouseScope: scope,
      selectedTanks: tanks,
    }));
  };

  // Toggle individual tank
  const toggleTank = (tank: string) => {
    hapticFeedback("light");
    setFilter((prev) => {
      const exists = prev.selectedTanks.includes(tank);
      const next = exists ? prev.selectedTanks.filter((t) => t !== tank) : [...prev.selectedTanks, tank];
      return {
        ...prev,
        selectedTanks: next.length > 0 ? next : [tank], // keep at least 1
      };
    });
  };

  // Toggle individual receive pipe
  const toggleReceivePipe = (pipe: string) => {
    hapticFeedback("light");
    setFilter((prev) => {
      const exists = prev.selectedReceivePipes.includes(pipe);
      const next = exists ? prev.selectedReceivePipes.filter((p) => p !== pipe) : [...prev.selectedReceivePipes, pipe];
      return { ...prev, selectedReceivePipes: next };
    });
  };

  // Toggle individual pump pipe
  const togglePumpPipe = (pipe: string) => {
    hapticFeedback("light");
    setFilter((prev) => {
      const exists = prev.selectedPumpPipes.includes(pipe);
      const next = exists ? prev.selectedPumpPipes.filter((p) => p !== pipe) : [...prev.selectedPumpPipes, pipe];
      return { ...prev, selectedPumpPipes: next };
    });
  };

  // ==========================================
  // COMPUTED REPORT DATA ENGINE
  // ==========================================
  const computedData: CustomReportComputedData = useMemo(() => {
    const bonusCapacity = Object.values(tankBoosts).reduce((a, b) => a + b, 0);
    const totalCapM3 = TOTAL_CAPACITY_M3 + bonusCapacity;

    // Filter readings by selected hours
    const filteredReadings = readings.filter((r) => filter.selectedHours.includes(r.hour));

    // Base calculation
    const rows = compute(readings, customTanks, bonusCapacity);

    // Auto-balance calculation
    const balancedValues = (() => {
      if (!balancedPipe) return null;
      const otherReceive = RECEIVE_PIPES.filter((p) => p !== balancedPipe);
      return receiveRows.map((_, idx) => {
        const curComp = rows[idx + 1];
        const pumpSum = PUMP_PIPES.reduce((a, p) => a + (pumpRows[idx]?.values[p] ?? 0), 0);
        const otherRecvSum = otherReceive.reduce((a, p) => a + (receiveRows[idx]?.values[p] ?? 0), 0);

        const prevReading = readings[idx];
        const curReading = readings[idx + 1];
        let levelDiffSum = 0;
        if (prevReading && curReading) {
          for (const k of allAvailableTanks) {
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
      receiveRows,
      RECEIVE_PIPES,
      balancedPipe && balancedValues ? { [balancedPipe]: balancedValues } : undefined
    );
    const pumpComputed = computeFlow(pumpRows, PUMP_PIPES);

    // Filter flow rows by selected hours
    const filteredReceiveRows = receiveComputed.filter((r) => filter.selectedHours.includes(r.hour));
    const filteredPumpRows = pumpComputed.filter((r) => filter.selectedHours.includes(r.hour));

    // Total flows in selected scope
    const totalReceiveM3 = filteredReceiveRows.reduce((sum, r) => {
      return (
        sum +
        filter.selectedReceivePipes.reduce((pipeSum, p) => {
          return pipeSum + (r.values[p] ?? 0);
        }, 0)
      );
    }, 0);

    const totalPumpM3 = filteredPumpRows.reduce((sum, r) => {
      return (
        sum +
        filter.selectedPumpPipes.reduce((pipeSum, p) => {
          return pipeSum + (r.values[p] ?? 0);
        }, 0)
      );
    }, 0);

    // Breakdown per pipe
    const receiveBreakdown: Record<string, number> = {};
    filter.selectedReceivePipes.forEach((p) => {
      receiveBreakdown[p] = filteredReceiveRows.reduce((acc, r) => acc + (r.values[p] ?? 0), 0);
    });

    const pumpBreakdown: Record<string, number> = {};
    filter.selectedPumpPipes.forEach((p) => {
      pumpBreakdown[p] = filteredPumpRows.reduce((acc, r) => acc + (r.values[p] ?? 0), 0);
    });

    // Stock calculations for selected tanks
    const latestReading = [...filteredReadings].reverse().find((r) =>
      filter.selectedTanks.some((t) => r.levels[t] != null)
    ) || filteredReadings[filteredReadings.length - 1];

    const firstReading = filteredReadings.find((r) =>
      filter.selectedTanks.some((t) => r.levels[t] != null)
    ) || filteredReadings[0];

    const currentStockM3 = latestReading
      ? filter.selectedTanks.reduce((acc, t) => {
          const lvl = latestReading.levels[t];
          return acc + (lvl != null ? lvl * 43 : 0);
        }, 0)
      : 0;

    const initialStockM3 = firstReading
      ? filter.selectedTanks.reduce((acc, t) => {
          const lvl = firstReading.levels[t];
          return acc + (lvl != null ? lvl * 43 : 0);
        }, 0)
      : 0;

    const netStockChangeM3 = currentStockM3 - initialStockM3;
    const availPumpM3 = Math.max(0, currentStockM3 - 7000);
    const freeVolumeM3 = Math.max(0, totalCapM3 - currentStockM3);
    const fillPercentage = totalCapM3 > 0 ? (currentStockM3 / totalCapM3) * 100 : 0;

    // Tank levels breakdown
    const tankLevelsBreakdown = filter.selectedTanks.map((t) => {
      const lvl = latestReading?.levels[t] ?? null;
      const stockM3 = lvl != null ? lvl * 43 : 0;
      const capM3 = tankBoosts[t] ? tankBoosts[t] : 51400; // estimated per tank
      const fillPct = capM3 > 0 ? (stockM3 / capM3) * 100 : 0;
      let status: "active" | "standby" | "isolated" | "empty" = "active";
      if (lvl === null) status = "standby";
      else if (lvl < 100) status = "empty";
      return {
        tank: t,
        levelCm: lvl,
        stockM3,
        stockBbl: stockM3 * M3_TO_BARREL,
        capacityM3: capM3,
        fillPct: Math.min(100, fillPct),
        status,
      };
    });

    // Chart dataset
    const hourlyFlowChartData = filteredReceiveRows.map((r, idx) => {
      const pRow = filteredPumpRows[idx];
      const rec = filter.selectedReceivePipes.reduce((sum, p) => sum + (r.values[p] ?? 0), 0);
      const pump = filter.selectedPumpPipes.reduce((sum, p) => sum + (pRow?.values[p] ?? 0), 0);
      const matchingReading = filteredReadings.find((rd) => rd.hour === r.hour);
      const stock = matchingReading
        ? filter.selectedTanks.reduce((acc, t) => acc + ((matchingReading.levels[t] ?? 0) * 43), 0)
        : 0;

      return {
        hour: r.hour,
        receiveM3: rec,
        pumpM3: pump,
        netChangeM3: rec - pump,
        stockM3: stock,
      };
    });

    const materialSpec = MATERIAL_SPECS[filter.material] || MATERIAL_SPECS.basrah_heavy;

    return {
      reportDate: format(new Date(), "yyyy/MM/dd"),
      generatedAt: format(new Date(), "yyyy/MM/dd HH:mm"),
      filter,
      materialSpec,
      filteredReadings,
      filteredReceiveRows,
      filteredPumpRows,
      filteredBranches: branches.filter((b) => filter.selectedBranches.includes(b.name)),
      initialStockM3,
      currentStockM3,
      netStockChangeM3,
      totalReceiveM3,
      totalPumpM3,
      availPumpM3,
      freeVolumeM3,
      totalCapacityM3: totalCapM3,
      fillPercentage,
      activeTanksCount: tankLevelsBreakdown.filter((t) => t.levelCm != null).length,
      currentStockBbl: currentStockM3 * M3_TO_BARREL,
      totalReceiveBbl: totalReceiveM3 * M3_TO_BARREL,
      totalPumpBbl: totalPumpM3 * M3_TO_BARREL,
      availPumpBbl: availPumpM3 * M3_TO_BARREL,
      receiveBreakdown,
      pumpBreakdown,
      tankLevelsBreakdown,
      hourlyFlowChartData,
    };
  }, [
    readings,
    receiveRows,
    pumpRows,
    branches,
    customTanks,
    tankBoosts,
    balancedPipe,
    filter,
    allAvailableTanks,
  ]);

  // Export handlers
  const handleExportCsv = () => {
    hapticFeedback("medium");
    try {
      exportCustomReportCsv(computedData);
      toast.success(isRtl ? "تم تصدير التقرير بصيغة CSV بنجاح" : "Report CSV exported successfully");
    } catch (e) {
      toast.error(isRtl ? "خطأ أثناء تصدير CSV" : "Error exporting CSV");
    }
  };

  const handleExportXlsx = async () => {
    hapticFeedback("medium");
    try {
      await exportCustomReportXlsx(computedData);
      toast.success(isRtl ? "تم تصدير التقرير بصيغة Excel (XLSX) بنجاح" : "Report Excel exported successfully");
    } catch (e) {
      toast.error(isRtl ? "خطأ أثناء تصدير Excel" : "Error exporting Excel");
    }
  };

  const handleExportPdf = async (mode: "download" | "share" = "download") => {
    hapticFeedback("medium");
    setIsExporting(true);
    const toastId = toast.loading(isRtl ? "جاري إنشاء وتنسيق ملف PDF..." : "Generating PDF report...");
    try {
      await generateCustomReportPdf(computedData, mode);
      toast.success(isRtl ? "تم إنشاء تقرير PDF بنجاح" : "PDF Report created successfully", { id: toastId });
    } catch (e) {
      toast.error(isRtl ? "حدث خطأ أثناء إنشاء PDF" : "Error creating PDF", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    hapticFeedback("light");
    window.print();
  };

  const handleSaveToHistory = async () => {
    hapticFeedback("medium");
    const snapshot: ReportSnapshot = {
      id: `custom-${Date.now()}`,
      name: `${filter.reportTitle} - ${filter.referenceNo || format(new Date(), "yyyy/MM/dd")}`,
      createdAt: Date.now(),
      readings: computedData.filteredReadings,
      customTanks,
      tankBoosts,
      receiveRows: computedData.filteredReceiveRows,
      pumpRows: computedData.filteredPumpRows,
      branches: computedData.filteredBranches,
      balancedPipe,
      pipeLabels,
    };
    await addReport(snapshot);
    toast.success(isRtl ? "تم حفظ التقرير في الأرشيف بنجاح" : "Report snapshot saved to history archive");
    if (onReportSaved) onReportSaved();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">
                {isRtl ? "مُنشئ التقارير المخصصة والتحليلية" : "Custom Operations Report Builder"}
              </h2>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {isRtl ? "تخصيص كامل" : "Full Customization"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRtl
                ? "تحديد معايير الفترة الزمنية، نوع المادة، المستودع والخزانات مع تصدير بصيغ CSV و Excel و PDF"
                : "Configure date range, material blend, warehouse units, and export in CSV, Excel, or PDF"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Preset Menu */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="gap-1.5"
          >
            {showConfigDrawer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isRtl ? (showConfigDrawer ? "إخفاء لوحة المعايير" : "إظهار لوحة المعايير") : (showConfigDrawer ? "Hide Criteria" : "Show Criteria")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportXlsx}
            className="gap-1.5 border-blue-600/30 text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
          >
            <Download className="h-4 w-4" /> Excel (XLSX)
          </Button>

          <Button
            size="sm"
            onClick={() => handleExportPdf("download")}
            disabled={isExporting}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <FileText className="h-4 w-4" /> {isRtl ? "تصدير PDF" : "Export PDF"}
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" /> {isRtl ? "طباعة" : "Print"}
          </Button>

          <Button variant="outline" size="sm" onClick={() => handleExportPdf("share")} className="gap-1.5">
            <Share2 className="h-4 w-4" /> {isRtl ? "مشاركة" : "Share"}
          </Button>

          <Button variant="outline" size="sm" onClick={handleSaveToHistory} className="gap-1.5">
            <Save className="h-4 w-4" /> {isRtl ? "حفظ التقرير" : "Save Report"}
          </Button>
        </div>
      </div>

      {/* Quick Templates Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3 no-print">
        <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          {isRtl ? "قوالب تقارير جاهزة سريعة:" : "Quick Report Templates:"}
        </span>
        <button
          onClick={() => applyTemplate("daily_balance")}
          className="rounded-lg bg-card px-2.5 py-1 text-xs font-medium border hover:border-primary/50 transition-all"
        >
          📊 {isRtl ? "الموازنة اليومية الشاملة" : "Full Daily Balance"}
        </button>
        <button
          onClick={() => applyTemplate("tank_audit")}
          className="rounded-lg bg-card px-2.5 py-1 text-xs font-medium border hover:border-primary/50 transition-all"
        >
          🛢️ {isRtl ? "جرد ومناسيب الخزانات" : "Tank Farm Audit"}
        </button>
        <button
          onClick={() => applyTemplate("export_pump")}
          className="rounded-lg bg-card px-2.5 py-1 text-xs font-medium border hover:border-primary/50 transition-all"
        >
          🚀 {isRtl ? "ضخ وتصدير الفاو والاستراتيجي" : "Faw & Strategic Export"}
        </button>
        <button
          onClick={() => applyTemplate("wq_inflow")}
          className="rounded-lg bg-card px-2.5 py-1 text-xs font-medium border hover:border-primary/50 transition-all"
        >
          ⚡ {isRtl ? "استلام خام غرب القرنة" : "WQ Inflow Report"}
        </button>
        <button
          onClick={() => applyTemplate("shift_handover")}
          className="rounded-lg bg-card px-2.5 py-1 text-xs font-medium border hover:border-primary/50 transition-all"
        >
          📋 {isRtl ? "تسليم واستلام الوردية" : "Shift Handover"}
        </button>
      </div>

      {/* CRITERIA BUILDER CONTROLS PANEL (COLLAPSIBLE) */}
      <AnimatePresence>
        {showConfigDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden no-print"
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Card 1: Time Period & Shifts */}
              <Card className="p-4 space-y-4 shadow-sm border-t-4 border-t-blue-500">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-foreground">
                    {isRtl ? "1. الفترة الزمنية والورديات" : "1. Time Period & Shift"}
                  </h3>
                </div>

                {/* Presets */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{isRtl ? "الفترة المحددة" : "Preset Period"}</Label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(
                      [
                        { id: "today", labelAr: "اليوم", labelEn: "Today" },
                        { id: "last24h", labelAr: "24 ساعة", labelEn: "24 Hours" },
                        { id: "last7days", labelAr: "7 أيام", labelEn: "7 Days" },
                        { id: "thisMonth", labelAr: "هذا الشهر", labelEn: "This Month" },
                        { id: "custom", labelAr: "مخصص", labelEn: "Custom" },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleTimePresetChange(p.id)}
                        className={`rounded-md px-2 py-1.5 font-medium transition-all ${
                          filter.timePreset === p.id
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        {isRtl ? p.labelAr : p.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">{isRtl ? "من تاريخ" : "From Date"}</Label>
                    <Input
                      type="date"
                      value={filter.startDate}
                      onChange={(e) => setFilter({ ...filter, startDate: e.target.value, timePreset: "custom" })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">{isRtl ? "إلى تاريخ" : "To Date"}</Label>
                    <Input
                      type="date"
                      value={filter.endDate}
                      onChange={(e) => setFilter({ ...filter, endDate: e.target.value, timePreset: "custom" })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Shift Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{isRtl ? "تصفية الوردية" : "Shift Filter"}</Label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(
                      [
                        { id: "all", labelAr: "كل اليوم (24h)", labelEn: "All Day" },
                        { id: "day", labelAr: "صباحية (Day)", labelEn: "Day Shift" },
                        { id: "night", labelAr: "مسائية (Night)", labelEn: "Night Shift" },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleShiftChange(s.id)}
                        className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                          filter.shift === s.id
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isRtl ? s.labelAr : s.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hourly Selection Chips */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{isRtl ? "ساعات القراءة المشمولة" : "Included Hours"}</span>
                    <button
                      onClick={() =>
                        setFilter((prev) => ({
                          ...prev,
                          selectedHours: prev.selectedHours.length === DEFAULT_HOURS.length ? [] : DEFAULT_HOURS,
                        }))
                      }
                      className="text-primary hover:underline text-[10px]"
                    >
                      {filter.selectedHours.length === DEFAULT_HOURS.length
                        ? (isRtl ? "إلغاء الكل" : "Clear")
                        : (isRtl ? "تحديد الكل" : "Select All")}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {DEFAULT_HOURS.map((h) => {
                      const isSel = filter.selectedHours.includes(h);
                      return (
                        <button
                          key={h}
                          onClick={() => {
                            hapticFeedback("light");
                            setFilter((prev) => ({
                              ...prev,
                              selectedHours: isSel
                                ? prev.selectedHours.filter((hr) => hr !== h)
                                : [...prev.selectedHours, h].sort(),
                            }));
                          }}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium transition-all ${
                            isSel
                              ? "bg-blue-500/20 border border-blue-500 text-blue-700 dark:text-blue-300 font-bold"
                              : "bg-muted/60 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Card 2: Material & Product Type */}
              <Card className="p-4 space-y-4 shadow-sm border-t-4 border-t-amber-500">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Droplet className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-foreground">
                    {isRtl ? "2. نوع المادة والنفط الخام" : "2. Material & Product Spec"}
                  </h3>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{isRtl ? "اختر نوع المادة" : "Select Product"}</Label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {(Object.keys(MATERIAL_SPECS) as MaterialType[]).map((mKey) => {
                      const spec = MATERIAL_SPECS[mKey];
                      const isSel = filter.material === mKey;
                      return (
                        <button
                          key={mKey}
                          onClick={() => {
                            hapticFeedback("light");
                            setFilter({ ...filter, material: mKey });
                          }}
                          className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${
                            isSel
                              ? "border-amber-500 bg-amber-500/10 font-bold shadow-xs"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 w-full">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: spec.color }}
                            />
                            <span className="truncate text-xs font-semibold">
                              {isRtl ? spec.nameAr.split("(")[0] : spec.nameEn.split("(")[0]}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {spec.apiGravity} °API | {spec.density} kg/m³
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Material Specs preview */}
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRtl ? "الكثافة النوعية (API):" : "API Gravity:"}</span>
                    <span className="font-mono font-bold">{computedData.materialSpec.apiGravity} °API</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRtl ? "الكثافة الحجمية:" : "Density:"}</span>
                    <span className="font-mono font-bold">{computedData.materialSpec.density} kg/m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRtl ? "نسبة الكبريت:" : "Sulfur %:"}</span>
                    <span className="font-mono font-bold">{computedData.materialSpec.sulfurPct}%</span>
                  </div>
                </div>
              </Card>

              {/* Card 3: Warehouse, Tanks & Pipelines */}
              <Card className="p-4 space-y-4 shadow-sm border-t-4 border-t-emerald-500">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Building2 className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-foreground">
                    {isRtl ? "3. المستودع ونطاق الخزانات والخطوط" : "3. Warehouse & Tanks Scope"}
                  </h3>
                </div>

                {/* Warehouse scope selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{isRtl ? "المستودع / المجمع" : "Depot / Farm"}</Label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {(
                      [
                        { id: "all_ps1", labelAr: "مستودع PS1 بالكامل", labelEn: "All PS1 Depot" },
                        { id: "north_farm", labelAr: "مجمع الشمال (North)", labelEn: "North Farm" },
                        { id: "south_farm", labelAr: "مجمع الجنوب (South)", labelEn: "South Farm" },
                        { id: "custom_tanks", labelAr: "خزانات مخصصة", labelEn: "Custom Tanks" },
                      ] as const
                    ).map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => handleWarehouseScopeChange(ws.id)}
                        className={`rounded-md p-1.5 text-xs font-medium border text-center transition-all ${
                          filter.warehouseScope === ws.id
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold"
                            : "border-border bg-muted/40 hover:bg-muted text-foreground"
                        }`}
                      >
                        {isRtl ? ws.labelAr : ws.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tanks checklist */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{isRtl ? "الخزانات المشمولة:" : "Included Tanks:"}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {filter.selectedTanks.length} / {allAvailableTanks.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {allAvailableTanks.map((t) => {
                      const isSel = filter.selectedTanks.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => toggleTank(t)}
                          className={`rounded px-2 py-0.5 text-xs font-mono font-bold transition-all ${
                            isSel
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pipelines selection */}
                <div className="space-y-2 pt-1 border-t">
                  <div className="text-[11px] font-bold text-muted-foreground">
                    {isRtl ? "خطوط الاستلام والضخ المشمولة:" : "Pipelines Included:"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {RECEIVE_PIPES.map((p) => {
                      const isSel = filter.selectedReceivePipes.includes(p);
                      return (
                        <button
                          key={p}
                          onClick={() => toggleReceivePipe(p)}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-all ${
                            isSel
                              ? "bg-blue-500/15 border border-blue-500 text-blue-700 dark:text-blue-300"
                              : "bg-muted text-muted-foreground opacity-50"
                          }`}
                        >
                          📥 {p}
                        </button>
                      );
                    })}
                    {PUMP_PIPES.map((p) => {
                      const isSel = filter.selectedPumpPipes.includes(p);
                      return (
                        <button
                          key={p}
                          onClick={() => togglePumpPipe(p)}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-all ${
                            isSel
                              ? "bg-red-500/15 border border-red-500 text-red-700 dark:text-red-300"
                              : "bg-muted text-muted-foreground opacity-50"
                          }`}
                        >
                          📤 {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>

            {/* Metadata & Sections Settings */}
            <Card className="mt-4 p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label className="text-xs">{isRtl ? "عنوان التقرير" : "Report Title"}</Label>
                  <Input
                    value={filter.reportTitle}
                    onChange={(e) => setFilter({ ...filter, reportTitle: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">{isRtl ? "رقم المرجع / الإشارة" : "Reference No."}</Label>
                  <Input
                    value={filter.referenceNo}
                    onChange={(e) => setFilter({ ...filter, referenceNo: e.target.value })}
                    className="h-8 text-xs mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">{isRtl ? "مهندس الوردية" : "Prepared By"}</Label>
                  <Input
                    value={filter.preparedBy}
                    onChange={(e) => setFilter({ ...filter, preparedBy: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">{isRtl ? "مشرف المحطة" : "Shift Supervisor"}</Label>
                  <Input
                    value={filter.shiftSupervisor}
                    onChange={(e) => setFilter({ ...filter, shiftSupervisor: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              {/* Section toggles */}
              <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-4 text-xs">
                <span className="font-bold text-muted-foreground">{isRtl ? "أقسام التقرير:" : "Include Sections:"}</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filter.includeKpis}
                    onChange={(e) => setFilter({ ...filter, includeKpis: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>{isRtl ? "مؤشرات KPI" : "KPIs"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filter.includeTankLevels}
                    onChange={(e) => setFilter({ ...filter, includeTankLevels: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>{isRtl ? "مناسيب الخزانات" : "Tank Levels"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filter.includeFlowTables}
                    onChange={(e) => setFilter({ ...filter, includeFlowTables: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>{isRtl ? "تدفقات الخطوط" : "Flow Tables"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filter.includeCharts}
                    onChange={(e) => setFilter({ ...filter, includeCharts: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>{isRtl ? "الرسوم البيانية" : "Charts"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filter.includeBranches}
                    onChange={(e) => setFilter({ ...filter, includeBranches: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>{isRtl ? "مقارنة الفروع" : "Branches"}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filter.includeSignatures}
                    onChange={(e) => setFilter({ ...filter, includeSignatures: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>{isRtl ? "التواقيع والاعتماد" : "Signatures"}</span>
                </label>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* REPORT PREVIEW & ANALYTICAL OUTPUT */}
      {/* ========================================== */}
      <Card
        id="custom-report-preview-container"
        className="p-6 md:p-10 border-2 bg-card text-foreground shadow-lg print:shadow-none print:border-none print:p-0"
      >
        {/* Official Report Header */}
        <div className="flex flex-col border-b-2 border-primary/20 pb-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-lg">
                PS1
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-foreground">{filter.reportTitle}</h1>
                <p className="text-xs text-muted-foreground font-mono">
                  {filter.department} • {isRtl ? "محطة ومستودع الضخ الأول" : "Pumping Station 1"}
                </p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-blue-700 dark:text-blue-300 font-medium">
                📅 {filter.startDate} {filter.startDate !== filter.endDate ? `➜ ${filter.endDate}` : ""} ({filter.shift})
              </div>
              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-amber-700 dark:text-amber-300 font-medium">
                🛢️ {computedData.materialSpec.nameAr}
              </div>
              <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-emerald-700 dark:text-emerald-300 font-medium font-mono">
                🔖 {filter.referenceNo}
              </div>
            </div>
          </div>
        </div>

        {/* 1. EXECUTIVE KPI SUMMARY */}
        {filter.includeKpis && (
          <div className="space-y-3 mb-8">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {isRtl ? "المؤشرات التشغيلية والحجمية الرئيسية" : "Executive Operational & Volumetric KPIs"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-xl border bg-muted/30 p-3">
                <span className="text-[11px] text-muted-foreground block">
                  {isRtl ? "المخزون الحالي" : "Current Stock"}
                </span>
                <span className="text-lg font-black font-mono mt-1 block text-primary">
                  {fmt(computedData.currentStockM3)} <span className="text-xs font-normal">M³</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {fmt(computedData.currentStockBbl)} bbl
                </span>
              </div>

              <div className="rounded-xl border bg-muted/30 p-3">
                <span className="text-[11px] text-muted-foreground block">
                  {isRtl ? "إجمالي المستلم" : "Total Received"}
                </span>
                <span className="text-lg font-black font-mono mt-1 block text-blue-600 dark:text-blue-400">
                  {fmt(computedData.totalReceiveM3)} <span className="text-xs font-normal">M³</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {fmt(computedData.totalReceiveBbl)} bbl
                </span>
              </div>

              <div className="rounded-xl border bg-muted/30 p-3">
                <span className="text-[11px] text-muted-foreground block">
                  {isRtl ? "إجمالي المضخوخ" : "Total Pumped"}
                </span>
                <span className="text-lg font-black font-mono mt-1 block text-red-600 dark:text-red-400">
                  {fmt(computedData.totalPumpM3)} <span className="text-xs font-normal">M³</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {fmt(computedData.totalPumpBbl)} bbl
                </span>
              </div>

              <div className="rounded-xl border bg-muted/30 p-3">
                <span className="text-[11px] text-muted-foreground block">
                  {isRtl ? "صافي التغير" : "Net Stock ΔV"}
                </span>
                <span
                  className={`text-lg font-black font-mono mt-1 block ${
                    computedData.netStockChangeM3 >= 0 ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {computedData.netStockChangeM3 >= 0 ? "+" : ""}
                  {fmt(computedData.netStockChangeM3)} <span className="text-xs font-normal">M³</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {computedData.netStockChangeM3 >= 0 ? "+" : ""}
                  {fmt(computedData.netStockChangeM3 * M3_TO_BARREL)} bbl
                </span>
              </div>

              <div className="rounded-xl border bg-muted/30 p-3">
                <span className="text-[11px] text-muted-foreground block">
                  {isRtl ? "المتاح للضخ" : "Available to Pump"}
                </span>
                <span className="text-lg font-black font-mono mt-1 block text-foreground">
                  {fmt(computedData.availPumpM3)} <span className="text-xs font-normal">M³</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {fmt(computedData.availPumpBbl)} bbl
                </span>
              </div>

              <div className="rounded-xl border bg-muted/30 p-3">
                <span className="text-[11px] text-muted-foreground block">
                  {isRtl ? "نسبة الامتلاء" : "Depot Fill Rate"}
                </span>
                <span className="text-lg font-black font-mono mt-1 block text-foreground">
                  {computedData.fillPercentage.toFixed(1)}%
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {computedData.activeTanksCount} {isRtl ? "خزانات نشطة" : "Active Tanks"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. CHARTS SECTION */}
        {filter.includeCharts && computedData.hourlyFlowChartData.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2 mb-8 no-print">
            {/* Flow Trends Chart */}
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-primary" />
                {isRtl ? "معدلات تدفق الاستلام والضخ (M³/2h)" : "Receiving vs Pumping Flow Rates (M³/2h)"}
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={computedData.hourlyFlowChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        borderRadius: "8px",
                        border: "none",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Area
                      type="monotone"
                      dataKey="receiveM3"
                      name={isRtl ? "الاستلام (Receive)" : "Receive (M³)"}
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.25}
                    />
                    <Area
                      type="monotone"
                      dataKey="pumpM3"
                      name={isRtl ? "الضخ (Pump)" : "Pump (M³)"}
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.25}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tank Level Distribution */}
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                {isRtl ? "توزيع مخزون الخزانات المختارة (M³)" : "Tank Inventory Breakdown (M³)"}
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computedData.tankLevelsBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="tank" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        borderRadius: "8px",
                        border: "none",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                    />
                    <Bar
                      dataKey="stockM3"
                      name={isRtl ? "المخزون (M³)" : "Stock M³"}
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 3. TANK INVENTORY BREAKDOWN TABLE */}
        {filter.includeTankLevels && computedData.tankLevelsBreakdown.length > 0 && (
          <div className="space-y-2 mb-8">
            <h3 className="text-sm font-bold text-foreground">
              {isRtl ? "جدول جرد ومناسيب الخزانات المشمولة" : "Selected Tanks Inventory & Level Audit"}
            </h3>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-xs text-center" dir="ltr">
                <thead className="bg-muted/50 font-bold text-muted-foreground">
                  <tr>
                    <th className="p-2.5 text-left font-sans">Tank</th>
                    <th className="p-2.5 font-sans">Level (cm)</th>
                    <th className="p-2.5 font-sans">Stock (M³)</th>
                    <th className="p-2.5 font-sans">Stock (BBL)</th>
                    <th className="p-2.5 font-sans">Cap (M³)</th>
                    <th className="p-2.5 font-sans">Fill %</th>
                    <th className="p-2.5 font-sans">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {computedData.tankLevelsBreakdown.map((t) => (
                    <tr key={t.tank} className="hover:bg-muted/20">
                      <td className="p-2 text-left font-bold font-mono">{t.tank}</td>
                      <td className="p-2 font-mono tabular-nums">{t.levelCm != null ? `${t.levelCm} cm` : "—"}</td>
                      <td className="p-2 font-mono font-bold tabular-nums text-foreground">{fmt(t.stockM3)}</td>
                      <td className="p-2 font-mono tabular-nums text-muted-foreground">{fmt(t.stockBbl)}</td>
                      <td className="p-2 font-mono tabular-nums">{fmt(t.capacityM3)}</td>
                      <td className="p-2 font-mono font-semibold">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-muted">
                          {t.fillPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-muted/40 font-bold border-t-2 border-primary/20">
                    <td className="p-2.5 text-left">TOTAL</td>
                    <td className="p-2.5">—</td>
                    <td className="p-2.5 font-mono text-primary">{fmt(computedData.currentStockM3)}</td>
                    <td className="p-2.5 font-mono">{fmt(computedData.currentStockBbl)}</td>
                    <td className="p-2.5 font-mono">{fmt(computedData.totalCapacityM3)}</td>
                    <td className="p-2.5 font-mono">{computedData.fillPercentage.toFixed(1)}%</td>
                    <td className="p-2.5">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. PIPELINE FLOW TABLES (RECEIVING & PUMPING) */}
        {filter.includeFlowTables && (
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            {/* Receiving Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                <span>📥 {isRtl ? "تدفقات خطوط الاستلام (M³)" : "Receiving Lines Inflow (M³)"}</span>
                <span className="font-mono text-[11px] font-black">Total: {fmt(computedData.totalReceiveM3)} M³</span>
              </h4>
              <div className="overflow-x-auto rounded-xl border max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-center" dir="ltr">
                  <thead className="bg-muted/50 font-bold sticky top-0">
                    <tr>
                      <th className="p-2 font-mono">Hour</th>
                      {filter.selectedReceivePipes.map((p) => (
                        <th key={p} className="p-2 text-[11px]">
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {computedData.filteredReceiveRows.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="p-1.5 font-mono font-bold bg-muted/10">{r.hour}</td>
                        {filter.selectedReceivePipes.map((p) => (
                          <td key={p} className="p-1.5 font-mono tabular-nums">
                            {fmt(r.values[p] ?? 0)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pumping Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-between">
                <span>📤 {isRtl ? "تدفقات خطوط الضخ (M³)" : "Pumping Lines Outflow (M³)"}</span>
                <span className="font-mono text-[11px] font-black">Total: {fmt(computedData.totalPumpM3)} M³</span>
              </h4>
              <div className="overflow-x-auto rounded-xl border max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-center" dir="ltr">
                  <thead className="bg-muted/50 font-bold sticky top-0">
                    <tr>
                      <th className="p-2 font-mono">Hour</th>
                      {filter.selectedPumpPipes.map((p) => (
                        <th key={p} className="p-2 text-[11px]">
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {computedData.filteredPumpRows.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="p-1.5 font-mono font-bold bg-muted/10">{r.hour}</td>
                        {filter.selectedPumpPipes.map((p) => (
                          <td key={p} className="p-1.5 font-mono tabular-nums">
                            {fmt(r.values[p] ?? 0)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. CONNECTED BRANCHES TABLE */}
        {filter.includeBranches && computedData.filteredBranches.length > 0 && (
          <div className="space-y-2 mb-8">
            <h3 className="text-sm font-bold text-foreground">
              {isRtl ? "مقارنة المحطات والمستودعات المرتبطة" : "Connected Terminals & Branches Reconciliation"}
            </h3>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-xs text-center">
                <thead className="bg-muted/50 font-bold">
                  <tr>
                    <th className="p-2 text-right">{isRtl ? "المحطة / المستودع" : "Terminal"}</th>
                    <th className="p-2">{isRtl ? "السعة الحرة (M³)" : "Free Ullage (M³)"}</th>
                    <th className="p-2">{isRtl ? "معدل الضخ (M³)" : "Pump (M³)"}</th>
                    <th className="p-2">{isRtl ? "معدل الاستلام (M³)" : "Receive (M³)"}</th>
                    <th className="p-2">{isRtl ? "المتاح للضخ (BBL)" : "Avail (BBL)"}</th>
                    <th className="p-2 text-right">{isRtl ? "ملاحظات" : "Notes"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {computedData.filteredBranches.map((b) => (
                    <tr key={b.name} className="hover:bg-muted/20">
                      <td className="p-2 text-right font-bold">{b.name}</td>
                      <td className="p-2 font-mono tabular-nums">{fmt(b.freeM3)}</td>
                      <td className="p-2 font-mono tabular-nums">{fmt(b.pump)}</td>
                      <td className="p-2 font-mono tabular-nums">{fmt(b.receive)}</td>
                      <td className="p-2 font-mono tabular-nums">{fmt(b.availPumpBbl)}</td>
                      <td className="p-2 text-right text-muted-foreground">{b.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. OPERATIONAL NOTES & SIGNATURES BLOCK */}
        <div className="space-y-6 pt-4 border-t">
          {filter.notes && (
            <div className="rounded-xl border bg-muted/20 p-4">
              <h5 className="text-xs font-bold text-foreground mb-1">
                {isRtl ? "الملاحظات التشغيلية والتوصيات:" : "Operational Notes & Recommendations:"}
              </h5>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{filter.notes}</p>
            </div>
          )}

          {filter.includeSignatures && (
            <div className="grid grid-cols-3 gap-6 pt-6 border-t text-center text-xs">
              <div className="space-y-2">
                <span className="text-muted-foreground block">{isRtl ? "مهندس تشغيل الوردية" : "Operations Engineer"}</span>
                <div className="h-10 border-b border-dashed border-muted-foreground/40 flex items-end justify-center font-bold">
                  {filter.preparedBy || "........................"}
                </div>
                <span className="text-[10px] text-muted-foreground">{isRtl ? "التوقيع والتاريخ" : "Sign & Date"}</span>
              </div>

              <div className="space-y-2">
                <span className="text-muted-foreground block">{isRtl ? "مشرف المحطة والوردية" : "Shift Supervisor"}</span>
                <div className="h-10 border-b border-dashed border-muted-foreground/40 flex items-end justify-center font-bold">
                  {filter.shiftSupervisor || "........................"}
                </div>
                <span className="text-[10px] text-muted-foreground">{isRtl ? "التوقيع والتاريخ" : "Sign & Date"}</span>
              </div>

              <div className="space-y-2">
                <span className="text-muted-foreground block">{isRtl ? "مصادقة مدير المستودع" : "Terminal Manager Approval"}</span>
                <div className="h-10 border-b border-dashed border-muted-foreground/40 flex items-end justify-center font-bold">
                  ........................
                </div>
                <span className="text-[10px] text-muted-foreground">{isRtl ? "الختم الرسمي" : "Official Stamp"}</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
