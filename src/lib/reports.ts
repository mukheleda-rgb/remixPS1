import { Reading, FlowRow } from "./calculations";
import { type BranchRow } from "@/components/BranchesTable";
import { getDB, logAction } from "./db";

export interface ReportSnapshot {
  id: string;
  name: string;
  createdAt: number;
  readings: Reading[];
  customTanks: string[];
  tankBoosts: Record<string, number>;
  receiveRows: FlowRow[];
  pumpRows: FlowRow[];
  branches: BranchRow[];
  balancedPipe: string;
  pipeLabels: Record<string, string>;
}

const STORAGE_KEY = "ps1-saved-reports";

export async function loadReports(): Promise<ReportSnapshot[]> {
  if (typeof window === "undefined") return [];
  
  // Try IndexedDB first
  try {
    const db = await getDB();
    if (db) {
      const reports = await db.getAllFromIndex('reports', 'by-date');
      if (reports.length > 0) return reports.reverse();
    }
  } catch (e) {
    console.error("Failed to load from IndexedDB, falling back to localStorage", e);
  }

  // Fallback to localStorage
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const reports = raw ? JSON.parse(raw) : [];
    
    // Seed IndexedDB if needed
    if (reports.length > 0) {
      const db = await getDB();
      if (db) {
        for (const r of reports) {
          await db.put('reports', r);
        }
      }
    }
    return reports;
  } catch (e) {
    console.error("Failed to load reports from localStorage", e);
    return [];
  }
}

export async function addReport(report: ReportSnapshot) {
  if (typeof window === "undefined") return;
  
  try {
    const db = await getDB();
    if (db) {
      await db.add('reports', report);
      await logAction('CREATE', 'REPORT', report.id, `Created report: ${report.name}`);
    }
  } catch (e) {
    console.error("Failed to add report to IndexedDB", e);
  }

  // Sync to localStorage as backup
  const reports = await loadReports();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export async function deleteReport(id: string) {
  if (typeof window === "undefined") return;
  
  try {
    const db = await getDB();
    if (db) {
      await db.delete('reports', id);
      await logAction('DELETE', 'REPORT', id, `Deleted report`);
    }
  } catch (e) {
    console.error("Failed to delete report from IndexedDB", e);
  }

  const reports = (await loadReports()).filter((r) => r.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export async function deleteAllReports() {
  if (typeof window === "undefined") return;
  
  try {
    const db = await getDB();
    if (db) {
      await db.clear('reports');
      await logAction('DELETE', 'REPORT', 'ALL', `Deleted all reports`);
    }
  } catch (e) {
    console.error("Failed to clear reports from IndexedDB", e);
  }
  
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}

export async function saveReports(reports: ReportSnapshot[]) {
  if (typeof window === "undefined") return;
  
  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction('reports', 'readwrite');
      await tx.store.clear();
      for (const r of reports) {
        await tx.store.put(r);
      }
      await tx.done;
    }
  } catch (e) {
    console.error("Failed to save reports to IndexedDB", e);
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}
