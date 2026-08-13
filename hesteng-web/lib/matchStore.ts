export type CompletedPlayerStats = {
  name: string;
  legs: number;
  totalScored: number;
  entries: number;
  average: number;
  checkouts: number;
  checkoutAttempts: number;
  checkoutPercent: number;
  oneEighties: number;
  fastestLegDarts: number | null;
};

export type CompletedMatch = {
  id: string;
  player1: string;
  player2: string;
  winner: string;
  score1: number;
  score2: number;
  bestOfLegs: number;
  board: number | null;
  pool: string | null;
  round: number | null;
  status: "finished";
  finishedAt: string;
  players: [CompletedPlayerStats, CompletedPlayerStats];
};

const STORAGE_KEY = "hesteng.completedMatches";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function getCompletedMatches(): CompletedMatch[] {
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

export function saveCompletedMatch(match: CompletedMatch): CompletedMatch[] {
  const matches = getCompletedMatches().filter((item) => item.id !== match.id);
  const next = [match, ...matches];
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function getCompletedMatch(id: string): CompletedMatch | null {
  return getCompletedMatches().find((match) => match.id === id) ?? null;
}
