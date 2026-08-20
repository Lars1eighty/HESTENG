import type { ClubMatch } from "@/lib/matchEngine";

/**
 * Returns the next unfinished match for each board.
 * When a match is finished, the following queued match on that board
 * automatically becomes the next match without rebuilding the schedule.
 */
export function getNextMatchesByBoard(matches: ClubMatch[]): ClubMatch[] {
  const nextByBoard = new Map<number, ClubMatch>();

  for (const match of matches) {
    if (match.status === "finished") continue;

    const current = nextByBoard.get(match.board);
    const matchOrder = match.order ?? Number.MAX_SAFE_INTEGER;
    const currentOrder = current?.order ?? Number.MAX_SAFE_INTEGER;
    if (!current || matchOrder < currentOrder || (matchOrder === currentOrder && match.id.localeCompare(current.id, undefined, { numeric: true }) < 0)) {
      nextByBoard.set(match.board, match);
    }
  }

  return [...nextByBoard.values()].sort((a, b) => a.board - b.board);
}
