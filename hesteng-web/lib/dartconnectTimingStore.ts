import type { DartConnectTimingRecord } from "@/lib/dartconnectTiming";

const STORAGE_KEY = "hesteng.dartconnectTimingRecords";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readStorageArray<T>(key: string): T[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorageArray<T>(key: string, value: T[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeRecord(record: DartConnectTimingRecord): DartConnectTimingRecord {
  return {
    matchId: record.matchId,
    durationSeconds: Number(record.durationSeconds),
    legsPlayed: Number(record.legsPlayed),
    avgSecondsPerLeg: Number(record.avgSecondsPerLeg),
  };
}

export function getDartConnectTimingRecords(): DartConnectTimingRecord[] {
  return readStorageArray<DartConnectTimingRecord>(STORAGE_KEY)
    .map(normalizeRecord)
    .filter((record) => record.matchId && record.durationSeconds > 0 && record.legsPlayed > 0)
    .sort((a, b) => a.matchId.localeCompare(b.matchId));
}

export function getDartConnectTimingRecordsForClub(): DartConnectTimingRecord[] {
  return getDartConnectTimingRecords();
}

export function saveDartConnectTimingRecord(record: DartConnectTimingRecord): DartConnectTimingRecord[] {
  return saveDartConnectTimingRecords([record]);
}

export function saveDartConnectTimingRecords(records: DartConnectTimingRecord[]): DartConnectTimingRecord[] {
  const byMatchId = new Map<string, DartConnectTimingRecord>();

  getDartConnectTimingRecords().forEach((record) => {
    byMatchId.set(record.matchId, record);
  });
  records.forEach((record) => {
    byMatchId.set(record.matchId, normalizeRecord(record));
  });

  const next = [...byMatchId.values()].sort((a, b) => a.matchId.localeCompare(b.matchId));
  writeStorageArray(STORAGE_KEY, next);
  return next;
}

export function getDartConnectTimingMatchIds(): Set<string> {
  return new Set(getDartConnectTimingRecords().map((record) => record.matchId));
}
