import { Pool } from "@/context/KlubaftenContext";

export type ClubMatch = {
  id: string;
  pool: string;
  round: number;
  player1: string;
  player2: string;
  board: number;
  status: "pending";
};

const DEFAULT_BOARD_COUNT = 6;

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
      if (a !== "__BYE__" && b !== "__BYE__") {
        matches.push(`${a}|||${b}`);
      }
    }

    rounds.push(matches);
    list.splice(1, 0, list.pop()!);
  }

  return rounds;
}

export function createThursdayMatches(
  pools: Pool[],
  boardCount = DEFAULT_BOARD_COUNT
): ClubMatch[] {
  if (boardCount < 1) throw new Error("Der skal være mindst én bane");

  const matches: ClubMatch[] = [];
  let matchNumber = 1;

  pools.forEach((pool) => {
    const rounds = createRoundRobin(pool.players);

    rounds.forEach((roundMatches, roundIndex) => {
      roundMatches.forEach((pair, matchIndex) => {
        const [player1, player2] = pair.split("|||");
        matches.push({
          id: `thu-${matchNumber++}`,
          pool: pool.name,
          round: roundIndex + 1,
          player1,
          player2,
          board: (matchIndex % boardCount) + 1,
          status: "pending",
        });
      });
    });
  });

  return matches;
}
