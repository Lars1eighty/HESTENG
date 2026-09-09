import { NextRequest, NextResponse } from "next/server";

import {
  findPublicClubNightByToken,
  updatePublicClubNightCompletedMatchesByToken,
} from "@/lib/publicClubNightStore";
import { validateGuestCompletedMatches } from "@/lib/publicClubNightValidation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const publicToken = token.trim();

  if (!publicToken) {
    return NextResponse.json({ error: "Gæsteadgang mangler." }, { status: 400 });
  }

  const record = await findPublicClubNightByToken(publicToken);

  if (!record) {
    return NextResponse.json({ error: "Turneringen blev ikke fundet." }, { status: 404 });
  }

  if (record.status !== "active") {
    return NextResponse.json({ error: "Turneringen er afsluttet." }, { status: 410 });
  }

  return NextResponse.json({
    publicToken: record.publicToken,
    clubNightId: record.clubNightId,
    clubId: record.clubId,
    clubNight: record.clubNight,
    completedMatches: record.completedMatches ?? [],
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const publicToken = token.trim();

  if (!publicToken) {
    return NextResponse.json({ error: "Gæsteadgang mangler." }, { status: 400 });
  }

  const record = await findPublicClubNightByToken(publicToken);
  if (!record) {
    return NextResponse.json({ error: "Turneringen blev ikke fundet." }, { status: 404 });
  }

  if (record.status !== "active") {
    return NextResponse.json({ error: "Turneringen er afsluttet." }, { status: 410 });
  }

  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.completedMatches)) {
    return NextResponse.json({ error: "Kampresultater mangler." }, { status: 400 });
  }

  if (!validateGuestCompletedMatches(record.clubNight, body.completedMatches)) {
    return NextResponse.json({ error: "Et kampresultat tilhører ikke denne klubaften." }, { status: 400 });
  }

  const updated = await updatePublicClubNightCompletedMatchesByToken({
    publicToken,
    completedMatches: body.completedMatches,
  });

  if (!updated) {
    return NextResponse.json({ error: "Turneringen er ikke længere aktiv." }, { status: 410 });
  }

  return NextResponse.json({ completedMatches: updated.completedMatches ?? [] });
}
