import { Pool } from "@/context/KlubaftenContext";
import { normalizeName } from "@/lib/playerIdentity";
import { getPlayerRegistry } from "@/lib/playerRegistry";
import { estimateMatchDurationByPlayers, type MatchDurationEstimate } from "@/lib/playerTimingEngine";

export type ClubMatch = {
  id: string;
  clubId?: string;
  clubNightId?: string;
  pool: string;
  round: number;
  order: number;
  scheduleSlot: number;
  player1: string;
  player2: string;
  board: number;
  boardType: "normal" | "handicap";
  requiresAccessibleBoardForMatch: boolean;
  bestOfLegs: number;
  scoringMode?: "total" | "dart-by-dart";
  score1: number;
  score2: number;
  winner?: string;
  loser?: string;
  startedAt?: string;
  finishedAt?: string;
  durationSeconds?: number;
  legsPlayed?: number;
  avgSecondsPerLeg?: number;
  timingSource?: "hesteng-scorer" | "dartconnect-recap";
  estimatedDurationSeconds?: number;
  timingEstimateSource?: MatchDurationEstimate["source"];
  timingEstimateConfidence?: MatchDurationEstimate["confidence"];
  status: "pending" | "live" | "finished";
};

export const CLUB_NIGHT_BOARD_COUNT = 13;
export const CLUB_NIGHT_HANDICAP_BOARDS = [4, 13];

type PendingClubMatch = {
  pool: string;
  round: number;
  sequence: number;
  player1: string;
  player2: string;
  requiresAccessibleBoardForMatch: boolean;
  durationEstimate: MatchDurationEstimate;
};

type ScheduledClubMatch = PendingClubMatch & {
  board: number;
  order: number;
  scheduleSlot: number;
};

function getBoardType(board: number): "normal" | "handicap" {
  return CLUB_NIGHT_HANDICAP_BOARDS.includes(board) ? "handicap" : "normal";
}

function createRoundRobin(players: string[]): string[][] {
  const list = [...players];
  if (list.length % 2 !== 0) list.push("__BYE__");
  const rounds: string[][] = [];
  const roundCount = list.length - 1;
  const half = list.length / 2;

  for (let round = 0; round < roundCount; round++) {
    const matches: string[] = [];
    for (let i = 0; i < half; i++) {
      const a = list[i];
      const b = list[list.length - 1 - i];
      if (a !== "__BYE__" && b !== "__BYE__") matches.push(`${a}|||${b}`);
    }
    rounds.push(matches);
    list.splice(1, 0, list.pop()!);
  }
  return rounds;
}

function getAccessiblePlayerNames(clubId?: string): Set<string> {
  return new Set(
    getPlayerRegistry(clubId)
      .filter((player) => player.requiresAccessibleBoard)
      .map((player) => normalizeName(player.name))
  );
}

function createPendingMatches(pools: Pool[], accessiblePlayerNames: Set<string>, clubId?: string): PendingClubMatch[] {
  const pending: PendingClubMatch[] = [];
  let sequence = 1;

  pools.forEach((pool) => {
    createRoundRobin(pool.players).forEach((roundMatches, roundIndex) => {
      roundMatches.forEach((pair) => {
        const [player1, player2] = pair.split("|||");
        const player1Key = normalizeName(player1);
        const player2Key = normalizeName(player2);

        const durationEstimate = estimateMatchDurationByPlayers(player1, player2, 5, clubId);

        pending.push({
          pool: pool.name,
          round: roundIndex + 1,
          sequence: sequence++,
          player1,
          player2,
          requiresAccessibleBoardForMatch: accessiblePlayerNames.has(player1Key) || accessiblePlayerNames.has(player2Key),
          durationEstimate,
        });
      });
    });
  });

  return pending;
}

function hasPlayerInSlot(match: PendingClubMatch, playersInSlot: Set<string>): boolean {
  return playersInSlot.has(normalizeName(match.player1)) || playersInSlot.has(normalizeName(match.player2));
}

function markPlayersInSlot(match: PendingClubMatch, playersInSlot: Set<string>) {
  playersInSlot.add(normalizeName(match.player1));
  playersInSlot.add(normalizeName(match.player2));
}

function recentlyPlayedPenalty(match: PendingClubMatch, lastPlayedSlot: Map<string, number>, scheduleSlot: number): number {
  const previousSlot = scheduleSlot - 1;
  return [match.player1, match.player2].some((player) => lastPlayedSlot.get(normalizeName(player)) === previousSlot) ? 1 : 0;
}

function accessibleWaitScore(match: PendingClubMatch, accessiblePlayerNames: Set<string>, lastPlayedSlot: Map<string, number>, scheduleSlot: number): number {
  const waits = [match.player1, match.player2]
    .map((player) => normalizeName(player))
    .filter((playerKey) => accessiblePlayerNames.has(playerKey))
    .map((playerKey) => scheduleSlot - (lastPlayedSlot.get(playerKey) ?? 0));

  return waits.length > 0 ? Math.max(...waits) : 0;
}

function compareBaseMatchOrder(a: PendingClubMatch, b: PendingClubMatch): number {
  return a.round - b.round || a.sequence - b.sequence || a.pool.localeCompare(b.pool) || a.player1.localeCompare(b.player1) || a.player2.localeCompare(b.player2);
}

function compareEstimatedDuration(a: PendingClubMatch, b: PendingClubMatch): number {
  return b.durationEstimate.estimatedSeconds - a.durationEstimate.estimatedSeconds;
}

