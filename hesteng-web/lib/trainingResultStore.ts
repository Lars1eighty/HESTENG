import { DEMO_CLUB_ID } from "@/data/clubs";
import { getCurrentClubId } from "@/lib/currentClub";
import type { TrainingResult } from "@/lib/trainingTypes";

const STORAGE_KEY = "hesteng.trainingResults";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function withClubId(result: TrainingResult): TrainingResult {
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
    return Array.isArray(parsed) ? parsed.map(withClubId) : [];
  } catch {
    return [];
  }
}

export function getTrainingResultsForClub(clubId = getCurrentClubId()): TrainingResult[] {
  return getTrainingResults().filter((result) => result.clubId === clubId);
}

export function getTrainingResultsForPlayer(playerId: string, clubId = getCurrentClubId()): TrainingResult[] {
  return getTrainingResultsForClub(clubId).filter((result) => result.playerId === playerId);
}

export function saveTrainingResult(result: TrainingResult): TrainingResult[] {
  const normalizedResult = withClubId(result);
  const results = getTrainingResults().filter((item) => item.id !== normalizedResult.id);
  const next = [normalizedResult, ...results];

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
