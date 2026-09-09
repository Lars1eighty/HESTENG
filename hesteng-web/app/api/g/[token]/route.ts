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

type MatchWithId = { id?: unknown };

function asCompletedMatches(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function matchId(value: unknown) {
  return value !== null && typeof value === "object" && typeof (value as MatchWithId).id === "string"
    ? (value as MatchWithId).id as string
    : null;
}

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
  const completedMatch = body.completedMatch;
  const completedMatchId = matchId(completedMatch);

  if (!completedMatchId) {
    return NextResponse.json({ error: "Kampresultatet mangler." }, { status: 400 });
  }

  if (!validateGuestCompletedMatches(record.clubNight, [completedMatch])) {
    return NextResponse.json({ error: "Kampresultatet er ikke gyldigt for denne klubaften." }, { status: 400 });
  }

  const currentMatches = asCompletedMatches(record.completedMatches);
  const mergedMatches = [
    ...currentMatches.filter((match) => matchId(match) !== completedMatchId),
    completedMatch,
  ];

  const updated = await updatePublicClubNightCompletedMatchesByToken({
    publicToken,
    completedMatches: mergedMatches,
  });

  if (!updated) {
    return NextResponse.json({ error: "Turneringen er ikke længere aktiv." }, { status: 410 });
  }

  return NextResponse.json({ completedMatches: updated.completedMatches ?? [] });
}
