import type { CompletedMatch, CompletedPlayerStats } from "@/lib/matchStore";
import { normalizeName } from "@/lib/playerIdentity";

export type ThursdayPointEvent =
  | { type: "180"; points: number; count: number; matchId: string }
  | { type: "fast-leg"; points: number; darts: number; matchId: string }
  | { type: "high-checkout"; points: number; checkout: number; matchId: string };

export type ThursdayPointsPlayer = {
  player: string;
  pointsFrom180s: number;
  pointsFromFastLegs: number;
  pointsFromHighCheckouts: number;
  totalPoints: number;
  events: ThursdayPointEvent[];
};

function emptyPlayer(player: string): ThursdayPointsPlayer {
  return {
    player,
    pointsFrom180s: 0,
    pointsFromFastLegs: 0,
    pointsFromHighCheckouts: 0,
    totalPoints: 0,
    events: [],
  };
}

function getOrCreate(players: Map<string, ThursdayPointsPlayer>, player: string) {
  const key = normalizeName(player);
  const current = players.get(key);
  if (current) return current;
  const next = emptyPlayer(player);
  players.set(key, next);
  return next;
}

export function calculateFastLegPoints(darts: number | null | undefined) {
  if (typeof darts !== "number" || !Number.isInteger(darts) || darts < 9 || darts > 21) return 0;
  return 22 - darts;
}

export function calculateHighCheckoutPoints(checkout: number | null | undefined) {
  if (typeof checkout !== "number" || !Number.isInteger(checkout) || checkout <= 100) return 0;
  if (checkout === 170) return 10;
  if (checkout === 161 || checkout === 164 || checkout === 167) return 8;
  if (checkout >= 101 && checkout <= 160) {
    return Math.floor((checkout - 101) / 10) + 2;
  }
  return 0;
}

function getFastLegEvents(stats: CompletedPlayerStats) {
  if (Array.isArray(stats.fastLegDarts)) return stats.fastLegDarts;
  return stats.fastestLegDarts !== null && stats.fastestLegDarts !== undefined ? [stats.fastestLegDarts] : [];
}

function getCheckoutEvents(stats: CompletedPlayerStats) {
  if (Array.isArray(stats.highCheckouts)) return stats.highCheckouts;
  return stats.highestCheckout ? [stats.highestCheckout] : [];
}

function addPlayerStats(target: ThursdayPointsPlayer, matchId: string, stats: CompletedPlayerStats) {
  if (stats.oneEighties > 0) {
    const points = stats.oneEighties;
    target.pointsFrom180s += points;
    target.events.push({ type: "180", points, count: stats.oneEighties, matchId });
  }

  getFastLegEvents(stats).forEach((darts) => {
    const points = calculateFastLegPoints(darts);
    if (points <= 0) return;
    target.pointsFromFastLegs += points;
    target.events.push({ type: "fast-leg", points, darts, matchId });
  });

  getCheckoutEvents(stats).forEach((checkout) => {
    const points = calculateHighCheckoutPoints(checkout);
    if (points <= 0) return;
    target.pointsFromHighCheckouts += points;
    target.events.push({ type: "high-checkout", points, checkout, matchId });
  });

  target.totalPoints = target.pointsFrom180s + target.pointsFromFastLegs + target.pointsFromHighCheckouts;
}

export function calculateThursdayPoints(matches: CompletedMatch[]): ThursdayPointsPlayer[] {
  const countedMatchIds = new Set<string>();
  const players = new Map<string, ThursdayPointsPlayer>();

  matches.forEach((match) => {
    if (countedMatchIds.has(match.id)) return;
    countedMatchIds.add(match.id);

    match.players.forEach((stats) => {
      const target = getOrCreate(players, stats.name);
      addPlayerStats(target, match.id, stats);
    });
  });

  return [...players.values()].sort((a, b) =>
    b.totalPoints - a.totalPoints ||
    b.pointsFromHighCheckouts - a.pointsFromHighCheckouts ||
    b.pointsFromFastLegs - a.pointsFromFastLegs ||
    b.pointsFrom180s - a.pointsFrom180s ||
    a.player.localeCompare(b.player)
  );
}
