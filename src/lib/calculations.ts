// Constants derived from the original Excel model (PS1 Receive Pumping)
export const TANK_KEYS = ["B1", "B2", "K3", "K4", "R1", "R2", "R4", "K1", "K2", "R3"] as const;
export type TankKey = (typeof TANK_KEYS)[number];

export const VISIBLE_TANKS: TankKey[] = ["B1", "B2", "K3", "K4", "R1", "R2", "R4", "K1", "K2", "R3"];

// V = (sum_levels * 43) - 4200    (M³)
export const LEVEL_TO_M3_FACTOR = 43;
export const M3_OFFSET = 4200;
// barrels = m3 * 6.2898
export const M3_TO_BARREL = 6.2898;
// dead stock (unavailable for pumping)
export const DEAD_STOCK_M3 = 70000;
// total tank farm capacity
export const TOTAL_CAPACITY_M3 = 514000;
// each extra tank added increases total capacity by this amount (M³)
export const CAPACITY_PER_EXTRA_TANK_M3 = 76000;
// alternative bonus capacity option (M³)
export const CAPACITY_PER_EXTRA_TANK_ALT_M3 = 70000;

// Default hours — first reading at 00:00, then every 2 hours
export const DEFAULT_HOURS = [
  "00:00",
  "02:00",
  "04:00",
  "06:00",
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "22:00",
  "24:00",
];

// Receive/Pump 2-hour intervals (page 2 bottom table)
export const RP_HOURS = [
  "02:00",
  "04:00",
  "06:00",
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "22:00",
  "24:00",
];

/** Add `hours` (can be 2) to a "HH:MM" string and return next "HH:MM". Wraps to 24:00 then 02:00. */
export function addHours(hour: string, delta: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hour.trim());
  if (!m) return "00:00";
  let h = parseInt(m[1], 10);
  const mm = m[2];
  h = h + delta;
  // normalize: keep within 0..24 inclusive (24:00 is allowed as an end-of-day marker)
  while (h > 24) h -= 24;
  while (h < 0) h += 24;
  return `${String(h).padStart(2, "0")}:${mm}`;
}

// Pipelines feeding PS1 (RECEIVE side)
export const RECEIVE_PIPES = [
  "N. RUMAILA",
  "WQ",
  "LUHAIS",
  "MUSHRIF",
  "SHAM / QURI",
  "ARTAWI",
  "SUBA",
  "TRANS 2",
] as const;
export type ReceivePipe = (typeof RECEIVE_PIPES)[number];

// Pumping out pipelines
export const PUMP_PIPES = ["TRANS", "FAW", "STRATIGIC PIPE"] as const;
export type PumpPipe = (typeof PUMP_PIPES)[number];

export interface Reading {
  id: string;
  hour: string;
  levels: Record<string, number | null>;
}

export function sumLevels(
  levels: Record<string, number | null>,
  keys: readonly string[] = TANK_KEYS,
): number {
  return keys.reduce((acc, k) => acc + (levels[k] ?? 0), 0);
}

export interface ComputedRow {
  reading: Reading;
  diffs: Record<string, number | null>;
  totalStockM3: number | null;
  unavailPumpM3: number | null;
  availPumpM3: number | null;
  freeVolumeM3: number | null;
  totalStockBarrel: number | null;
  unavailPumpBarrel: number | null;
  availPumpBarrel: number | null;
  freeVolumeBarrel: number | null;
}

/** Each extra tank added to the system increases the unavailable (dead) stock by this amount (M³). */
export const DEAD_STOCK_PER_EXTRA_TANK_M3 = 10000;

