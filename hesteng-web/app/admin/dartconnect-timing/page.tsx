"use client";

import { useState } from "react";
import Link from "next/link";
import {
  backfillDartConnectTimingFromRecaps,
  type DartConnectBackfillCandidate,
  type DartConnectBackfillStatus,
} from "@/lib/dartconnectTimingBackfill";
import { getDartConnectTimingRecords } from "@/lib/dartconnectTimingStore";
import type { DartConnectTimingRecord } from "@/lib/dartconnectTiming";
import { getCurrentClubId } from "@/lib/currentClub";
import {
  calculateEloMatchupTimingProfiles,
  calculatePlayerTimingProfiles,
  calculateTimingDataQuality,
  MIN_TIMED_MATCHES_FOR_PLAYER_PROFILE,
} from "@/lib/playerTimingEngine";

const RUNNER_STORAGE_KEY = "hesteng.dartconnectTimingBackfillRunner.v2";

type RunnerState = {
  candidates: DartConnectBackfillCandidate[];
  cursor: number;
  batchSize: number;
  cumulativeStatus: DartConnectBackfillStatus;
};

type ImportInput = DartConnectBackfillCandidate & {
  recapUrl?: string;
  matchId?: string;
};

function emptyStatus(): DartConnectBackfillStatus {
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

function mergeStatus(current: DartConnectBackfillStatus, next: DartConnectBackfillStatus): DartConnectBackfillStatus {
  return {
    scanned: current.scanned + next.scanned,
    validRecaps: current.validRecaps + next.validRecaps,
    imported: current.imported + next.imported,
    alreadyExisting: current.alreadyExisting + next.alreadyExisting,
    skipped: current.skipped + next.skipped,
    fetchErrors: current.fetchErrors + next.fetchErrors,
    importedMatchIds: [...current.importedMatchIds, ...next.importedMatchIds],
    alreadyExistingMatchIds: [...current.alreadyExistingMatchIds, ...next.alreadyExistingMatchIds],
    skippedItems: [...current.skippedItems, ...next.skippedItems],
  };
}

function normalizeInputItem(item: ImportInput, index: number): DartConnectBackfillCandidate {
  const recapUrl = item.recapUrl ?? (item.matchId ? `https://recap.dartconnect.com/matches/${item.matchId}` : "");

  return {
    id: item.id ?? item.matchId ?? `batch-item-${index + 1}`,
    subject: item.subject,
    body: item.body ?? recapUrl,
    recapHtml: item.recapHtml,
  };
}

function readRunnerState(): RunnerState {
  if (typeof window === "undefined") {
    return { candidates: [], cursor: 0, batchSize: 50, cumulativeStatus: emptyStatus() };
  }

  try {
    const raw = window.localStorage.getItem(RUNNER_STORAGE_KEY);
    if (!raw) return { candidates: [], cursor: 0, batchSize: 50, cumulativeStatus: emptyStatus() };
    const parsed = JSON.parse(raw) as Partial<RunnerState>;

    return {
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
      cursor: typeof parsed.cursor === "number" ? parsed.cursor : 0,
      batchSize: typeof parsed.batchSize === "number" ? parsed.batchSize : 50,
      cumulativeStatus: parsed.cumulativeStatus ?? emptyStatus(),
    };
  } catch {
    return { candidates: [], cursor: 0, batchSize: 50, cumulativeStatus: emptyStatus() };
  }
}

function writeRunnerState(state: RunnerState) {
  window.localStorage.setItem(RUNNER_STORAGE_KEY, JSON.stringify(state));
}

function formatSeconds(seconds: number) {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export default function DartConnectTimingAdminPage() {
  const [runner, setRunner] = useState<RunnerState>(() => readRunnerState());
  const [batchInput, setBatchInput] = useState("");
  const [lastStatus, setLastStatus] = useState<DartConnectBackfillStatus | null>(null);
  const [records, setRecords] = useState<DartConnectTimingRecord[]>(() => getDartConnectTimingRecords());
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");

  function persistRunner(next: RunnerState) {
    setRunner(next);
    writeRunnerState(next);
  }

  function loadBatchInput() {
    try {
      const parsed = JSON.parse(batchInput) as ImportInput[] | { candidates?: ImportInput[] };
      const source = Array.isArray(parsed) ? parsed : parsed.candidates;
      if (!Array.isArray(source)) {
        setMessage("JSON skal være et array eller { candidates: [...] }.");
        return;
      }

      const candidates = source.map(normalizeInputItem);
      persistRunner({
        candidates,
        cursor: 0,
        batchSize: runner.batchSize,
        cumulativeStatus: emptyStatus(),
      });
      setLastStatus(null);
      setMessage(`Indlæst ${candidates.length} recap-kandidater.`);
    } catch {
      setMessage("Kunne ikke læse JSON batch-data.");
    }
  }

  async function processNextBatch() {
    const batch = runner.candidates.slice(runner.cursor, runner.cursor + runner.batchSize);
    if (batch.length === 0) {
      setMessage("Ingen flere kandidater i køen.");
      return;
    }

    setIsProcessing(true);
    setMessage("");

    const status = await backfillDartConnectTimingFromRecaps(batch, {
      fetchRecapHtml: async (recapUrl) => {
        const response = await fetch(`/api/admin/dartconnect-recap?url=${encodeURIComponent(recapUrl)}`);
        return response.ok ? response.text() : null;
      },
    });

    const nextRunner = {
      ...runner,
      cursor: runner.cursor + batch.length,
      cumulativeStatus: mergeStatus(runner.cumulativeStatus, status),
    };

    persistRunner(nextRunner);
    setLastStatus(status);
    setRecords(getDartConnectTimingRecords());
    setIsProcessing(false);
  }

  function resetCursor() {
    persistRunner({ ...runner, cursor: 0, cumulativeStatus: emptyStatus() });
    setLastStatus(null);
    setMessage("Cursor nulstillet. Samme batch kan køres igen for idempotens-test.");
  }

  function updateBatchSize(batchSize: number) {
    persistRunner({ ...runner, batchSize });
  }

  const remaining = Math.max(0, runner.candidates.length - runner.cursor);
  const avgLegSeconds = records.length > 0
    ? records.reduce((sum, record) => sum + record.avgSecondsPerLeg, 0) / records.length
    : 0;
  const clubId = getCurrentClubId();
  const playerProfiles = calculatePlayerTimingProfiles({ clubId, records });
  const eloMatchupProfiles = calculateEloMatchupTimingProfiles({ clubId, records });
  const timingQuality = calculateTimingDataQuality({ clubId, records });

  return (
    <main className="min-h-screen bg-[#111111] px-4 py-6 text-zinc-100 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard" className="text-sm font-semibold text-orange-300">HESTENG admin</Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight">DartConnect timing import</h1>
            <p className="mt-1 max-w-3xl text-sm text-zinc-400">
              Minimal timing-import: matchId, Match Length, Games/Legs og sekunder pr. leg. Profiler beregnes kun ved sikker matchId-kobling.
            </p>
          </div>
          <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-orange-200">
            Scheduler bruger ikke timing endnu
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Recap batch</h2>
                <p className="text-sm text-zinc-400">Indsæt recap-URLer, matchIder eller batch JSON fra eksisterende importflow.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[50, 100].map((size) => (
                  <button
                    key={size}
                    onClick={() => updateBatchSize(size)}
                    className={`rounded-lg px-3 py-2 text-sm font-bold ${runner.batchSize === size ? "bg-orange-500 text-black" : "bg-white/10 text-zinc-200"}`}
                    type="button"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={batchInput}
              onChange={(event) => setBatchInput(event.target.value)}
              className="mt-4 min-h-52 w-full rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-zinc-100 outline-none focus:border-orange-400"
              placeholder='JSON: [{ "id": "mail-1", "body": "https://recap.dartconnect.com/matches/..." }] eller { "candidates": [...] }'
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={loadBatchInput} className="rounded-lg bg-zinc-100 px-4 py-3 text-sm font-black text-black" type="button">
                Indlæs batch
              </button>
              <button
                onClick={processNextBatch}
                disabled={isProcessing || remaining === 0}
                className="rounded-lg bg-orange-500 px-4 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
              >
                {isProcessing ? "Importerer..." : "Kør næste batch"}
              </button>
              <button onClick={resetCursor} className="rounded-lg bg-white/10 px-4 py-3 text-sm font-bold text-zinc-100" type="button">
                Nulstil cursor
              </button>
            </div>

            {message ? <p className="mt-3 text-sm text-orange-200">{message}</p> : null}
          </div>

          <div className="grid gap-3">
            <StatusCard title="Kø" values={[
              ["Kandidater", runner.candidates.length],
              ["Cursor", runner.cursor],
              ["Remaining", remaining],
              ["Batch", runner.batchSize],
            ]} />
            <StatusCard title="Import" values={[
              ["Scannet", runner.cumulativeStatus.scanned],
              ["Valid recaps", runner.cumulativeStatus.validRecaps],
              ["Importeret", runner.cumulativeStatus.imported],
              ["Eksisterede", runner.cumulativeStatus.alreadyExisting],
              ["Skipped", runner.cumulativeStatus.skipped],
              ["Fetch errors", runner.cumulativeStatus.fetchErrors],
            ]} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <StatusCard title="Timing records" values={[
            ["Kampe", records.length],
            ["Avg leg", Math.round(avgLegSeconds)],
            ["Sidste import", lastStatus?.imported ?? 0],
            ["Sidste skipped", lastStatus?.skipped ?? 0],
          ]} />
          <StatusCard title="Datakvalitet" values={[
            ["Koblet kamp", timingQuality.linkedToCompletedMatch],
            ["Ukoblet", timingQuality.unlinkedTimingRecords],
            ["Spillerkoblet", timingQuality.linkedToPlayers],
            ["Outliers", timingQuality.outliers],
          ]} />
          <StatusCard title="Historisk ELO" values={[
            ["ELO koblet", timingQuality.linkedHistoricalElo],
            ["Mangler ELO", timingQuality.missingHistoricalElo],
            ["Spillere >=5", timingQuality.playerProfilesWithEnoughHistory],
            ["Matchups >=5", timingQuality.eloMatchupsWithEnoughHistory],
          ]} />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold uppercase tracking-wide">Player tempo</h2>
                <p className="text-sm text-zinc-400">Kun exact matchId-koblede kampe tæller til begge spillere.</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-200">
                Robust profil: {MIN_TIMED_MATCHES_FOR_PLAYER_PROFILE}+ kampe
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
              <div className="grid grid-cols-[minmax(0,1fr)_70px_110px_110px] gap-2 bg-black/30 p-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                <span>Navn</span>
                <span>Kampe</span>
                <span>Median kamp</span>
                <span>Median/leg</span>
              </div>
              {playerProfiles.slice(0, 80).map((profile) => (
                <div key={profile.playerId} className="grid grid-cols-[minmax(0,1fr)_70px_110px_110px] gap-2 border-t border-white/10 p-3 text-sm">
                  <span className="truncate font-semibold">{profile.canonicalName}</span>
                  <span>{profile.matchesTimed}</span>
                  <span>{formatSeconds(profile.medianMatchDurationSeconds)}</span>
                  <span>{formatSeconds(profile.medianSecondsPerLeg)}</span>
                </div>
              ))}
              {playerProfiles.length === 0 ? <p className="p-4 text-sm text-zinc-400">Ingen spillerprofiler endnu. Timing matchId skal matche en færdig HESTENG-kamp.</p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold uppercase tracking-wide">ELO matchups</h2>
                <p className="text-sm text-zinc-400">Bruger kun ELO før kampen fra ELO-event på samme matchId.</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-200">
                Current ELO bruges ikke
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
              <div className="grid grid-cols-[1fr_1fr_70px_110px_110px] gap-2 bg-black/30 p-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
                <span>ELO A</span>
                <span>ELO B</span>
                <span>Kampe</span>
                <span>Median kamp</span>
                <span>Median/leg</span>
              </div>
              {eloMatchupProfiles.map((profile) => (
                <div key={`${profile.eloA}-${profile.eloB}`} className="grid grid-cols-[1fr_1fr_70px_110px_110px] gap-2 border-t border-white/10 p-3 text-sm">
                  <span>{profile.eloA}</span>
                  <span>{profile.eloB}</span>
                  <span>{profile.matchesTimed}</span>
                  <span>{formatSeconds(profile.medianMatchDurationSeconds)}</span>
                  <span>{formatSeconds(profile.medianSecondsPerLeg)}</span>
                </div>
              ))}
              {eloMatchupProfiles.length === 0 ? <p className="p-4 text-sm text-zinc-400">Ingen ELO matchup-profiler endnu. Det kræver både timing, CompletedMatch og ELO-event på samme matchId.</p> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 lg:col-span-2">
            <h2 className="text-lg font-bold">Skipped / flagged</h2>
            <div className="mt-4 max-h-60 overflow-auto rounded-lg border border-white/10">
              {runner.cumulativeStatus.skippedItems.length === 0 ? (
                <p className="p-4 text-sm text-zinc-400">Ingen skipped records.</p>
              ) : (
                runner.cumulativeStatus.skippedItems.slice(-80).map((item, index) => (
                  <div key={`${item.id}-${index}`} className="grid grid-cols-[1fr_180px] gap-2 border-b border-white/10 p-3 text-sm last:border-b-0">
                    <span className="truncate">{item.id}</span>
                    <span className="text-orange-200">{item.reason}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <h2 className="text-lg font-bold">Seneste timing records</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
            <div className="grid grid-cols-[1fr_110px_80px_110px] gap-2 bg-black/30 p-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
              <span>Match ID</span>
              <span>Varighed</span>
              <span>Legs</span>
              <span>Avg/leg</span>
            </div>
            {records.slice(0, 80).map((record) => (
              <div key={record.matchId} className="grid grid-cols-[1fr_110px_80px_110px] gap-2 border-t border-white/10 p-3 text-sm">
                <span className="truncate font-mono text-xs">{record.matchId}</span>
                <span>{formatSeconds(record.durationSeconds)}</span>
                <span>{record.legsPlayed}</span>
                <span>{formatSeconds(record.avgSecondsPerLeg)}</span>
              </div>
            ))}
            {records.length === 0 ? <p className="p-4 text-sm text-zinc-400">Ingen timing records endnu.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusCard({ title, values }: { title: string; values: Array<[string, number]> }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {values.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-black/30 p-3">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
            <dd className="mt-1 text-2xl font-black text-orange-300">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
