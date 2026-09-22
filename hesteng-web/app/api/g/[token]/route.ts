import { NextRequest, NextResponse } from "next/server";

import {
  findPublicClubNightByToken,
  updatePublicClubNightCompletedMatchesByToken,
} from "@/lib/publicClubNightStore";
import { validateGuestCompletedMatches } from "@/lib/publicClubNightValidation";
import { upsertSharedClubNightMatches, upsertSharedCompletedMatch } from "@/lib/serverClubNightStateStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

type MatchWithId = { id?: unknown; player1Id?: unknown; player2Id?: unknown };
type ClubNightWithMatches = { matches?: unknown };

function asCompletedMatches(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function matchId(value: unknown) {
  return value !== null && typeof value === "object" && typeof (value as MatchWithId).id === "string"
    ? (value as MatchWithId).id as string
    : null;
}

function findPublishedMatch(clubNight: unknown, id: string) {
  if (clubNight === null || typeof clubNight !== "object") return null;
  const matches = (clubNight as ClubNightWithMatches).matches;
  if (!Array.isArray(matches)) return null;
  return matches.find((match) => matchId(match) === id) as MatchWithId | undefined ?? null;
}

function withPublishedPlayerIds(completedMatch: unknown, publishedMatch: MatchWithId | null) {
  if (completedMatch === null || typeof completedMatch !== "object" || !publishedMatch) return completedMatch;
  return {
    ...(completedMatch as Record<string, unknown>),
    ...(typeof publishedMatch.player1Id === "string" ? { player1Id: publishedMatch.player1Id } : {}),
    ...(typeof publishedMatch.player2Id === "string" ? { player2Id: publishedMatch.player2Id } : {}),
  };
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
  const submittedMatch = body.completedMatch;
  const completedMatchId = matchId(submittedMatch);

  if (!completedMatchId) {
    return NextResponse.json({ error: "Kampresultatet mangler." }, { status: 400 });
  }

  const completedMatch = withPublishedPlayerIds(
    submittedMatch,
    findPublishedMatch(record.clubNight, completedMatchId),
  );

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

  // QR-scoring must feed the same shared state used by the live TV dashboard.
  // Attach club context here because guest results are submitted outside MatchStore.
  const sharedCompletedMatch = completedMatch !== null && typeof completedMatch === "object"
    ? {
        ...(completedMatch as Record<string, unknown>),
        clubId: record.clubId,
        clubNightId: record.clubNightId,
      }
    : completedMatch;
  const typedCompletedMatch = sharedCompletedMatch as Parameters<typeof upsertSharedCompletedMatch>[0];
  await upsertSharedCompletedMatch(typedCompletedMatch);

  const publishedMatch = findPublishedMatch(record.clubNight, completedMatchId);
  if (publishedMatch) {
    const finishedMatch = {
      ...publishedMatch,
      id: completedMatchId,
      clubId: record.clubId,
      clubNightId: record.clubNightId,
      score1: typedCompletedMatch.score1,
      score2: typedCompletedMatch.score2,
      winner: typedCompletedMatch.winner,
      status: "finished" as const,
      completedAt: typedCompletedMatch.completedAt,
      finishedAt: typedCompletedMatch.finishedAt,
    } as unknown as Parameters<typeof upsertSharedClubNightMatches>[1][number];
    await upsertSharedClubNightMatches(record.clubNightId, [finishedMatch]);
  }

  return NextResponse.json({ completedMatches: updated.completedMatches ?? [] });
}
