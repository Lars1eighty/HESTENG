import { DEMO_CLUB_ID } from "@/data/clubs";
import { readSharedClubNightState, writeSharedClubNightState } from "@/lib/serverClubNightStateStore";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { clubId?: string };
  const clubId = body.clubId ?? DEMO_CLUB_ID;
  const current = await readSharedClubNightState();
  const clubNights = current.clubNights.filter((clubNight) => (clubNight.clubId ?? DEMO_CLUB_ID) !== clubId);
  const completedMatches = current.completedMatches.filter((match) => (match.clubId ?? DEMO_CLUB_ID) !== clubId);
  const currentClubNightId = clubNights.some((clubNight) => clubNight.id === current.currentClubNightId)
    ? current.currentClubNightId
    : clubNights.find((clubNight) => clubNight.status === "active")?.id ?? clubNights[0]?.id ?? null;
  const state = await writeSharedClubNightState({
    clubNights,
    currentClubNightId,
    completedMatches,
  });

  return Response.json({
    ok: true,
    removedClubNights: current.clubNights.length - clubNights.length,
    removedCompletedMatches: current.completedMatches.length - completedMatches.length,
    currentClubNightId: state.currentClubNightId,
  });
}
