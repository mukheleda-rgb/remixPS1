import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { type ReportSnapshot } from './reports';

export interface AuditLog {
  id: string;
  timestamp: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT';
  entityType: 'REPORT' | 'SETTING';
  entityId: string;
  details: string;
}

interface PS1DB extends DBSchema {
  reports: {
    key: string;
    value: ReportSnapshot;
    indexes: { 'by-date': number };
  };
  auditLogs: {
    key: string;
    value: AuditLog;
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<PS1DB>> | null = null;

export async function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<PS1DB>('ps1-db', 1, {
      upgrade(db) {
        const reportStore = db.createObjectStore('reports', { keyPath: 'id' });
        reportStore.createIndex('by-date', 'createdAt');

        const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id' });
        auditStore.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export async function logAction(action: AuditLog['action'], entityType: AuditLog['entityType'], entityId: string, details: string) {
  const db = await getDB();
  if (!db) return;

  const log: AuditLog = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    action,
    entityType,
    entityId,
    details,
  };
  await db.add('auditLogs', log);
}

export async function getAllAuditLogs(): Promise<AuditLog[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex('auditLogs', 'by-timestamp');
}
