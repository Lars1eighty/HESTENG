type MatchLike = {
  id?: unknown;
  player1?: unknown;
  player1Id?: unknown;
  player2?: unknown;
  player2Id?: unknown;
  bestOfLegs?: unknown;
};

type CompletedMatchLike = MatchLike & {
  winner?: unknown;
  score1?: unknown;
  score2?: unknown;
  status?: unknown;
  players?: unknown;
};

type ClubNightLike = {
  matches?: unknown;
};

function asMatch(value: unknown): MatchLike | null {
  return value !== null && typeof value === "object" ? (value as MatchLike) : null;
}

function getMatches(clubNight: unknown): MatchLike[] {
  if (clubNight === null || typeof clubNight !== "object") return [];
  const matches = (clubNight as ClubNightLike).matches;
  if (!Array.isArray(matches)) return [];
  return matches.map(asMatch).filter((match): match is MatchLike => match !== null);
}

function hasValidPlayerStats(players: unknown, allowed: MatchLike) {
  if (players === undefined) return true;
  if (!Array.isArray(players) || players.length !== 2) return false;

  const expected = [
    { name: allowed.player1, playerId: allowed.player1Id },
    { name: allowed.player2, playerId: allowed.player2Id },
  ];

  return players.every((value, index) => {
    if (value === null || typeof value !== "object") return false;
    const stats = value as Record<string, unknown>;
    if (stats.name !== expected[index].name) return false;
    if (typeof expected[index].playerId === "string" && stats.playerId !== expected[index].playerId) return false;

    const nonNegativeNumbers = ["legs", "totalScored", "entries", "average", "checkouts", "checkoutAttempts", "checkoutPercent", "oneEighties"];
    for (const field of nonNegativeNumbers) {
      if (typeof stats[field] !== "number" || !Number.isFinite(stats[field]) || (stats[field] as number) < 0) return false;
    }

    if (stats.highestCheckout !== undefined && (typeof stats.highestCheckout !== "number" || !Number.isFinite(stats.highestCheckout) || stats.highestCheckout < 0)) return false;
    if (stats.fastestLegDarts !== null && stats.fastestLegDarts !== undefined && (!Number.isInteger(stats.fastestLegDarts) || (stats.fastestLegDarts as number) <= 0)) return false;
    return true;
  });
}

function hasValidOutcome(completed: CompletedMatchLike, allowed: MatchLike) {
  if (!Number.isInteger(completed.score1) || !Number.isInteger(completed.score2)) return false;
  if ((completed.score1 as number) < 0 || (completed.score2 as number) < 0) return false;
  if (completed.score1 === completed.score2) return false;
  if (completed.status !== "finished") return false;

  const expectedWinner =
    (completed.score1 as number) > (completed.score2 as number) ? allowed.player1 : allowed.player2;
  if (completed.winner !== expectedWinner) return false;

  if (typeof allowed.bestOfLegs === "number") {
    const legsToWin = Math.floor(allowed.bestOfLegs / 2) + 1;
    const winningScore = Math.max(completed.score1 as number, completed.score2 as number);
    if (winningScore !== legsToWin) return false;
  }

  return hasValidPlayerStats(completed.players, allowed);
}

export function validateGuestCompletedMatches(clubNight: unknown, completedMatches: unknown[]) {
  const allowedMatches = new Map(
    getMatches(clubNight)
      .filter((match) => typeof match.id === "string")
      .map((match) => [match.id as string, match]),
  );

  const seenIds = new Set<string>();

  for (const completedValue of completedMatches) {
    const completed = asMatch(completedValue) as CompletedMatchLike | null;
    if (!completed || typeof completed.id !== "string" || seenIds.has(completed.id)) return false;
    seenIds.add(completed.id);

    const allowed = allowedMatches.get(completed.id);
    if (!allowed) return false;

    if (completed.player1 !== allowed.player1 || completed.player2 !== allowed.player2) return false;

    if (
      typeof allowed.player1Id === "string" &&
      completed.player1Id !== allowed.player1Id
    ) {
      return false;
    }

    if (
      typeof allowed.player2Id === "string" &&
      completed.player2Id !== allowed.player2Id
    ) {
      return false;
    }

    if (!hasValidOutcome(completed, allowed)) return false;
  }

  return true;
}
