import { useTranslation } from "react-i18next";
import { ComputedRow } from "@/lib/calculations";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface Props {
  rows: ComputedRow[];
}

interface ChartDatum {
  hour: string;
  stock: number | null;
  avail: number | null;
  trend: "up" | "down" | "flat" | null;
}

// Custom dot that renders an arrow per point indicating change vs previous reading
const TrendDot = (props: { cx?: number; cy?: number; payload?: ChartDatum }) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.trend) return null;
  const color =
    payload.trend === "up"
      ? "var(--color-success)"
      : payload.trend === "down"
        ? "var(--color-destructive)"
        : "var(--color-muted-foreground)";
  // arrow path centered at (cx, cy)
  const symbol = payload.trend === "up" ? "▲" : payload.trend === "down" ? "▼" : "■";
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill="var(--color-card)" stroke={color} strokeWidth={1.5} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight={700}
        fill={color}
      >
        {symbol}
      </text>
    </g>
  );
};

export function StockChart({ rows }: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const data: ChartDatum[] = rows
    .filter((r) => r.totalStockM3 != null)
    .map((r, i, arr) => {
      const prev = i > 0 ? arr[i - 1].totalStockM3 : null;
      let trend: ChartDatum["trend"] = null;
      if (prev != null && r.totalStockM3 != null) {
        const d = r.totalStockM3 - prev;
        trend = d > 0 ? "up" : d < 0 ? "down" : "flat";
      }
      return {
        hour: r.reading.hour.trim(),
        stock: r.totalStockM3,
        avail: r.availPumpM3,
        trend,
      };
    });

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-foreground">{t("chart.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("chart.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ArrowUp className="h-3 w-3 text-success" /> {t("chart.increase")}
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowDown className="h-3 w-3 text-destructive" /> {t("chart.decrease")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Minus className="h-3 w-3" /> {t("chart.stable")}
          </span>
        </div>
      </div>
      <div className="mt-4 h-64" dir="ltr">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.55 0.18 230)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="oklch(0.55 0.18 230)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.18 50)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="oklch(0.7 0.18 50)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="hour" stroke="var(--color-muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "0.75rem",
                fontSize: "12px",
              }}
              formatter={(value, name, props) => {
                const num = typeof value === "number" ? value : Number(value);
                const display = Number.isFinite(num)
                  ? num.toLocaleString(i18n.language)
                  : String(value);
                const translatedName =
                  name === "Total Stock" ? t("stats.totalStock") : t("stats.availPump");

                if (name === "Total Stock") {
                  const trend = (props as { payload?: ChartDatum })?.payload?.trend;
                  const label =
                    trend === "up"
                      ? ` ▲ ${t("chart.increase")}`
                      : trend === "down"
                        ? ` ▼ ${t("chart.decrease")}`
                        : trend === "flat"
                          ? ` ■ ${t("chart.stable")}`
                          : "";
                  return [`${display}${label}`, translatedName];
                }
                return [display, translatedName];
              }}
            />
            <Area
              type="monotone"
              dataKey="avail"
              name="Available Pump"
              stroke="oklch(0.7 0.18 50)"
              fill="url(#g2)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="stock"
              name="Total Stock"
              stroke="oklch(0.55 0.18 230)"
              fill="url(#g1)"
              strokeWidth={2}
              dot={<TrendDot />}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
