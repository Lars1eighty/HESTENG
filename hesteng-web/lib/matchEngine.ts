import { Pool } from "@/context/KlubaftenContext";

export type ClubMatch = {
  id: string;
  pool: string;
  round: number;
  player1: string;
  player2: string;
  board: number;
  boardType: "normal" | "handicap";
  bestOfLegs: number;
  score1: number;
  score2: number;
  winner?: string;
  loser?: string;
  finishedAt?: string;
  status: "pending" | "live" | "finished";
};

export const CLUB_NIGHT_BOARD_COUNT = 13;
export const CLUB_NIGHT_HANDICAP_BOARDS = [4, 13];

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

export function createClubNightMatches(
  pools: Pool[],
  boardCount = CLUB_NIGHT_BOARD_COUNT
): ClubMatch[] {
  if (boardCount !== CLUB_NIGHT_BOARD_COUNT) {
    throw new Error("Klubaften bruger præcis 13 baner");
  }

  const matches: ClubMatch[] = [];
  let matchNumber = 1;

  pools.forEach((pool) => {
    createRoundRobin(pool.players).forEach((roundMatches, roundIndex) => {
      roundMatches.forEach((pair, matchIndex) => {
        const [player1, player2] = pair.split("|||");
        const board = (matchIndex % boardCount) + 1;

        matches.push({
          id: `thu-${matchNumber++}`,
          pool: pool.name,
          round: roundIndex + 1,
          player1,
          player2,
          board,
          boardType: getBoardType(board),
          bestOfLegs: 5,
          score1: 0,
          score2: 0,
          status: "pending",
        });
      });
    });
  });

  return matches;
}

export const THURSDAY_BOARD_COUNT = CLUB_NIGHT_BOARD_COUNT;
export const THURSDAY_HANDICAP_BOARDS = CLUB_NIGHT_HANDICAP_BOARDS;
export const createThursdayMatches = createClubNightMatches;