function findBestMatchIndex(
  pending: PendingClubMatch[],
  predicate: (match: PendingClubMatch) => boolean,
  compare: (a: PendingClubMatch, b: PendingClubMatch) => number
): number {
  let bestIndex = -1;

  pending.forEach((match, index) => {
    if (!predicate(match)) return;
    if (bestIndex === -1 || compare(match, pending[bestIndex]) < 0) {
      bestIndex = index;
    }
  });

  return bestIndex;
}

function schedulePendingMatches(pendingMatches: PendingClubMatch[], boardCount: number, accessiblePlayerNames: Set<string>): ScheduledClubMatch[] {
  const pending = [...pendingMatches];
  const scheduled: ScheduledClubMatch[] = [];
  const accessibleBoards = CLUB_NIGHT_HANDICAP_BOARDS.filter((board) => board <= boardCount);
  const normalBoards = Array.from({ length: boardCount }, (_, index) => index + 1).filter((board) => !accessibleBoards.includes(board));
  const lastPlayedSlot = new Map<string, number>();
  let scheduleSlot = 1;
  let order = 1;

  const scheduleMatch = (matchIndex: number, board: number, playersInSlot: Set<string>) => {
    const [match] = pending.splice(matchIndex, 1);
    scheduled.push({ ...match, board, order: order++, scheduleSlot });
    markPlayersInSlot(match, playersInSlot);
    lastPlayedSlot.set(normalizeName(match.player1), scheduleSlot);
    lastPlayedSlot.set(normalizeName(match.player2), scheduleSlot);
  };

  while (pending.length > 0) {
    const playersInSlot = new Set<string>();
    const unusedAccessibleBoards: number[] = [];

    for (const board of accessibleBoards) {
      const matchIndex = findBestMatchIndex(
        pending,
        (match) => match.requiresAccessibleBoardForMatch && !hasPlayerInSlot(match, playersInSlot),
        (a, b) =>
          recentlyPlayedPenalty(a, lastPlayedSlot, scheduleSlot) - recentlyPlayedPenalty(b, lastPlayedSlot, scheduleSlot) ||
          accessibleWaitScore(b, accessiblePlayerNames, lastPlayedSlot, scheduleSlot) - accessibleWaitScore(a, accessiblePlayerNames, lastPlayedSlot, scheduleSlot) ||
          compareEstimatedDuration(a, b) ||
          compareBaseMatchOrder(a, b)
      );

      if (matchIndex === -1) {
        unusedAccessibleBoards.push(board);
      } else {
        scheduleMatch(matchIndex, board, playersInSlot);
      }
    }

    for (const board of normalBoards) {
      const matchIndex = findBestMatchIndex(
        pending,
        (match) => !match.requiresAccessibleBoardForMatch && !hasPlayerInSlot(match, playersInSlot),
        (a, b) =>
          recentlyPlayedPenalty(a, lastPlayedSlot, scheduleSlot) - recentlyPlayedPenalty(b, lastPlayedSlot, scheduleSlot) ||
          compareEstimatedDuration(a, b) ||
          compareBaseMatchOrder(a, b)
      );

      if (matchIndex !== -1) scheduleMatch(matchIndex, board, playersInSlot);
    }

    for (const board of unusedAccessibleBoards) {
      const accessibleMatchReady = pending.some((match) => match.requiresAccessibleBoardForMatch && !hasPlayerInSlot(match, playersInSlot));
      if (accessibleMatchReady) continue;

      const matchIndex = findBestMatchIndex(
        pending,
        (match) => !match.requiresAccessibleBoardForMatch && !hasPlayerInSlot(match, playersInSlot),
        (a, b) =>
          recentlyPlayedPenalty(a, lastPlayedSlot, scheduleSlot) - recentlyPlayedPenalty(b, lastPlayedSlot, scheduleSlot) ||
          compareEstimatedDuration(a, b) ||
          compareBaseMatchOrder(a, b)
      );

      if (matchIndex !== -1) scheduleMatch(matchIndex, board, playersInSlot);
    }

    scheduleSlot++;
  }

  return scheduled;
}

export function createClubNightMatches(
  pools: Pool[],
  boardCount = CLUB_NIGHT_BOARD_COUNT,
  clubNightId?: string,
  clubId?: string
): ClubMatch[] {
  if (boardCount !== CLUB_NIGHT_BOARD_COUNT) {
    throw new Error("Klubaften bruger præcis 13 baner");
  }

  const accessiblePlayerNames = getAccessiblePlayerNames(clubId);
  const pendingMatches = createPendingMatches(pools, accessiblePlayerNames, clubId);
  const scheduledMatches = schedulePendingMatches(pendingMatches, boardCount, accessiblePlayerNames);

  return scheduledMatches.map((match) => ({
    id: clubNightId ? `${clubNightId}-match-${match.order}` : `thu-${match.order}`,
    clubId,
    clubNightId,
    pool: match.pool,
    round: match.round,
    order: match.order,
    scheduleSlot: match.scheduleSlot,
    player1: match.player1,
    player2: match.player2,
    board: match.board,
    boardType: getBoardType(match.board),
    requiresAccessibleBoardForMatch: match.requiresAccessibleBoardForMatch,
    bestOfLegs: 5,
    scoringMode: "total",
    estimatedDurationSeconds: match.durationEstimate.estimatedSeconds,
    timingEstimateSource: match.durationEstimate.source,
    timingEstimateConfidence: match.durationEstimate.confidence,
    score1: 0,
    score2: 0,
    status: "pending",
  }));
}

export const THURSDAY_BOARD_COUNT = CLUB_NIGHT_BOARD_COUNT;
export const THURSDAY_HANDICAP_BOARDS = CLUB_NIGHT_HANDICAP_BOARDS;
export const createThursdayMatches = createClubNightMatches;
