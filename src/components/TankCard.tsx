import React, { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { fmt } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/lib/haptics";
import { ArrowUpDown } from "lucide-react";

interface Props {
  tank: string;
  level: number | null;
  diff: number | null;
  maxLevel?: number;
  custom?: boolean;
  onLevelChange?: (tank: string, newLevel: number) => void;
  disabled?: boolean;
}

export function TankCard({
  tank,
  level,
  diff,
  maxLevel = 1800,
  custom = false,
  onLevelChange,
  disabled = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const cardRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const currentLevel = isDragging && previewLevel != null ? previewLevel : level;
  const pct = currentLevel != null ? Math.min(100, Math.max(0, (currentLevel / maxLevel) * 100)) : 0;
  const trend = diff == null || diff === 0 ? "flat" : diff > 0 ? "up" : "down";

  // Calculate level from pointer Y coordinate
  const calcLevelFromPointer = useCallback(
    (clientY: number) => {
      if (!cardRef.current) return 0;
      const rect = cardRef.current.getBoundingClientRect();
      const yFromBottom = rect.bottom - clientY;
      const ratio = Math.max(0, Math.min(1, yFromBottom / rect.height));
      // Snap to 5 cm increments for clean dip reading
      const val = Math.round((ratio * maxLevel) / 5) * 5;
      return Math.max(0, Math.min(maxLevel, val));
    },
    [maxLevel],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !onLevelChange || isEditing) return;
    // Don't start drag if clicking on fine-tune buttons
    if ((e.target as HTMLElement).closest(".no-drag")) return;

    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const newLvl = calcLevelFromPointer(e.clientY);
    setPreviewLevel(newLvl);
    setIsDragging(true);
    hapticFeedback("medium");
    onLevelChange(tank, newLvl);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled || !onLevelChange) return;
    e.preventDefault();
    const newLvl = calcLevelFromPointer(e.clientY);
    if (newLvl !== previewLevel) {
      setPreviewLevel(newLvl);
      onLevelChange(tank, newLvl);
      if (newLvl % 50 === 0) {
        hapticFeedback("light");
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (previewLevel != null && onLevelChange) {
      onLevelChange(tank, previewLevel);
      hapticFeedback("success");
    }
    setIsDragging(false);
    setPreviewLevel(null);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setIsDragging(false);
    setPreviewLevel(null);
  };

  const handleStartEdit = () => {
    if (disabled || !onLevelChange) return;
    setEditValue(currentLevel != null ? String(currentLevel) : "");
    setIsEditing(true);
  };

  const handleCommitEdit = () => {
    setIsEditing(false);
    if (!onLevelChange) return;
    const val = editValue.trim() === "" ? 0 : Number(editValue);
    if (!isNaN(val)) {
      const next = Math.max(0, Math.min(maxLevel, val));
      onLevelChange(tank, next);
      hapticFeedback("medium");
    }
  };

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={cn(
        "group relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl border bg-card p-2.5 shadow-[var(--shadow-card)] transition-all select-none touch-none cursor-ns-resize",
        custom && "border-accent/60 ring-1 ring-accent/30",
        isDragging &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.03] shadow-xl z-20 border-primary",
      )}
      title={isRtl ? "اضغط واسحب للأعلى/للأسفل لتحديد المستوى" : "Drag up/down to adjust level"}
    >
      {/* Visual Fill Layer */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 pointer-events-none transition-all",
          isDragging ? "duration-75 opacity-35" : "duration-500 opacity-20",
        )}
        style={{
          height: `${pct}%`,
          backgroundColor: "var(--primary)",
        }}
      />

      {/* Surface Water Line when dragging or hovering */}
      <div
        className={cn(
          "absolute inset-x-0 h-1 pointer-events-none transition-all z-10",
          isDragging ? "opacity-100 bg-primary shadow-[0_0_8px_var(--primary)]" : "opacity-0 group-hover:opacity-60 bg-primary/70",
        )}
        style={{
          bottom: `${pct}%`,
          transform: "translateY(50%)",
        }}
      />

      {/* Header Info */}
      <div className="flex items-start justify-between relative z-10 pointer-events-none">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="truncate text-xs font-black tracking-tighter text-foreground">
              {tank}
            </span>
            {custom && <span className="text-accent text-[10px]">★</span>}
          </div>
          <div className="text-[9px] font-black text-foreground tabular-nums">
            {pct.toFixed(0)}%
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Subtle drag cue icon */}
          <div
            className={cn(
              "rounded px-1 py-0.5 text-[8px] font-bold flex items-center gap-0.5 transition-colors",
              isDragging
                ? "bg-primary text-primary-foreground animate-pulse"
                : "bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
            )}
          >
            <ArrowUpDown className="h-2.5 w-2.5" />
            <span className="text-[7px] hidden sm:inline">{isRtl ? "سحب" : "Drag"}</span>
          </div>

          <div
            className={cn(
              "rounded-md px-1 py-0.5 text-[8px] font-bold tabular-nums",
              trend === "up" && "bg-success/20 text-success",
              trend === "down" && "bg-destructive/20 text-destructive",
              trend === "flat" && "bg-muted text-muted-foreground",
            )}
          >
            {diff == null ? "" : `${diff > 0 ? "+" : ""}${fmt(diff)}`}
          </div>
        </div>
      </div>

      {/* Level Center Display */}
      <div className="flex flex-col items-center justify-center py-0.5 relative z-10">
        {isEditing ? (
          <div className="no-drag flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCommitEdit}
              onKeyDown={(e) => e.key === "Enter" && handleCommitEdit()}
              autoFocus
              className="w-16 h-7 text-center font-black text-sm bg-background border rounded px-1"
            />
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            className="flex flex-col items-center cursor-pointer group/num"
            title={isRtl ? "انقر للكتابة أو اسحب للتعديل" : "Click to type or drag to adjust"}
          >
            <div
              className={cn(
                "text-xl sm:text-2xl font-black tabular-nums leading-none tracking-tighter transition-transform text-foreground",
                isDragging && "scale-110 text-primary font-black",
              )}
            >
              {currentLevel != null ? fmt(currentLevel) : "—"}
            </div>
            <div className="text-[8px] font-bold text-muted-foreground opacity-70 uppercase tracking-wider flex items-center gap-1">
              <span>{t("common.cm")}</span>
              {isDragging && (
                <span className="text-primary font-bold text-[8px] animate-pulse">
                  {isRtl ? "• جاري التحديد" : "• Dragging"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
