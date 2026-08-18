import type { CompletedMatch } from "@/lib/matchStore";
import { DEMO_CLUB_ID } from "@/data/clubs";
import { playerEloSeed, type PlayerEloSeedEntry } from "@/data/playerEloSeed";
import { getCurrentClubId } from "@/lib/currentClub";
import { normalizeName } from "@/lib/playerIdentity";

export const DEFAULT_ELO = 1200;
export const ELO_K_FACTOR = 24;

export type PlayerEloRating = {
  clubId?: string;
  playerId?: string;
  player: string;
  elo: number;
  updatedAt: string | null;
  source?: "seed" | "match";
};

export type EloRatingEvent = {
  clubId?: string;
  matchId: string;
  clubNightId?: string;
  player1: string;
  player2: string;
  winner: string;
  loser: string;
  player1Before: number;
  player2Before: number;
  player1After: number;
  player2After: number;
  player1Delta: number;
  player2Delta: number;
  createdAt: string;
};

const RATINGS_STORAGE_KEY = "hesteng.eloRatings";
const EVENTS_STORAGE_KEY = "hesteng.eloEvents";

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

function samePlayer(left: string, right: string) {
  return normalizeName(left) === normalizeName(right);
}

function playerHasRating(player: string, clubId: string, ratings: PlayerEloRating[]) {
  return ratings.some((rating) => (rating.clubId ?? DEMO_CLUB_ID) === clubId && samePlayer(rating.player, player));
}

function playerHasRatingEvent(player: string, clubId: string, events: EloRatingEvent[]) {
  return events.some((event) => (event.clubId ?? DEMO_CLUB_ID) === clubId && (samePlayer(event.player1, player) || samePlayer(event.player2, player)));
}

function seedToRating(seed: PlayerEloSeedEntry): PlayerEloRating {
  return {
    clubId: seed.clubId ?? DEMO_CLUB_ID,
    playerId: seed.playerId,
    player: seed.name,
    elo: seed.elo,
    updatedAt: null,
    source: "seed",
  };
}

function getInitialSeedRatings(clubId = getCurrentClubId()): PlayerEloRating[] {
  return playerEloSeed.filter((seed) => (seed.clubId ?? DEMO_CLUB_ID) === clubId).map(seedToRating);
}

function seedInitialRatings(ratings: PlayerEloRating[], events: EloRatingEvent[], clubId = getCurrentClubId()) {
  const seededRatings = playerEloSeed
    .filter((seed) => (seed.clubId ?? DEMO_CLUB_ID) === clubId)
    .filter((seed) => !playerHasRating(seed.name, clubId, ratings) && !playerHasRatingEvent(seed.name, clubId, events))
    .map(seedToRating);

  return [...ratings, ...seededRatings].sort((a, b) => a.player.localeCompare(b.player));
}

export function getEloRatings(clubId = getCurrentClubId()): PlayerEloRating[] {
  const storedRatings = readStorageArray<PlayerEloRating>(RATINGS_STORAGE_KEY);
  const migratedRatings = storedRatings.map((rating) => ({
    ...rating,
    clubId: rating.clubId ?? DEMO_CLUB_ID,
  }));
  const seededRatings = seedInitialRatings(migratedRatings, getEloEvents(), clubId);

  if (JSON.stringify(seededRatings) !== JSON.stringify(storedRatings)) {
    writeStorageArray<PlayerEloRating>(RATINGS_STORAGE_KEY, seededRatings);
  }

  return seededRatings.filter((rating) => (rating.clubId ?? DEMO_CLUB_ID) === clubId);
}

export function getEloEvents(): EloRatingEvent[] {
  return readStorageArray<EloRatingEvent>(EVENTS_STORAGE_KEY).map((event) => ({
    ...event,
    clubId: event.clubId ?? DEMO_CLUB_ID,
  }));
}

export function getPlayerElo(player: string, clubId = getCurrentClubId()): PlayerEloRating {
  return getEloRatings(clubId).find((rating) => samePlayer(rating.player, player)) ?? {
    clubId,
    player,
    elo: DEFAULT_ELO,
    updatedAt: null,
  };
}

