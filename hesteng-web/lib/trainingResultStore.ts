import { DEMO_CLUB_ID } from "@/data/clubs";
import { getCurrentClubId } from "@/lib/currentClub";
import type { TrainingResult } from "@/lib/trainingTypes";

const STORAGE_KEY = "hesteng.trainingResults";
const TRAINING_RESULTS_CHANGE_EVENT = "hesteng.trainingResultsChanged";
const SHARED_TRAINING_RESULTS_API = "/api/training-results";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function withLegacyClubId(result: TrainingResult): TrainingResult {
  return {
    ...result,
    clubId: result.clubId ?? DEMO_CLUB_ID,
  };
}

function normalizeTrainingResults(results: TrainingResult[]) {
  const byKey = new Map<string, TrainingResult>();

  results.forEach((result) => {
    if (!result?.playerId || !result.exerciseId || !result.completedAt) return;
    const key = result.id || `${result.playerId}:${result.exerciseId}:${result.variant ?? ""}:${result.completedAt}`;
    byKey.set(key, result);
  });

  return [...byKey.values()].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

function writeLocalTrainingResults(results: TrainingResult[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeTrainingResults(results)));
  window.dispatchEvent(new Event(TRAINING_RESULTS_CHANGE_EVENT));
}

export function subscribeToTrainingResults(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) callback();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(TRAINING_RESULTS_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(TRAINING_RESULTS_CHANGE_EVENT, callback);
  };
}

export function getTrainingResults(): TrainingResult[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeTrainingResults(parsed) : [];
  } catch {
    return [];
  }
}

export function getTrainingResultsForClub(clubId = getCurrentClubId()): TrainingResult[] {
  return getTrainingResults()
    .map(withLegacyClubId)
    .filter((result) => result.clubId === clubId);
}

export function getTrainingResultsForPlayer(playerId: string): TrainingResult[] {
  return getTrainingResults().filter((result) => result.playerId === playerId);
}

export function saveTrainingResult(result: TrainingResult): TrainingResult[] {
  const next = normalizeTrainingResults([result, ...getTrainingResults().filter((item) => item.id !== result.id)]);

  writeLocalTrainingResults(next);
  void syncTrainingResultToSharedStore(result);
  return next;
}

export function deleteTrainingResult(resultId: string): TrainingResult[] {
  const next = getTrainingResults().filter((result) => result.id !== resultId);

  writeLocalTrainingResults(next);
  if (typeof window !== "undefined") {
    void fetch(`${SHARED_TRAINING_RESULTS_API}?resultId=${encodeURIComponent(resultId)}`, {
      method: "DELETE",
    }).catch(() => undefined);
  }

  return next;
}

async function syncTrainingResultToSharedStore(result: TrainingResult) {
  if (typeof window === "undefined") return;

  try {
    await fetch(SHARED_TRAINING_RESULTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "result", result }),
    });
  } catch {
    // Local cache keeps training usable if the dev server store is unavailable.
  }
}

export async function syncTrainingResultsFromSharedStore(playerId?: string): Promise<TrainingResult[]> {
  if (typeof window === "undefined") return [];

  const localResults = getTrainingResults();

  try {
    const response = await fetch(SHARED_TRAINING_RESULTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: localResults }),
    });
    if (!response.ok) return playerId ? getTrainingResultsForPlayer(playerId) : localResults;

    const state = await response.json() as { results?: TrainingResult[] };
    const sharedResults = normalizeTrainingResults(Array.isArray(state.results) ? state.results : []);
    writeLocalTrainingResults(sharedResults);

    return playerId ? sharedResults.filter((result) => result.playerId === playerId) : sharedResults;
  } catch {
    return playerId ? getTrainingResultsForPlayer(playerId) : localResults;
  }
}
