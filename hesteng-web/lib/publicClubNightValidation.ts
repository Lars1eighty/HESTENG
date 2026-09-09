type MatchLike = {
  id?: unknown;
  player1?: unknown;
  player1Id?: unknown;
  player2?: unknown;
  player2Id?: unknown;
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

export function validateGuestCompletedMatches(clubNight: unknown, completedMatches: unknown[]) {
  const allowedMatches = new Map(
    getMatches(clubNight)
      .filter((match) => typeof match.id === "string")
      .map((match) => [match.id as string, match]),
  );

  for (const completedValue of completedMatches) {
    const completed = asMatch(completedValue);
    if (!completed || typeof completed.id !== "string") return false;

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
  }

  return true;
}
