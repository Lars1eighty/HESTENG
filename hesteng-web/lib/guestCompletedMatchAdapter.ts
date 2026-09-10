import type { ClubMatch } from "@/lib/matchEngine";
import type { CompletedMatch, CompletedPlayerStats } from "@/lib/matchStore";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : null;
}

function asPlayerStats(value: unknown): CompletedPlayerStats | null {
  const stats = asRecord(value);
  if (!stats) return null;

  const fastestLegDarts = stats.fastestLegDarts;
  if (
    typeof stats.name !== "string" ||
    typeof stats.legs !== "number" ||
    typeof stats.totalScored !== "number" ||
    typeof stats.entries !== "number" ||
    typeof stats.average !== "number" ||
    typeof stats.checkouts !== "number" ||
    typeof stats.checkoutAttempts !== "number" ||
    typeof stats.checkoutPercent !== "number" ||
    typeof stats.oneEighties !== "number" ||
    (fastestLegDarts !== null && typeof fastestLegDarts !== "number")
  ) {
    return null;
  }

  return stats as CompletedPlayerStats;
}

export function adaptGuestCompletedMatch(
  value: unknown,
  authoritativeMatch: ClubMatch,
  clubId: string,
  clubNightId: string,
): CompletedMatch | null {
  const guest = asRecord(value);
  if (!guest || guest.id !== authoritativeMatch.id || guest.status !== "finished") return null;
  if (guest.player1 !== authoritativeMatch.player1 || guest.player2 !== authoritativeMatch.player2) return null;
  if (!Number.isInteger(guest.score1) || !Number.isInteger(guest.score2)) return null;

  const score1 = guest.score1 as number;
  const score2 = guest.score2 as number;
  if (score1 < 0 || score2 < 0 || score1 === score2) return null;

  const legsToWin = Math.floor(authoritativeMatch.bestOfLegs / 2) + 1;
  if (Math.max(score1, score2) !== legsToWin) return null;

  const expectedWinner = score1 > score2 ? authoritativeMatch.player1 : authoritativeMatch.player2;
  if (guest.winner !== expectedWinner) return null;
  if (!Array.isArray(guest.players) || guest.players.length !== 2) return null;

  const player1Stats = asPlayerStats(guest.players[0]);
  const player2Stats = asPlayerStats(guest.players[1]);
  if (!player1Stats || !player2Stats) return null;
  if (player1Stats.name !== authoritativeMatch.player1 || player2Stats.name !== authoritativeMatch.player2) return null;
  if (player1Stats.legs !== score1 || player2Stats.legs !== score2) return null;

  const finishedAt = typeof guest.finishedAt === "string" ? guest.finishedAt : new Date().toISOString();

  return {
    id: authoritativeMatch.id,
    clubId,
    clubNightId,
    player1: authoritativeMatch.player1,
    player1Id: authoritativeMatch.player1Id,
    player2: authoritativeMatch.player2,
    player2Id: authoritativeMatch.player2Id,
    winner: expectedWinner,
    score1,
    score2,
    bestOfLegs: authoritativeMatch.bestOfLegs,
    board: authoritativeMatch.board ?? null,
    pool: authoritativeMatch.pool ?? null,
    round: authoritativeMatch.round ?? null,
    status: "finished",
    finishedAt,
    timingSource: "hesteng-scorer",
    players: [
      { ...player1Stats, playerId: authoritativeMatch.player1Id ?? player1Stats.playerId },
      { ...player2Stats, playerId: authoritativeMatch.player2Id ?? player2Stats.playerId },
    ],
  };
}