export function compute(
  readings: Reading[],
  extraTanks: readonly string[] = [],
  bonusCapacityM3 = 0,
): ComputedRow[] {
  const extraDead = extraTanks.length * DEAD_STOCK_PER_EXTRA_TANK_M3;
  const allKeys: readonly string[] = [...TANK_KEYS, ...extraTanks];
  return readings.map((reading, idx) => {
    const prev = idx > 0 ? readings[idx - 1] : null;
    const diffs = {} as Record<string, number | null>;
    for (const k of allKeys) {
      if (reading.levels[k] == null || prev == null || prev.levels[k] == null) {
        diffs[k] = null;
      } else {
        diffs[k] = (reading.levels[k] as number) - (prev.levels[k] as number);
      }
    }
    const sum = sumLevels(reading.levels, allKeys);
    if (sum === 0) {
      return {
        reading,
        diffs,
        totalStockM3: null,
        unavailPumpM3: null,
        availPumpM3: null,
        freeVolumeM3: null,
        totalStockBarrel: null,
        unavailPumpBarrel: null,
        availPumpBarrel: null,
        freeVolumeBarrel: null,
      };
    }

    // stock_m3 = (Σ levels × 43) − (600 × عدد الخزانات التي تحتوي على بيانات مدخلة)
    const tanksWithData = allKeys.filter(k => reading.levels[k] != null).length;
    const totalStockM3 = sum * LEVEL_TO_M3_FACTOR - (600 * tanksWithData);
    const unavailPumpM3 = DEAD_STOCK_M3 + extraDead;
    const availPumpM3 = totalStockM3 - unavailPumpM3;
    const capacity = TOTAL_CAPACITY_M3 + bonusCapacityM3;
    const freeVolumeM3 = capacity - totalStockM3;
    return {
      reading,
      diffs,
      totalStockM3,
      unavailPumpM3,
      availPumpM3,
      freeVolumeM3,
      totalStockBarrel: totalStockM3 * M3_TO_BARREL,
      unavailPumpBarrel: unavailPumpM3 * M3_TO_BARREL,
      availPumpBarrel: availPumpM3 * M3_TO_BARREL,
      freeVolumeBarrel: freeVolumeM3 * M3_TO_BARREL,
    };
  });
}

export function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function emptyLevels(extraTanks: readonly string[] = []): Record<string, number | null> {
  const o: Record<string, number | null> = {};
  [...TANK_KEYS, ...extraTanks].forEach((k) => (o[k] = null));
  return o;
}

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultReadings(): Reading[] {
  return DEFAULT_HOURS.map((h) => ({
    id: makeId(),
    hour: h,
    levels: emptyLevels(),
  }));
}

// ========== RECEIVE / PUMP flow tables ==========
export interface FlowRow {
  id: string;
  hour: string;
  // 2-hour flow per pipe (raw input)
  values: Record<string, number | null>;
}

export interface ComputedFlowRow extends FlowRow {
  // accumulated values per pipe
  accum: Record<string, number>;
}

export function emptyFlowValues(pipes: readonly string[]): Record<string, number | null> {
  const o: Record<string, number | null> = {};
  pipes.forEach((p) => (o[p] = null));
  return o;
}

export function defaultFlowRows(pipes: readonly string[]): FlowRow[] {
  return RP_HOURS.map((h) => ({
    id: makeId(),
    hour: h,
    values: emptyFlowValues(pipes),
  }));
}

export function computeFlow(
  rows: FlowRow[],
  pipes: readonly string[],
  computedValues?: Record<string, (number | null)[]>,
): ComputedFlowRow[] {
  const running: Record<string, number> = {};
  pipes.forEach((p) => (running[p] = 0));
  return rows.map((r, idx) => {
    const accum: Record<string, number> = {};
    const values: Record<string, number | null> = { ...r.values };
    for (const p of pipes) {
      // If pipe has computed override, use it instead of manual input
      if (computedValues && computedValues[p]) {
        values[p] = computedValues[p][idx] ?? null;
      }
      running[p] += values[p] ?? 0;
      accum[p] = running[p];
    }
    return { ...r, values, accum };
  });
}

// total accumulated across all pipes for a flow table (last row = grand total)
export function flowGrandTotal(rows: ComputedFlowRow[], pipes: readonly string[]): number {
  if (rows.length === 0) return 0;
  const last = rows[rows.length - 1];
  return pipes.reduce((acc, p) => acc + (last.accum[p] ?? 0), 0);
}
