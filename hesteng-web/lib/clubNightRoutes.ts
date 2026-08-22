export function getClubNightMatchHref(matchId: string, clubNightId?: string | null) {
  const href = `/klubaften/kamp/${encodeURIComponent(matchId)}`;
  if (!clubNightId) return href;
  return `${href}?clubNightId=${encodeURIComponent(clubNightId)}`;
}
