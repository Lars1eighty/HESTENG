import { historicalRankingSeed } from "@/data/historicalRankingSeed";
import { playerEloSeed } from "@/data/playerEloSeed";
import { DEMO_CLUB_ID } from "@/data/clubs";
import { DEFAULT_ELO, ELO_K_FACTOR, getEloEvents } from "@/lib/eloRatingEngine";
import { getCurrentClubId } from "@/lib/currentClub";
import { getCompletedMatches, type CompletedMatch } from "@/lib/matchStore";
import { normalizeName } from "@/lib/playerIdentity";
import { getPlayerRegistry } from "@/lib/playerRegistry";
import { calculateThursdayPoints } from "@/lib/thursdayPointsEngine";

export type RankingRow = {
  player: string;
  value: number | null;
};

export type Rankings = {
  elo: RankingRow[];
  oneEighties: RankingRow[];
  highestCheckouts: RankingRow[];
  fastestLegs: RankingRow[];
  clubNightPoints: RankingRow[];
};

type AggregatedRankingStats = {
  player: string;
  oneEighties: number;
  highestCheckout: number;
  fastestLegDarts: number | null;
  clubNightPoints: number;
};

function isLegacyClubNightMatchId(matchId: string) {
  return matchId.startsWith("thu-");
}

function isClubNightMatch(match: CompletedMatch, clubId: string) {
  const matchClubId = match.clubId ?? DEMO_CLUB_ID;
  return matchClubId === clubId && (Boolean(match.clubNightId) || isLegacyClubNightMatchId(match.id));
}

function emptyStats(player: string): AggregatedRankingStats {
  return {
    player,
    oneEighties: 0,
    highestCheckout: 0,
    fastestLegDarts: null,
    clubNightPoints: 0,
  };
}

function getOrCreate(stats: Map<string, AggregatedRankingStats>, player: string) {
  const key = normalizeName(player);
  const current = stats.get(key);
  if (current) return current;
  const next = emptyStats(player);
  stats.set(key, next);
  return next;
}

function getExisting(stats: Map<string, AggregatedRankingStats>, player: string) {
  return stats.get(normalizeName(player)) ?? null;
}

function addMasterPlayers(stats: Map<string, AggregatedRankingStats>, clubId: string) {
  getPlayerRegistry(clubId).forEach((player) => {
    getOrCreate(stats, player.name);
  });
}

function addHistoricalSeed(stats: Map<string, AggregatedRankingStats>, clubId: string) {
  historicalRankingSeed.forEach((seed) => {
    if ((seed.clubId ?? DEMO_CLUB_ID) !== clubId) return;
    const target = getExisting(stats, seed.player);
    if (!target) return;

    target.oneEighties += seed.oneEighties ?? 0;
    target.highestCheckout = Math.max(target.highestCheckout, seed.highestCheckout ?? 0);
    target.clubNightPoints += seed.clubNightPoints ?? 0;
    if (seed.fastestLegDarts) {
      target.fastestLegDarts = target.fastestLegDarts === null ? seed.fastestLegDarts : Math.min(target.fastestLegDarts, seed.fastestLegDarts);
    }
  });
}

function addCompletedMatches(stats: Map<string, AggregatedRankingStats>, matches: CompletedMatch[], clubId: string) {
  const countedMatchIds = new Set<string>();
  const clubNightMatches: CompletedMatch[] = [];

  matches.forEach((match) => {
    if (!isClubNightMatch(match, clubId)) return;
    if (countedMatchIds.has(match.id)) return;
    countedMatchIds.add(match.id);
    clubNightMatches.push(match);

    match.players.forEach((playerStats) => {
      const target = getExisting(stats, playerStats.name);
      if (!target) return;

      target.oneEighties += playerStats.oneEighties;
      target.highestCheckout = Math.max(target.highestCheckout, playerStats.highestCheckout ?? 0);
      if (playerStats.fastestLegDarts !== null) {
        target.fastestLegDarts =
          target.fastestLegDarts === null
            ? playerStats.fastestLegDarts
            : Math.min(target.fastestLegDarts, playerStats.fastestLegDarts);
      }
    });

  });

  calculateThursdayPoints(clubNightMatches).forEach((pointsRow) => {
    const target = getExisting(stats, pointsRow.player);
    if (!target) return;
    target.clubNightPoints += pointsRow.totalPoints;
  });
}

function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function sortHigh(rows: RankingRow[]) {
  return rows.sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || a.player.localeCompare(b.player));
}

function sortLow(rows: RankingRow[]) {
  return rows.sort((a, b) => (a.value ?? Number.POSITIVE_INFINITY) - (b.value ?? Number.POSITIVE_INFINITY) || a.player.localeCompare(b.player));
}

function calculateEloRows(clubId: string) {
  const registry = getPlayerRegistry(clubId);
  const rows = new Map<string, RankingRow>();
  const ratingValues = new Map<string, number>();
  const ratingNames = new Map<string, string>();

  playerEloSeed.forEach((seed) => {
    if ((seed.clubId ?? DEMO_CLUB_ID) !== clubId) return;
    const key = normalizeName(seed.name);
    ratingValues.set(key, seed.elo);
    ratingNames.set(key, seed.name);
  });

  getEloEvents()
    .filter((event) => (event.clubId ?? DEMO_CLUB_ID) === clubId)
    .filter((event) => Boolean(event.clubNightId) || isLegacyClubNightMatchId(event.matchId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((event) => {
      const player1Key = normalizeName(event.player1);
      const player2Key = normalizeName(event.player2);
      const player1Before = ratingValues.get(player1Key) ?? DEFAULT_ELO;
      const player2Before = ratingValues.get(player2Key) ?? DEFAULT_ELO;
      const player1Score = normalizeName(event.winner) === player1Key ? 1 : 0;
      const player1Delta = Math.round(ELO_K_FACTOR * (player1Score - expectedScore(player1Before, player2Before)));
      const player2Delta = -player1Delta;

      ratingValues.set(player1Key, player1Before + player1Delta);
      ratingValues.set(player2Key, player2Before + player2Delta);
      ratingNames.set(player1Key, event.player1);
      ratingNames.set(player2Key, event.player2);
    });

  registry.forEach((player) => {
    const key = normalizeName(player.name);
    rows.set(key, { player: player.name, value: ratingValues.get(key) ?? DEFAULT_ELO });
  });

  return [...rows.values()].sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || a.player.localeCompare(b.player));
}

export function calculateRankings(matches = getCompletedMatches(), clubId = getCurrentClubId()): Rankings {
  const stats = new Map<string, AggregatedRankingStats>();
  addMasterPlayers(stats, clubId);
  addHistoricalSeed(stats, clubId);
  addCompletedMatches(stats, matches, clubId);

  const aggregated = [...stats.values()];

  return {
    elo: calculateEloRows(clubId),
    oneEighties: sortHigh(aggregated.map((player) => ({ player: player.player, value: player.oneEighties }))),
    highestCheckouts: sortHigh(aggregated.map((player) => ({ player: player.player, value: player.highestCheckout || null }))),
    fastestLegs: sortLow(aggregated.map((player) => ({ player: player.player, value: player.fastestLegDarts }))),
    clubNightPoints: sortHigh(aggregated.map((player) => ({ player: player.player, value: player.clubNightPoints }))),
  };
}
