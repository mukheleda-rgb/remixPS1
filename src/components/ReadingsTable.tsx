import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { ComputedRow, VISIBLE_TANKS, fmt } from "@/lib/calculations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Plus,
  X,
  Eraser,
  Copy,
  Scissors,
  ClipboardPaste,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { useState, Fragment, useMemo } from "react";
import { toast } from "sonner";
import { EditableHeader } from "@/components/EditableHeader";
import { cn } from "@/lib/utils";
import { SmartDataEntry } from "@/components/SmartDataEntry";

interface Props {
  rows: ComputedRow[];
  customTanks: string[];
  onChangeLevel: (rowId: string, tank: string, value: number | null) => void;
  onChangeHour: (rowId: string, hour: string) => void;
  onDelete: (rowId: string) => void;
  onAdd: () => void;
  onAddTank: (name: string, bonusM3: number) => void;
  onRemoveTank: (name: string) => void;
  onClearAll?: () => void;
  /** rowId → list of missing tank keys */
  warnings?: Record<string, string[]>;
  labels?: Record<string, string>;
  onRenameLabel?: (original: string, label: string) => void;
}

export function ReadingsTable({
  rows,
  customTanks,
  onChangeLevel,
  onChangeHour,
  onDelete,
  onAdd,
  onAddTank,
  onRemoveTank,
  onClearAll,
  warnings = {},
  labels = {},
  onRenameLabel,
}: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [newTank, setNewTank] = useState("");
  const [bonusInput, setBonusInput] = useState<string>("");
  const [clipboard, setClipboard] = useState<Record<string, number | null> | null>(null);
  const [tankFilter, setTankFilter] = useState<string>("all");
  
  const allTanksRaw = [...VISIBLE_TANKS, ...customTanks] as string[];
  const allTanks = useMemo(() => {
    if (tankFilter === "all") return allTanksRaw;
    return allTanksRaw.filter(t => t === tankFilter);
  }, [allTanksRaw, tankFilter]);

  const colCount = 1 + allTanks.length * 2 + 8 + 1;

  const copyRow = (row: ComputedRow) => {
    const snap: Record<string, number | null> = {};
    allTanks.forEach((tank) => (snap[tank] = row.reading.levels[tank] ?? null));
    setClipboard(snap);
    toast.success(t("toast.copyRow", { hour: row.reading.hour }));
  };
  const cutRow = (row: ComputedRow) => {
    copyRow(row);
    allTanks.forEach((tank) => onChangeLevel(row.reading.id, tank, null));
    toast.success(t("toast.cutRow", { hour: row.reading.hour }));
  };
  const pasteRow = (row: ComputedRow) => {
    if (!clipboard) return;
    allTanks.forEach((tank) => onChangeLevel(row.reading.id, tank, clipboard[tank] ?? null));
    toast.success(t("toast.pasteRow", { hour: row.reading.hour }));
  };

  const handleSmartData = (hour: string, levels: Record<string, number | null>) => {
    const targetRow = rows.find(r => r.reading.hour === hour);
    if (!targetRow) {
      toast.error(t("vision.error"));
      return;
    }
    let updatedCount = 0;
    Object.entries(levels).forEach(([tank, level]) => {
      if (level !== null) {
        onChangeLevel(targetRow.reading.id, tank, level);
        updatedCount++;
      }
    });
    if (updatedCount > 0) {
      toast.success(t("vision.success"));
    } else {
      toast.info(t("vision.noLevels"));
    }
  };

  const handleAddTank = () => {
    const name = newTank.trim().toUpperCase();
    if (!name) return;
    if (allTanks.includes(name)) return;
    const parsed = bonusInput.trim() === "" ? 0 : Number(bonusInput);
    const bonus = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    onAddTank(name, bonus);
    setNewTank("");
    setBonusInput("");
  };

  const handleClearAll = () => {
    if (!onClearAll) return;
    onClearAll();
    toast.success(t("toast.clearReadingsSuccess"));
  };

  return (
    <div className="rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 text-start">
        <div>
          <h3 className="text-base font-bold text-foreground">{t("tables.readingsTableTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("tables.readingsTableSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto no-print">
          {/* Filter */}
          <Select value={tankFilter} onValueChange={setTankFilter}>
            <SelectTrigger className="h-8 w-full sm:w-[130px] text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder={t("tables.filterByTank") || "تصفية الخزان"} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {allTanksRaw.map((tname) => (
                <SelectItem key={tname} value={tname}>
                  {labels[tname] || tname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Smart Entry */}
          <SmartDataEntry
            hours={rows.map((r) => r.reading.hour)}
            onDataExtracted={handleSmartData}
          />

          {/* Add custom tank group */}
          <div className="flex items-center rounded-lg border border-border/70 bg-muted/30 p-0.5 shadow-sm">
            <Input
              value={newTank}
              onChange={(e) => setNewTank(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTank()}
              placeholder={t("placeholders.tankName")}
              className="h-7 w-20 sm:w-24 text-xs border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 focus-visible:bg-background rounded"
            />
            <div className="h-4 w-px bg-border/60 shrink-0" />
            <Input
              id="bonus-cap"
              type="number"
              inputMode="numeric"
              min={0}
              value={bonusInput}
              onChange={(e) => setBonusInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTank()}
              placeholder={t("labels.bonusCapacity") || "طاقة إضافية"}
              title={t("labels.bonusCapacity") || "طاقة إضافية"}
              className="h-7 w-20 sm:w-24 text-xs border-0 bg-transparent px-2 text-right tabular-nums shadow-none focus-visible:ring-0 focus-visible:bg-background rounded"
            />
            <Button
              onClick={handleAddTank}
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-xs font-semibold gap-1 hover:bg-background shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("buttons.addTank")}</span>
            </Button>
          </div>

          <div className="h-5 w-px bg-border/60 hidden md:block" />

          {/* Add Reading Button */}
          <Button onClick={onAdd} size="sm" className="h-8 gap-1.5 text-xs font-bold shadow-sm shrink-0">
            <Plus className="h-4 w-4" /> {t("buttons.addReading")}
          </Button>

          {/* Reset All Button */}
          {onClearAll && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 shrink-0"
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
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs" dir="rtl">
          <thead>
            <tr className="border-b bg-muted/60 text-[11px] font-bold uppercase text-muted-foreground">
              <th
                rowSpan={2}
                className="sticky z-10 bg-slate-100 dark:bg-slate-900 px-3 py-3 text-center align-middle border-e-2 right-0 text-right"
              >
                {t("tables.col_levelHrs")}
              </th>
              {allTanks.map((tname) => {
                const isCustom = customTanks.includes(tname);
                const accentClass = isCustom ? "border-s-4 border-s-accent/80 bg-accent/5" : "border-s-4 border-s-primary/80 bg-primary/5";
                
                return (
                  <th key={tname} colSpan={2} rowSpan={2} className={cn("px-2 py-2 text-center border-b", accentClass)}>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black tracking-tight uppercase line-clamp-1">
                          {labels[tname] || tname}
                        </span>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => onRemoveTank(tname)}
                            className="rounded p-0.5 hover:bg-destructive/20 hover:text-destructive no-print"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex w-full justify-around text-[9px] font-medium opacity-80 pt-1 border-t border-current/10">
                        <span>{t("tables.col_level")}</span>
                        <span>{t("tables.col_differ")}</span>
                      </div>
                    </div>
                  </th>
                );
              })}
              {/* Barrel block */}
              <th colSpan={4} className="border-s-4 border-s-primary/60 bg-primary/10 px-3 py-1 text-center text-primary text-[10px] uppercase font-black">
                {t("tables.col_stockOilBbl")}
              </th>
              {/* M³ block */}
              <th colSpan={4} className="border-s-4 border-s-accent/60 bg-accent/10 px-3 py-1 text-center text-accent text-[10px] uppercase font-black border-e">
                {t("tables.col_stockOilM3")}
              </th>
              <th rowSpan={2} className="border-s border-b px-2 py-2"></th>
            </tr>
            <tr className="border-b bg-muted/40 text-[9px] font-black uppercase text-muted-foreground/80">
              {/* Barrel sub-headers */}
              <th className="border-s-4 border-s-primary/20 px-1 py-1 text-center">{t("stats.totalStock")}</th>
              <th className="bg-primary/5 px-1 py-1 text-center">{t("tables.col_unavailPump")}</th>
              <th className="bg-primary/5 px-1 py-1 text-center">{t("stats.availPump")}</th>
              <th className="bg-primary/5 px-1 py-1 text-center">{isRtl ? "فراغ" : "Free"}</th>
              {/* M3 sub-headers */}
              <th className="border-s-4 border-s-accent/20 px-1 py-1 text-center">{t("stats.totalStock")}</th>
              <th className="bg-accent/5 px-1 py-1 text-center">{t("tables.col_unavailPump")}</th>
              <th className="bg-accent/5 px-1 py-1 text-center">{t("stats.availPump")}</th>
              <th className="bg-accent/5 px-1 py-1 text-center border-e">{t("stats.freeVolume")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const rowWarn = warnings[row.reading.id];
              return (
                <tr
                  key={row.reading.id}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/30",
                    idx % 2 === 1 && "bg-muted/10",
                    rowWarn && "bg-warning/5",
                  )}
                >
                  <td
                    className="sticky z-10 bg-white dark:bg-slate-950 px-2 py-1.5 border-e-2 right-0"
                  >
                    <div className="flex items-center gap-1">
                      <Input
                        value={row.reading.hour}
                        onChange={(e) => onChangeHour(row.reading.id, e.target.value)}
                        className="h-7 min-w-[80px] text-right font-mono text-xs px-2"
                      />
                      {rowWarn && (
                        <span
                          title={t("tables.missingDataTitle", {
                            list: rowWarn.map((k) => labels[k] || k).join("، "),
                          })}
                          className="text-warning"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                  {allTanks.map((tname) => {
                    const isMissing = rowWarn?.includes(tname);
                    const isCustom = customTanks.includes(tname);
                    const groupBorder = isCustom ? "border-s-4 border-s-accent/20" : "border-s-4 border-s-primary/20";
                    return (
                      <Fragment key={tname}>
                        <td className={cn("px-1 py-1 border-e-0", groupBorder)}>
                          <Input
                            type="number"
                            value={row.reading.levels[tname] ?? ""}
                            onChange={(e) =>
                              onChangeLevel(
                                row.reading.id,
                                tname,
                                e.target.value === "" ? null : Number(e.target.value),
                              )
                            }
                            className={cn(
                              "h-7 min-w-[85px] text-right tabular-nums text-xs px-2",
                              isMissing && "border-warning bg-warning/10",
                            )}
                            placeholder={isMissing ? "؟" : ""}
                          />
                          {isMissing && (
                            <div className="absolute top-0 right-0 p-0.5 pointer-events-none">
                               <div className="h-1.5 w-1.5 rounded-full bg-warning/40" />
                            </div>
                          )}
                        </td>
                        <td className="px-1 py-1 text-center font-mono text-[10px] bg-muted/5 min-w-[60px] border-s-0">
                          <span
                            className={cn(
                              row.diffs[tname] == null
                                ? "text-muted-foreground"
                                : row.diffs[tname]! > 0
                                  ? "text-success font-semibold"
                                  : row.diffs[tname]! < 0
                                    ? "text-destructive font-semibold"
                                    : "text-muted-foreground",
                            )}
                          >
                            {row.diffs[tname] == null ? "—" : fmt(row.diffs[tname])}
                          </span>
                        </td>
                      </Fragment>
                    );
                  })}
                  {/* Barrel */}
                  <td className="border-s-4 border-s-primary/40 bg-primary/5 px-2 py-1 text-center font-bold tabular-nums text-primary text-xs">
                    {fmt(row.totalStockBarrel)}
                  </td>
                  <td className="bg-primary/5 px-2 py-1 text-center tabular-nums text-muted-foreground border-s-0">
                    {fmt(row.unavailPumpBarrel)}
                  </td>
                  <td className="bg-primary/5 px-2 py-1 text-center font-semibold tabular-nums text-success border-s-0">
                    {fmt(row.availPumpBarrel)}
                  </td>
                  <td className="bg-primary/5 px-2 py-1 text-center tabular-nums text-warning border-s-0">
                    {fmt(row.freeVolumeBarrel)}
                  </td>
                  {/* M³ */}
                  <td className="border-s-4 border-s-accent/40 bg-accent/5 px-2 py-1 text-center font-semibold tabular-nums text-accent text-xs">
                    {fmt(row.totalStockM3)}
                  </td>
                  <td className="bg-accent/5 px-2 py-1 text-center tabular-nums text-muted-foreground border-s-0 text-xs">
                    {fmt(row.unavailPumpM3)}
                  </td>
                  <td className="bg-accent/5 px-2 py-1 text-center font-semibold tabular-nums text-success border-s-0 text-xs">
                    {fmt(row.availPumpM3)}
                  </td>
                  <td className="bg-accent/5 px-2 py-1 text-center tabular-nums text-warning border-s-0 text-xs">
                    {fmt(row.freeVolumeM3)}
                  </td>
                  <td className="border-s px-1 py-1">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => copyRow(row)}
                        title={t("reports.copy")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => cutRow(row)}
                        title={t("reports.cut")}
                      >
                        <Scissors className="h-3 w-3" />
                      </Button>
                      {clipboard && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-primary hover:bg-primary/10"
                          onClick={() => pasteRow(row)}
                          title={t("reports.paste")}
                        >
                          <ClipboardPaste className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => onDelete(row.reading.id)}
                        title={t("reports.delete")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="py-12 text-center text-sm text-muted-foreground">
                  {t("tables.noReadings")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
