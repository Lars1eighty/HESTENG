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
  highCheckouts?: number[];
  oneEighties: number;
  fastestLegDarts: number | null;
  fastLegDarts?: number[];
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
  scoringMode?: "total" | "dart-by-dart";
  board: number | null;
  pool: string | null;
  round: number | null;
  status: "finished";
  startedAt?: string;
  completedAt?: string;
  finishedAt: string;
  durationSeconds?: number;
  legsPlayed?: number;
  avgSecondsPerLeg?: number;
  timingSource?: "hesteng-scorer" | "dartconnect-recap";
  players: [CompletedPlayerStats, CompletedPlayerStats];
};

const STORAGE_KEY = "hesteng.completedMatches";
const SHARED_STATE_API = "/api/club-night-state";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function syncCompletedMatchToSharedState(match: CompletedMatch) {
  if (typeof window === "undefined") return;

  void fetch(SHARED_STATE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "completedMatch", completedMatch: match }),
  }).catch(() => {
    // Local MatchStore remains the offline fallback if the shared dev store is unavailable.
  });
}

function getCompletedTimestamp(match: CompletedMatch) {
  return match.completedAt ?? match.finishedAt ?? "";
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
  syncCompletedMatchToSharedState(match);
  return next;
}

export function replaceCompletedMatchesFromSharedState(matches: CompletedMatch[]) {
  if (!canUseStorage()) return;
  const current = getCompletedMatches();
  const byId = new Map<string, CompletedMatch>();

  matches.forEach((match) => {
    if (!match?.id) return;
    const existing = byId.get(match.id);
    if (!existing || getCompletedTimestamp(match).localeCompare(getCompletedTimestamp(existing)) >= 0) {
      byId.set(match.id, match);
    }
  });

  const next = [...byId.values()].sort((a, b) => getCompletedTimestamp(b).localeCompare(getCompletedTimestamp(a)));
  if (JSON.stringify(current) !== JSON.stringify(next)) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
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

export function deleteCompletedMatchesForClub(clubId: string): CompletedMatch[] {
  const next = getCompletedMatches()
    .map((match) => withClubId(match, match.clubId ?? DEMO_CLUB_ID))
    .filter((match) => match.clubId !== clubId);

  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}
