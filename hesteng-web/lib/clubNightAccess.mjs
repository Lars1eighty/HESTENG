/**
 * Small, pure guards for the legacy shared Club-night snapshot.
 * These checks are deliberately independent of NextAuth so they can be tested.
 */

export function scopeClubNightState(state, permittedClubIds) {
  const clubNights = state.clubNights.filter(
    (night) => night && permittedClubIds.has(night.clubId),
  );
  const nightsById = new Map(clubNights.map((night) => [night.id, night]));
  const allNightsById = new Map(state.clubNights.map((night) => [night.id, night]));
  const completedMatches = state.completedMatches.filter((match) => {
    if (!match || typeof match !== "object") return false;
    if (typeof match.clubId === "string") {
      const night = allNightsById.get(match.clubNightId);
      return permittedClubIds.has(match.clubId) && (!night || night.clubId === match.clubId);
    }
    return nightsById.has(match.clubNightId);
  });
  const currentClubNightId = nightsById.has(state.currentClubNightId)
    ? state.currentClubNightId
    : clubNights.find((night) => night.status === "active")?.id ?? clubNights[0]?.id ?? null;

  return { ...state, clubNights, completedMatches, currentClubNightId };
}

export function knownMatchBelongsToClub(state, clubId, clubNightId, matchId) {
  if (!clubId || !clubNightId || !matchId) return false;
  const night = state.clubNights.find(
    (item) => item.id === clubNightId && item.clubId === clubId,
  );
  if (!night || !Array.isArray(night.matches)) return false;
  return night.matches.some(
    (match) => match.id === matchId
      && (!match.clubId || match.clubId === clubId)
      && (!match.clubNightId || match.clubNightId === clubNightId),
  );
}

export function validClubNightSnapshot(nights, clubId) {
  if (!Array.isArray(nights) || typeof clubId !== "string" || !clubId) return false;
  const ids = new Set();
  return nights.every((night) => {
    if (!night || typeof night.id !== "string" || !night.id
        || night.clubId !== clubId || !Array.isArray(night.matches)
        || ids.has(night.id)) return false;
    ids.add(night.id);
    return night.matches.every((match) =>
      match && typeof match.id === "string" && !!match.id
      && (!match.clubId || match.clubId === clubId)
      && (!match.clubNightId || match.clubNightId === night.id),
    );
  });
}
