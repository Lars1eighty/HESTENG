import type { CompletedMatch } from "@/lib/matchStore";
import { playerEloSeed, type PlayerEloSeedEntry } from "@/data/playerEloSeed";
import { normalizeName } from "@/lib/playerIdentity";

export const DEFAULT_ELO = 1200;
export const ELO_K_FACTOR = 24;

export type PlayerEloRating = {
  playerId?: string;
  player: string;
  elo: number;
  updatedAt: string | null;
  source?: "seed" | "match";
};

export type EloRatingEvent = {
  matchId: string;
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

function playerHasRating(player: string, ratings: PlayerEloRating[]) {
  return ratings.some((rating) => samePlayer(rating.player, player));
}

function playerHasRatingEvent(player: string, events: EloRatingEvent[]) {
  return events.some((event) => samePlayer(event.player1, player) || samePlayer(event.player2, player));
}

function seedToRating(seed: PlayerEloSeedEntry): PlayerEloRating {
  return {
    playerId: seed.playerId,
    player: seed.name,
    elo: seed.elo,
    updatedAt: null,
    source: "seed",
  };
}

function seedInitialRatings(ratings: PlayerEloRating[], events: EloRatingEvent[]) {
  const seededRatings = playerEloSeed
    .filter((seed) => !playerHasRating(seed.name, ratings) && !playerHasRatingEvent(seed.name, events))
    .map(seedToRating);

  return [...ratings, ...seededRatings].sort((a, b) => a.player.localeCompare(b.player));
}

export function getEloRatings(): PlayerEloRating[] {
  const storedRatings = readStorageArray<PlayerEloRating>(RATINGS_STORAGE_KEY);
  const seededRatings = seedInitialRatings(storedRatings, getEloEvents());

  if (seededRatings.length !== storedRatings.length) {
    writeStorageArray<PlayerEloRating>(RATINGS_STORAGE_KEY, seededRatings);
  }

  return seededRatings;
}

export function getEloEvents(): EloRatingEvent[] {
  return readStorageArray<EloRatingEvent>(EVENTS_STORAGE_KEY);
}

export function getPlayerElo(player: string): PlayerEloRating {
  return getEloRatings().find((rating) => samePlayer(rating.player, player)) ?? {
    player,
    elo: DEFAULT_ELO,
    updatedAt: null,
  };
}

function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function getMatchPlayers(match: CompletedMatch) {
  const loser = match.winner === match.player1 ? match.player2 : match.player1;
  return { player1: match.player1, player2: match.player2, winner: match.winner, loser };
}

export function applyEloForCompletedMatch(match: CompletedMatch): EloRatingEvent {
  const existingEvent = getEloEvents().find((event) => event.matchId === match.id);
  if (existingEvent) return existingEvent;

  const { player1, player2, winner, loser } = getMatchPlayers(match);
  const ratings = getEloRatings();
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
    matchId: match.id,
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

  const withoutPlayers = ratings.filter((rating) => !samePlayer(rating.player, player1) && !samePlayer(rating.player, player2));
  const updatedPlayer1: PlayerEloRating = {
    playerId: player1Rating?.playerId,
    player: player1,
    elo: event.player1After,
    updatedAt: createdAt,
    source: "match",
  };
  const updatedPlayer2: PlayerEloRating = {
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
