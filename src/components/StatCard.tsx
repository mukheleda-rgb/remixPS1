import { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  unit: string;
  hint?: string;
  icon?: ReactNode;
  variant?: "primary" | "accent" | "success" | "warning" | "destructive";
  isCritical?: boolean;
  history?: number[];
  className?: string;
}

const variantStyles = {
  primary: "text-primary border-primary/20 bg-primary/5",
  accent: "text-indigo-500 border-indigo-500/20 bg-indigo-500/5",
  success: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
  warning: "text-amber-500 border-amber-500/20 bg-amber-500/5",
  destructive: "text-rose-500 border-rose-500/20 bg-rose-500/5",
};

export function StatCard({ 
  label, 
  value, 
  unit, 
  hint, 
  icon, 
  variant = "primary",
  isCritical = false,
  history,
  className
}: Props) {
  const chartData = history?.map((val, i) => ({ value: val, id: i }));

  const valStr = String(value ?? "");
  const valueFontSize =
    valStr.length >= 8
      ? "text-xs sm:text-sm md:text-base"
      : valStr.length >= 6
      ? "text-sm sm:text-base md:text-lg"
      : valStr.length >= 4
      ? "text-base sm:text-lg md:text-xl"
      : "text-lg sm:text-xl md:text-2xl";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      dir="rtl"
      className={cn(
        "group relative flex aspect-square flex-col overflow-hidden border bg-card p-3 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elegant)]",
        isCritical && "border-destructive/50 ring-1 ring-destructive/20 animate-pulse-subtle",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1.5",
          variant === "primary" && "bg-primary",
          variant === "accent" && "bg-indigo-500",
          variant === "success" && "bg-emerald-500",
          variant === "warning" && "bg-amber-500",
          variant === "destructive" && "bg-rose-500",
        )}
      />
      
      {/* Top Row: Label + Icon */}
      <div className="flex items-start justify-between gap-1 overflow-hidden z-10">
        <div className="flex flex-col">
          <span className="text-[9px] font-black leading-tight text-muted-foreground/70 uppercase tracking-tighter line-clamp-2">
            {label}
          </span>
          {isCritical && (
            <span className="text-[7px] font-black text-rose-500 uppercase mt-0.5 flex items-center gap-0.5">
              <AlertTriangle className="h-2 w-2" /> CRITICAL
            </span>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg shadow-sm border",
              variantStyles[variant]
            )}
          >
            <div className="scale-75">{icon}</div>
          </div>
        )}
      </div>

      {/* Center Row: Value + Unit */}
      <div className="flex flex-1 flex-col items-center justify-center text-center relative z-10">
        <div className="leading-none">
          <span
            className={cn(
              valueFontSize,
              "font-mono font-black tabular-nums tracking-tighter text-foreground block leading-tight mb-1 tech-glow whitespace-nowrap",
            )}
          >
            {value}
          </span>
          <span className="text-[9px] font-black text-muted-foreground uppercase opacity-60 bg-muted/40 px-2 py-0.5 rounded-full border border-border/10 inline-block">
            {unit}
          </span>
        </div>
      </div>

      {/* Bottom Row: Hint */}
      {hint && (
        <div className="mt-auto border-t pt-1.5 z-10 bg-card/60 backdrop-blur-sm">
          <p className="truncate text-center text-[10.5px] sm:text-[11px] font-bold leading-tight text-muted-foreground/90">
            {hint}
          </p>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(0.995); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />
    </motion.div>
  );
}
