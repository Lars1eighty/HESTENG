import { DEMO_CLUB_ID } from "@/data/clubs";
import { getCurrentClubId } from "@/lib/currentClub";
import type { TrainingResult } from "@/lib/trainingTypes";

const STORAGE_KEY = "hesteng.trainingResults";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function withLegacyClubId(result: TrainingResult): TrainingResult {
  return {
    ...result,
    clubId: result.clubId ?? DEMO_CLUB_ID,
  };
}

export function getTrainingResults(): TrainingResult[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
  const results = getTrainingResults().filter((item) => item.id !== result.id);
  const next = [result, ...results];

  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}

export function deleteTrainingResult(resultId: string): TrainingResult[] {
  const next = getTrainingResults().filter((result) => result.id !== resultId);

  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}