function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function calculateEloEvent(baseEvent: EloRatingEvent, player1Before: number, player2Before: number): EloRatingEvent {
  const player1Score = samePlayer(baseEvent.winner, baseEvent.player1) ? 1 : 0;
  const player1Expected = expectedScore(player1Before, player2Before);
  const player1Delta = Math.round(ELO_K_FACTOR * (player1Score - player1Expected));
  const player2Delta = -player1Delta;

  return {
    ...baseEvent,
    player1Before,
    player2Before,
    player1After: player1Before + player1Delta,
    player2After: player2Before + player2Delta,
    player1Delta,
    player2Delta,
  };
}

function getMatchPlayers(match: CompletedMatch) {
  const loser = match.winner === match.player1 ? match.player2 : match.player1;
  return { player1: match.player1, player2: match.player2, winner: match.winner, loser };
}

export function applyEloForCompletedMatch(match: CompletedMatch): EloRatingEvent {
  const clubId = match.clubId ?? DEMO_CLUB_ID;
  const existingEvent = getEloEvents().find((event) => event.matchId === match.id && (event.clubId ?? DEMO_CLUB_ID) === clubId);
  if (existingEvent) return existingEvent;

  const { player1, player2, winner, loser } = getMatchPlayers(match);
  const ratings = getEloRatings(clubId);
  const allRatings = readStorageArray<PlayerEloRating>(RATINGS_STORAGE_KEY).map((rating) => ({
    ...rating,
    clubId: rating.clubId ?? DEMO_CLUB_ID,
  }));
  const player1Rating = ratings.find((rating) => samePlayer(rating.player, player1));
  const player2Rating = ratings.find((rating) => samePlayer(rating.player, player2));
  const player1Before = player1Rating?.elo ?? DEFAULT_ELO;
  const player2Before = player2Rating?.elo ?? DEFAULT_ELO;
  const player1Score = winner === player1 ? 1 : 0;
  const player1Expected = expectedScore(player1Before, player2Before);
  const player1Delta = Math.round(ELO_K_FACTOR * (player1Score - player1Expected));
  const player2Delta = -player1Delta;
  const createdAt = new Date().toISOString();

  const event: EloRatingEvent = {
    clubId,
    matchId: match.id,
    clubNightId: match.clubNightId,
    player1,
    player2,
    winner,
    loser,
    player1Before,
    player2Before,
    player1After: player1Before + player1Delta,
    player2After: player2Before + player2Delta,
    player1Delta,
    player2Delta,
    createdAt,
  };

  const withoutPlayers = allRatings.filter((rating) => (
    (rating.clubId ?? DEMO_CLUB_ID) !== clubId ||
    (!samePlayer(rating.player, player1) && !samePlayer(rating.player, player2))
  ));
  const updatedPlayer1: PlayerEloRating = {
    clubId,
    playerId: player1Rating?.playerId,
    player: player1,
    elo: event.player1After,
    updatedAt: createdAt,
    source: "match",
  };
  const updatedPlayer2: PlayerEloRating = {
    clubId,
    playerId: player2Rating?.playerId,
    player: player2,
    elo: event.player2After,
    updatedAt: createdAt,
    source: "match",
  };

  writeStorageArray<PlayerEloRating>(RATINGS_STORAGE_KEY, [
    ...withoutPlayers,
    updatedPlayer1,
    updatedPlayer2,
  ].sort((a, b) => a.player.localeCompare(b.player)));
  writeStorageArray<EloRatingEvent>(EVENTS_STORAGE_KEY, [event, ...getEloEvents()]);

  return event;
}

export function calculateEveningEloDeltas(matchIds: string[]): Map<string, number> {
  const ids = new Set(matchIds);
  const deltas = new Map<string, number>();

  getEloEvents().forEach((event) => {
    if (!ids.has(event.matchId)) return;
    deltas.set(event.player1, (deltas.get(event.player1) ?? 0) + event.player1Delta);
    deltas.set(event.player2, (deltas.get(event.player2) ?? 0) + event.player2Delta);
  });

  return deltas;
}

export function calculateClubNightEloDeltas(clubNightId: string, fallbackMatchIds: string[] = []): Map<string, number> {
  const deltas = new Map<string, number>();
  const fallbackIds = new Set(fallbackMatchIds);

  getEloEvents().forEach((event) => {
    if (event.clubNightId !== clubNightId && !fallbackIds.has(event.matchId)) return;
    deltas.set(event.player1, (deltas.get(event.player1) ?? 0) + event.player1Delta);
    deltas.set(event.player2, (deltas.get(event.player2) ?? 0) + event.player2Delta);
  });

  return deltas;
}

