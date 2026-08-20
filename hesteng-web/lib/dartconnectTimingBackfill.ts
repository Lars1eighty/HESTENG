import { extractRecapLinks } from "@/lib/dartconnectMail";
import {
  parseDartConnectRecapTimingResult,
  type DartConnectTimingRecord,
  type DartConnectTimingSkipReason,
} from "@/lib/dartconnectTiming";
import {
  getDartConnectTimingMatchIds,
  saveDartConnectTimingRecords,
} from "@/lib/dartconnectTimingStore";

export type DartConnectBackfillCandidate = {
  id: string;
  subject?: string;
  body: string;
  recapHtml?: string;
};

export type DartConnectBackfillStatus = {
  scanned: number;
  validRecaps: number;
  imported: number;
  alreadyExisting: number;
  skipped: number;
  fetchErrors: number;
  importedMatchIds: string[];
  alreadyExistingMatchIds: string[];
  skippedItems: Array<{ id: string; reason: DartConnectTimingSkipReason | "missing-recap-link" }>;
};

export type DartConnectBackfillOptions = {
  fetchRecapHtml: (recapUrl: string, matchId: string) => Promise<string | null>;
  save?: boolean;
};

function createEmptyStatus(): DartConnectBackfillStatus {
  return {
    scanned: 0,
    validRecaps: 0,
    imported: 0,
    alreadyExisting: 0,
    skipped: 0,
    fetchErrors: 0,
    importedMatchIds: [],
    alreadyExistingMatchIds: [],
    skippedItems: [],
  };
}

export async function backfillDartConnectTimingFromRecaps(
  candidates: DartConnectBackfillCandidate[],
  options: DartConnectBackfillOptions
): Promise<DartConnectBackfillStatus> {
  const status = createEmptyStatus();
  const existingMatchIds = getDartConnectTimingMatchIds();
  const importedRecords: DartConnectTimingRecord[] = [];
  const seenInRun = new Set<string>();

  for (const candidate of candidates) {
    status.scanned += 1;
    const recapLink = extractRecapLinks(`${candidate.subject ?? ""}\n${candidate.body}`)[0];
    if (!recapLink) {
      status.skipped += 1;
      status.skippedItems.push({ id: candidate.id, reason: "missing-recap-link" });
      continue;
    }

    if (existingMatchIds.has(recapLink.matchId) || seenInRun.has(recapLink.matchId)) {
      status.alreadyExisting += 1;
      status.alreadyExistingMatchIds.push(recapLink.matchId);
      continue;
    }

    const html = candidate.recapHtml ?? await options.fetchRecapHtml(recapLink.url, recapLink.matchId);
    if (!html) {
      status.fetchErrors += 1;
      continue;
    }

    const result = parseDartConnectRecapTimingResult(html);
    if (!result.ok) {
      status.skipped += 1;
      status.skippedItems.push({ id: candidate.id, reason: result.reason });
      continue;
    }

    status.validRecaps += 1;
    status.imported += 1;
    status.importedMatchIds.push(result.record.matchId);
    importedRecords.push(result.record);
    seenInRun.add(result.record.matchId);
  }

  if (options.save !== false && importedRecords.length > 0) {
    saveDartConnectTimingRecords(importedRecords);
  }

  return status;
}

export const backfillDartConnectTimingFromMails = backfillDartConnectTimingFromRecaps;
