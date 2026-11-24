import * as XLSX from "xlsx";
import { Reading, FlowRow, makeId, VISIBLE_TANKS, RECEIVE_PIPES, PUMP_PIPES } from "./calculations";

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

// ===== Readings =====
export function exportReadingsXlsx(
  readings: Reading[],
  customTanks: string[],
  receive: FlowRow[],
  pump: FlowRow[],
) {
  const tanks = [...VISIBLE_TANKS, ...customTanks];
  const wb = XLSX.utils.book_new();

  const readingsRows = readings.map((r) => {
    const row: Record<string, any> = { HOUR: r.hour };
    tanks.forEach((t) => (row[t] = r.levels[t] ?? ""));
    return row;
  });
  const ws1 = XLSX.utils.json_to_sheet(readingsRows, { header: ["HOUR", ...tanks] });
  XLSX.utils.book_append_sheet(wb, ws1, "Readings");

  const recRows = receive.map((r) => {
    const row: Record<string, any> = { HOUR: r.hour };
    RECEIVE_PIPES.forEach((p) => (row[p] = r.values[p] ?? ""));
    return row;
  });
  const ws2 = XLSX.utils.json_to_sheet(recRows, { header: ["HOUR", ...RECEIVE_PIPES] });
  XLSX.utils.book_append_sheet(wb, ws2, "Receive");

  const pumpRows = pump.map((r) => {
    const row: Record<string, any> = { HOUR: r.hour };
    PUMP_PIPES.forEach((p) => (row[p] = r.values[p] ?? ""));
    return row;
  });
  const ws3 = XLSX.utils.json_to_sheet(pumpRows, { header: ["HOUR", ...PUMP_PIPES] });
  XLSX.utils.book_append_sheet(wb, ws3, "Pump");

  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  downloadWorkbook(wb, `PS1-Readings-${stamp}.xlsx`);
}

export interface ImportedData {
  readings?: Reading[];
  receive?: FlowRow[];
  pump?: FlowRow[];
  newCustomTanks?: string[];
}

export async function importReadingsXlsx(file: File): Promise<ImportedData> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const out: ImportedData = {};

  const sheetReadings = wb.Sheets["Readings"] || wb.Sheets[wb.SheetNames[0]];
  if (sheetReadings) {
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheetReadings, { defval: "" });
    if (data.length > 0) {
      const headers = Object.keys(data[0]).filter((h) => h.toUpperCase() !== "HOUR");
      const customs = headers.filter((h) => !VISIBLE_TANKS.includes(h as any));
      out.newCustomTanks = customs;
      out.readings = data.map((row) => {
        const levels: Record<string, number | null> = {};
        [...VISIBLE_TANKS, ...customs].forEach((t) => {
          const v = row[t];
          levels[t] = v === "" || v == null ? null : Number(v);
        });
        return { id: makeId(), hour: String(row["HOUR"] ?? row["hour"] ?? "00:00"), levels };
      });
    }
  }

  const parseFlow = (sheetName: string, pipes: readonly string[]): FlowRow[] | undefined => {
    const sh = wb.Sheets[sheetName];
    if (!sh) return undefined;
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sh, { defval: "" });
    return data.map((row) => {
      const values: Record<string, number | null> = {};
      pipes.forEach((p) => {
        const v = row[p];
        values[p] = v === "" || v == null ? null : Number(v);
      });
      return { id: makeId(), hour: String(row["HOUR"] ?? "00:00"), values };
    });
  };
  out.receive = parseFlow("Receive", RECEIVE_PIPES);
  out.pump = parseFlow("Pump", PUMP_PIPES);

  return out;
}

// ===== Valves =====
export interface ValveRow {
  id: string;
  name: string;
  location: string;
  notes: string;
}

export function exportValvesXlsx(valves: ValveRow[]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    valves.map((v) => ({ "اسم الصمام": v.name, الموقع: v.location, ملاحظات: v.notes })),
  );
  ws["!cols"] = [{ wch: 20 }, { wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, "Valves");
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  downloadWorkbook(wb, `PS1-Valves-${stamp}.xlsx`);
}

export async function importValvesXlsx(file: File): Promise<ValveRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets["Valves"] || wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  return data.map((row) => ({
    id: makeId(),
    name: String(row["اسم الصمام"] ?? row["name"] ?? row["Name"] ?? ""),
    location: String(row["الموقع"] ?? row["location"] ?? row["Location"] ?? ""),
    notes: String(row["ملاحظات"] ?? row["notes"] ?? row["Notes"] ?? ""),
  }));
}
