import { NextRequest, NextResponse } from "next/server";
import {
  readSharedClubNightState,
  replaceSharedClubNightSnapshot,
  upsertSharedClubNightMatches,
  upsertSharedCompletedMatch,
} from "@/lib/serverClubNightStateStore";

export const runtime = "nodejs";

export async function GET() {
  const state = await readSharedClubNightState();
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body?.type === "completedMatch") {
    const state = await upsertSharedCompletedMatch(body.completedMatch);
    return NextResponse.json(state);
  }

  if (body?.type === "matches" && typeof body.clubNightId === "string") {
    const state = await upsertSharedClubNightMatches(
      body.clubNightId,
      Array.isArray(body.matches) ? body.matches : []
    );
    return NextResponse.json(state);
  }

  const state = await replaceSharedClubNightSnapshot({
    clubNights: Array.isArray(body?.clubNights) ? body.clubNights : [],
    currentClubNightId: typeof body?.currentClubNightId === "string" ? body.currentClubNightId : null,
    completedMatches: Array.isArray(body?.completedMatches) ? body.completedMatches : [],
  });

  return NextResponse.json(state);
}
