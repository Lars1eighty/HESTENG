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

function writePlayerTrainingResultsToCache(playerId: string, playerResults: TrainingResult[]) {
  const otherResults = getTrainingResults().filter((result) => result.playerId !== playerId);
  writeLocalTrainingResults([...playerResults, ...otherResults]);
}

export function saveTrainingResult(result: TrainingResult): TrainingResult[] {
  const next = normalizeTrainingResults([result, ...getTrainingResults().filter((item) => item.id !== result.id)]);

  writeLocalTrainingResults(next);
  void saveTrainingResultToSharedStore(result);
  return next;
}

export function deleteTrainingResult(resultId: string): TrainingResult[] {
  const result = getTrainingResults().find((item) => item.id === resultId);
  const next = getTrainingResults().filter((result) => result.id !== resultId);

  writeLocalTrainingResults(next);
  if (typeof window !== "undefined") {
    const playerId = result?.playerId;
    const url = playerId
      ? `${SHARED_TRAINING_RESULTS_API}?resultId=${encodeURIComponent(resultId)}&playerId=${encodeURIComponent(playerId)}`
      : `${SHARED_TRAINING_RESULTS_API}?resultId=${encodeURIComponent(resultId)}`;
    void fetch(url, {
      method: "DELETE",
      headers: playerId ? { "x-hesteng-player-id": playerId } : undefined,
    }).catch(() => undefined);
  }

  return next;
}

export async function saveTrainingResultToSharedStore(result: TrainingResult): Promise<TrainingResult[]> {
  if (typeof window === "undefined") return [];

  try {
    const response = await fetch(`${SHARED_TRAINING_RESULTS_API}?playerId=${encodeURIComponent(result.playerId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hesteng-player-id": result.playerId,
      },
      body: JSON.stringify({ type: "result", result }),
    });
    if (!response.ok) {
      const fallbackResults = normalizeTrainingResults([result, ...getTrainingResultsForPlayer(result.playerId).filter((item) => item.id !== result.id)]);
      writePlayerTrainingResultsToCache(result.playerId, fallbackResults);
      return fallbackResults;
    }

    const state = await response.json() as { results?: TrainingResult[] };
    const playerResults = normalizeTrainingResults(Array.isArray(state.results) ? state.results : []);
    writePlayerTrainingResultsToCache(result.playerId, playerResults);

    return playerResults;
  } catch {
    // Local cache keeps training usable if the dev server store is unavailable.
    const fallbackResults = normalizeTrainingResults([result, ...getTrainingResultsForPlayer(result.playerId).filter((item) => item.id !== result.id)]);
    writePlayerTrainingResultsToCache(result.playerId, fallbackResults);
    return fallbackResults;
  }
}

export async function syncTrainingResultsFromSharedStore(playerId?: string): Promise<TrainingResult[]> {
  if (typeof window === "undefined") return [];

  const localResults = getTrainingResults();
  const localPlayerResults = playerId
    ? localResults.filter((result) => result.playerId === playerId)
    : localResults;

  try {
    const response = playerId
      ? await fetch(`${SHARED_TRAINING_RESULTS_API}?playerId=${encodeURIComponent(playerId)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-hesteng-player-id": playerId,
          },
          body: JSON.stringify({ playerId, results: localPlayerResults }),
        })
      : await fetch(SHARED_TRAINING_RESULTS_API);
    if (!response.ok) return playerId ? localPlayerResults : localResults;

    const state = await response.json() as { results?: TrainingResult[] };
    const sharedResults = normalizeTrainingResults(Array.isArray(state.results) ? state.results : []);
    if (playerId) {
      writePlayerTrainingResultsToCache(playerId, sharedResults);
    } else {
      writeLocalTrainingResults(sharedResults);
    }

    return playerId ? sharedResults.filter((result) => result.playerId === playerId) : sharedResults;
  } catch {
    return playerId ? localPlayerResults : localResults;
  }
}
