import type { CompletedMatch, CompletedPlayerStats } from "@/lib/matchStore";
import { normalizeName } from "@/lib/playerIdentity";

export type EveningPlayerStats = {
  playerId?: string;
  player: string;
  matchesPlayed: number;
  totalScored: number;
  entries: number;
  average: number;
  oneEighties: number;
  checkouts: number;
  checkoutAttempts: number;
  checkoutPercent: number;
  fastestLegDarts: number | null;
};

export type EveningStats = {
  matchesPlayed: number;
  players: EveningPlayerStats[];
  totalOneEighties: number;
  totalCheckouts: number;
  totalCheckoutAttempts: number;
  checkoutPercent: number;
  bestAverage: EveningPlayerStats | null;
  bestCheckoutPercent: EveningPlayerStats | null;
  fastestLeg: EveningPlayerStats | null;
};

type PlayerAccumulator = EveningPlayerStats & {
  weightedAveragePoints: number;
  weightedAverageEntries: number;
};

function emptyPlayerStats(player: string, playerId?: string): PlayerAccumulator {
  return { playerId, player, matchesPlayed: 0, totalScored: 0, entries: 0, average: 0, oneEighties: 0, checkouts: 0, checkoutAttempts: 0, checkoutPercent: 0, fastestLegDarts: null, weightedAveragePoints: 0, weightedAverageEntries: 0 };
}

function addPlayerMatch(target: PlayerAccumulator, stats: CompletedPlayerStats) {
  target.matchesPlayed += 1;
  target.totalScored += stats.totalScored;
  target.entries += stats.entries;
  target.weightedAveragePoints += stats.average * stats.entries;
  target.weightedAverageEntries += stats.entries;
  target.oneEighties += stats.oneEighties;
  target.checkouts += stats.checkouts;
  target.checkoutAttempts += stats.checkoutAttempts;
  target.fastestLegDarts = target.fastestLegDarts === null ? stats.fastestLegDarts : stats.fastestLegDarts === null ? target.fastestLegDarts : Math.min(target.fastestLegDarts, stats.fastestLegDarts);
}

function finishPlayerStats(stats: PlayerAccumulator): EveningPlayerStats {
  const { weightedAveragePoints, weightedAverageEntries, ...result } = stats;
  return {
    ...result,
    average: weightedAverageEntries > 0 ? Number((weightedAveragePoints / weightedAverageEntries).toFixed(2)) : 0,
    checkoutPercent: stats.checkoutAttempts > 0 ? Math.round((stats.checkouts / stats.checkoutAttempts) * 100) : 0,
  };
}

function getPlayerKey(stats: CompletedPlayerStats) {
  return stats.playerId ? `id:${stats.playerId}` : `name:${normalizeName(stats.name)}`;
}

export function calculateEveningStats(matches: CompletedMatch[]): EveningStats {
  const countedMatchIds = new Set<string>();
  const playerStats = new Map<string, PlayerAccumulator>();

  matches.forEach((match) => {
    if (countedMatchIds.has(match.id)) return;
    countedMatchIds.add(match.id);
    match.players.forEach((stats) => {
      const key = getPlayerKey(stats);
      const current = playerStats.get(key) ?? emptyPlayerStats(stats.name, stats.playerId);
      addPlayerMatch(current, stats);
      playerStats.set(key, current);
    });
  });

  const players = [...playerStats.values()].map(finishPlayerStats).sort((a, b) => a.player.localeCompare(b.player));
  const totalOneEighties = players.reduce((sum, player) => sum + player.oneEighties, 0);
  const totalCheckouts = players.reduce((sum, player) => sum + player.checkouts, 0);
  const totalCheckoutAttempts = players.reduce((sum, player) => sum + player.checkoutAttempts, 0);

  return {
    matchesPlayed: countedMatchIds.size,
    players,
    totalOneEighties,
    totalCheckouts,
    totalCheckoutAttempts,
    checkoutPercent: totalCheckoutAttempts > 0 ? Math.round((totalCheckouts / totalCheckoutAttempts) * 100) : 0,
    bestAverage: players.filter((player) => player.entries > 0).sort((a, b) => b.average - a.average)[0] ?? null,
    bestCheckoutPercent: players.filter((player) => player.checkoutAttempts > 0).sort((a, b) => b.checkoutPercent - a.checkoutPercent || b.checkouts - a.checkouts)[0] ?? null,
    fastestLeg: players.filter((player) => player.fastestLegDarts !== null).sort((a, b) => (a.fastestLegDarts ?? 0) - (b.fastestLegDarts ?? 0))[0] ?? null,
  };
}
