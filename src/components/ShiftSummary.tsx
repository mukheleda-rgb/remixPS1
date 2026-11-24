import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { type ReportSnapshot } from '@/lib/reports';
import { type Reading } from '@/lib/calculations';
import { ClipboardList, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

interface Props {
  readings: Reading[];
  totalCapacity: number;
}

const ShiftSummary: React.FC<Props> = ({ readings, totalCapacity }) => {
  const { t } = useTranslation();

  const summary = useMemo(() => {
    if (readings.length < 2) return null;

    const first = readings[0];
    const last = readings[readings.length - 1];

    // Calculate stock using the formula: stock_m3 = (Σ levels * 43) - (600 * active_tanks)
    let startSum = 0;
    let startCount = 0;
    Object.values(first.levels).forEach(v => {
      if (v != null) {
        startSum += v;
        startCount++;
      }
    });
    const startStock = startSum > 0 ? (startSum * 43) - (600 * startCount) : 0;

    let endSum = 0;
    let endCount = 0;
    Object.values(last.levels).forEach(v => {
      if (v != null) {
        endSum += v;
        endCount++;
      }
    });
    const endStock = endSum > 0 ? (endSum * 43) - (600 * endCount) : 0;

    const diff = endStock - startStock;
    const pct = (endStock / totalCapacity) * 100;

    return {
      startStock,
      endStock,
      diff,
      pct,
      isRising: diff > 0,
    };
  }, [readings, totalCapacity]);

  if (!summary) return null;

  return (
    <Card className="shadow-elegant border-border/40 bg-gradient-to-br from-background to-muted/20 text-right" dir="rtl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          {t("summary.title") || "Shift Summary"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{t("summary.startStock") || "Start Stock"}</span>
            <div className="text-lg font-mono font-bold">{Math.round(summary.startStock).toLocaleString()} m³</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{t("summary.currentStock") || "Current Stock"}</span>
            <div className="text-lg font-mono font-bold">{Math.round(summary.endStock).toLocaleString()} m³</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-background/50 rounded-xl border border-border/40">
          <div className={`p-2 rounded-full ${summary.isRising ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {summary.isRising ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold">
              {summary.isRising ? (t("summary.rising") || "Stock is increasing") : (t("summary.falling") || "Stock is decreasing")}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {Math.abs(Math.round(summary.diff)).toLocaleString()} m³ {t("summary.sinceStart") || "since start of shift"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold">{summary.pct.toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">{t("summary.capacity") || "Capacity"}</div>
          </div>
        </div>

        {summary.pct > 90 && (
          <div className="flex items-center gap-2 p-2 bg-rose-500/10 text-rose-600 rounded-lg text-[10px] font-bold">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("summary.highLevelWarning") || "High tank levels! Review pumping rate."}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShiftSummary;