export function calculateClubNightEloDeltasInClub(clubId: string, clubNightId: string, fallbackMatchIds: string[] = []): Map<string, number> {
  const deltas = new Map<string, number>();
  const fallbackIds = new Set(fallbackMatchIds);

  getEloEvents().forEach((event) => {
    if ((event.clubId ?? DEMO_CLUB_ID) !== clubId) return;
    if (event.clubNightId !== clubNightId && !fallbackIds.has(event.matchId)) return;
    deltas.set(event.player1, (deltas.get(event.player1) ?? 0) + event.player1Delta);
    deltas.set(event.player2, (deltas.get(event.player2) ?? 0) + event.player2Delta);
  });

  return deltas;
}

export function removeEloEventsForClubNightAndRebuildRatings(clubNightId: string, fallbackMatchIds: string[] = []): EloRatingEvent[] {
  const fallbackIds = new Set(fallbackMatchIds);
  const matchIds = getEloEvents()
    .filter((event) => event.clubNightId === clubNightId || fallbackIds.has(event.matchId))
    .map((event) => event.matchId);

  return removeEloEventsAndRebuildRatings(matchIds);
}

export function removeEloEventsForClubNightInClubAndRebuildRatings(clubId: string, clubNightId: string, fallbackMatchIds: string[] = []): EloRatingEvent[] {
  const fallbackIds = new Set(fallbackMatchIds);
  const matchIds = getEloEvents()
    .filter((event) => (event.clubId ?? DEMO_CLUB_ID) === clubId)
    .filter((event) => event.clubNightId === clubNightId || fallbackIds.has(event.matchId))
    .map((event) => event.matchId);

  return removeEloEventsAndRebuildRatings(matchIds, clubId);
}

export function removeEloEventsAndRebuildRatings(matchIds: string[], clubId = getCurrentClubId()): EloRatingEvent[] {
  const ids = new Set(matchIds);
  const remainingEvents = getEloEvents()
    .filter((event) => (event.clubId ?? DEMO_CLUB_ID) === clubId)
    .filter((event) => !ids.has(event.matchId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const ratingMap = new Map<string, PlayerEloRating>();

  getInitialSeedRatings(clubId).forEach((rating) => {
    ratingMap.set(normalizeName(rating.player), rating);
  });

  const rebuiltEvents = remainingEvents.map((event) => {
    const player1Key = normalizeName(event.player1);
    const player2Key = normalizeName(event.player2);
    const player1Rating = ratingMap.get(player1Key);
    const player2Rating = ratingMap.get(player2Key);
    const rebuilt = calculateEloEvent(
      event,
      player1Rating?.elo ?? DEFAULT_ELO,
      player2Rating?.elo ?? DEFAULT_ELO
    );

    ratingMap.set(player1Key, {
      clubId,
      playerId: player1Rating?.playerId,
      player: event.player1,
      elo: rebuilt.player1After,
      updatedAt: rebuilt.createdAt,
      source: "match",
    });
    ratingMap.set(player2Key, {
      clubId,
      playerId: player2Rating?.playerId,
      player: event.player2,
      elo: rebuilt.player2After,
      updatedAt: rebuilt.createdAt,
      source: "match",
    });

    return rebuilt;
  });

  writeStorageArray<PlayerEloRating>(
    RATINGS_STORAGE_KEY,
    [
      ...readStorageArray<PlayerEloRating>(RATINGS_STORAGE_KEY)
        .map((rating) => ({ ...rating, clubId: rating.clubId ?? DEMO_CLUB_ID }))
        .filter((rating) => (rating.clubId ?? DEMO_CLUB_ID) !== clubId),
      ...ratingMap.values(),
    ].sort((a, b) => a.player.localeCompare(b.player))
  );
  writeStorageArray<EloRatingEvent>(EVENTS_STORAGE_KEY, [
    ...getEloEvents().filter((event) => (event.clubId ?? DEMO_CLUB_ID) !== clubId),
    ...rebuiltEvents,
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  return rebuiltEvents;
}
