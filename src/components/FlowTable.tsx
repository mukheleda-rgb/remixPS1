import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { ComputedFlowRow, fmt } from "@/lib/calculations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eraser, Copy, Scissors, ClipboardPaste, AlertTriangle, X } from "lucide-react";
import { useState, Fragment } from "react";
import { toast } from "sonner";
import { EditableHeader } from "@/components/EditableHeader";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  pipes: readonly string[];
  rows: ComputedFlowRow[];
  onChange: (rowId: string, pipe: string, value: number | null) => void;
  onChangeHour: (rowId: string, hour: string) => void;
  accentClass?: string;
  readOnlyPipes?: readonly string[];
  onClearAll?: () => void;
  /** rowId → list of missing pipe keys */
  warnings?: Record<string, string[]>;
  labels?: Record<string, string>;
  onRenameLabel?: (original: string, label: string) => void;
}

export function FlowTable({
  title,
  subtitle,
  pipes,
  rows,
  onChange,
  onChangeHour,
  accentClass = "text-primary",
  readOnlyPipes = [],
  onClearAll,
  warnings = {},
  labels = {},
  onRenameLabel,
}: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  // grand total per pipe = last row accum
  const last = rows[rows.length - 1];
  const totalAll = last ? pipes.reduce((acc, p) => acc + (last.accum[p] ?? 0), 0) : 0;
  const writablePipes = pipes.filter((p) => !readOnlyPipes.includes(p));
  const [clipboard, setClipboard] = useState<Record<string, number | null> | null>(null);

  const copyRow = (row: ComputedFlowRow) => {
    const snap: Record<string, number | null> = {};
    writablePipes.forEach((p) => (snap[p] = row.values[p] ?? null));
    setClipboard(snap);
    toast.success(t("toast.copyRow", { hour: row.hour }));
  };
  const cutRow = (row: ComputedFlowRow) => {
    copyRow(row);
    writablePipes.forEach((p) => onChange(row.id, p, null));
    toast.success(t("toast.cutRow", { hour: row.hour }));
  };
  const pasteRow = (row: ComputedFlowRow) => {
    if (!clipboard) return;
    writablePipes.forEach((p) => onChange(row.id, p, clipboard[p] ?? null));
    toast.success(t("toast.pasteRow", { hour: row.hour }));
  };

  const handleClearAll = () => {
    if (!onClearAll) return;
    onClearAll();
    toast.success(t("toast.clearReadingsSuccess"));
  };

  return (
    <div className="rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 text-start">
        <div>
          <h3 className={`text-base font-bold ${accentClass}`}>{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {onClearAll && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
      <div className="overflow-x-auto">
        <table className="w-full text-xs" dir="rtl">
          <thead>
            <tr className="border-b bg-muted/60 text-[11px] font-bold uppercase text-muted-foreground">
              <th
                className="sticky z-10 bg-slate-100 dark:bg-slate-900 px-3 py-3 text-right align-middle whitespace-nowrap border-e-2 right-0"
              >
                {t("tables.col_levelHrs").split("/")[1] || "HRs"}
              </th>
              {pipes.map((p) => (
                <th
                  key={p}
                  colSpan={2}
                  className="border-s-4 border-s-slate-300 dark:border-s-slate-700 px-2 py-2 text-center border-b"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="text-[10px] font-black tracking-tight uppercase line-clamp-1">
                      {onRenameLabel ? (
                        <EditableHeader original={p} label={labels[p] || p} onRename={onRenameLabel} />
                      ) : (
                        <span>{labels[p] || p}</span>
                      )}
                    </div>
                    <div className="flex w-full justify-around text-[9px] font-medium opacity-80 pt-1 border-t border-current/10">
                      <span>{t("tables.col_2hr")}</span>
                      <span>{t("tables.col_accum")}</span>
                    </div>
                  </div>
                </th>
              ))}
              <th className="border-s-2 bg-muted/60 px-2 py-2 text-center align-middle border-b">
                {t("tables.col_actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const rowWarn = warnings[row.id];
              return (
                <tr
                  key={row.id}
                  className={cn("border-b hover:bg-muted/30", idx % 2 === 1 && "bg-muted/10", rowWarn && "bg-warning/5")}
                >
                  <td
                    className="sticky z-10 bg-white dark:bg-slate-950 px-2 py-1.5 border-e-2 right-0"
                  >
                    <div className="flex items-center gap-1">
                      <Input
                        value={row.hour}
                        onChange={(e) => onChangeHour(row.id, e.target.value)}
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
                  {pipes.map((p) => {
                    const isReadOnly = readOnlyPipes.includes(p);
                    const isMissing = rowWarn?.includes(p);
                    return (
                      <Fragment key={p}>
                        <td className="border-s-4 border-s-slate-200 dark:border-s-slate-800 px-1 py-1 border-e-0">
                          {isReadOnly ? (
                            <div
                              className={cn(
                                "flex h-7 min-w-[95px] items-center justify-center rounded-md border border-dashed bg-muted/40 text-center font-semibold tabular-nums text-xs",
                                accentClass,
                              )}
                              title={t("tables.autoCalculated")}
                            >
                              {row.values[p] != null ? fmt(row.values[p] as number) : "—"}
                            </div>
                          ) : (
                            <Input
                              type="number"
                              value={row.values[p] ?? ""}
                              onChange={(e) =>
                                onChange(
                                  row.id,
                                  p,
                                  e.target.value === "" ? null : Number(e.target.value),
                                )
                              }
                              className={cn(
                                "h-7 min-w-[95px] text-right tabular-nums text-xs px-2",
                                isMissing && "border-warning bg-warning/10",
                              )}
                              placeholder={isMissing ? "؟" : ""}
                            />
                          )}
                          {isMissing && (
                            <div className="absolute top-0 right-0 p-0.5 pointer-events-none">
                               <div className="h-1.5 w-1.5 rounded-full bg-warning/40" />
                            </div>
                          )}
                        </td>
                        <td
                          className={cn(
                            "px-1 py-1 text-center font-semibold tabular-nums text-xs bg-muted/5 min-w-[70px] border-s-0",
                            accentClass,
                          )}
                        >
                          {row.accum[p] ? fmt(row.accum[p]) : "—"}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className="border-s-2 px-1 py-1">
                    <div className="flex items-center justify-center gap-0.5">
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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-bold">
              <td
                className="sticky z-10 bg-slate-100 dark:bg-slate-900 px-3 py-2 text-right border-e-2 text-[10px] uppercase right-0"
              >
                {t("tables.col_total")}
              </td>
              {pipes.map((p) => (
                <Fragment key={p}>
                  <td colSpan={2} className="border-s-4 border-s-slate-300 dark:border-s-slate-700 px-1 py-2 text-center tabular-nums text-[13px]">
                    {last?.accum[p] ? fmt(last.accum[p]) : "—"}
                  </td>
                </Fragment>
              ))}
              <td className="border-s-2 bg-muted/40 px-1 py-2"></td>
            </tr>
            <tr className="bg-muted/60 text-[11px]">
              <td
                colSpan={1 + pipes.length * 2 + 1}
                className={cn("px-3 py-2 text-center font-bold", accentClass)}
              >
                {t("tables.grandTotal")} = {fmt(totalAll)} {t("common.m3")} &nbsp;·&nbsp;{" "}
                {fmt(totalAll * 6.2898)} {t("common.barrel").toUpperCase()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
