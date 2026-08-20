import { DEMO_CLUB_ID } from "@/data/clubs";

export type CompletedPlayerStats = {
  name: string;
  legs: number;
  totalScored: number;
  entries: number;
  average: number;
  checkouts: number;
  checkoutAttempts: number;
  checkoutPercent: number;
  highestCheckout?: number;
  oneEighties: number;
  fastestLegDarts: number | null;
};

export type CompletedMatch = {
  id: string;
  clubId?: string;
  clubNightId?: string;
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
  startedAt?: string;
  finishedAt: string;
  durationSeconds?: number;
  legsPlayed?: number;
  avgSecondsPerLeg?: number;
  timingSource?: "hesteng-scorer" | "dartconnect-recap";
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

function withClubId(match: CompletedMatch, clubId: string): CompletedMatch {
  return {
    ...match,
    clubId: match.clubId ?? clubId,
  };
}

export function getCompletedMatchesForClub(clubId: string): CompletedMatch[] {
  return getCompletedMatches()
    .map((match) => withClubId(match, DEMO_CLUB_ID))
    .filter((match) => match.clubId === clubId);
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

export function getCompletedMatchInClub(clubId: string, id: string): CompletedMatch | null {
  const match = getCompletedMatch(id);
  if (!match) return null;
  const matchClubId = match.clubId ?? DEMO_CLUB_ID;
  return matchClubId === clubId ? withClubId(match, clubId) : null;
}

export function getCompletedMatchesForClubNight(clubNightId: string, matchIds: string[] = []): CompletedMatch[] {
  const ids = new Set(matchIds);
  return getCompletedMatches().filter((match) => match.clubNightId === clubNightId || ids.has(match.id));
}

export function getCompletedMatchesForClubNightInClub(clubId: string, clubNightId: string, matchIds: string[] = []): CompletedMatch[] {
  const ids = new Set(matchIds);
  return getCompletedMatches()
    .map((match) => withClubId(match, match.clubId ?? DEMO_CLUB_ID))
    .filter((match) => match.clubId === clubId && (match.clubNightId === clubNightId || ids.has(match.id)));
}

export function deleteCompletedMatches(matchIds: string[]): CompletedMatch[] {
  const ids = new Set(matchIds);
  const next = getCompletedMatches().filter((match) => !ids.has(match.id));
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function deleteCompletedMatchesForClubNight(clubNightId: string, fallbackMatchIds: string[] = []): CompletedMatch[] {
  const matchIds = getCompletedMatchesForClubNight(clubNightId, fallbackMatchIds).map((match) => match.id);
  return deleteCompletedMatches(matchIds);
}

export function deleteCompletedMatchesForClubNightInClub(clubId: string, clubNightId: string, fallbackMatchIds: string[] = []): CompletedMatch[] {
  const matchIds = getCompletedMatchesForClubNightInClub(clubId, clubNightId, fallbackMatchIds).map((match) => match.id);
  return deleteCompletedMatches(matchIds);
}
