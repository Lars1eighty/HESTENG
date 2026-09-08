import { NextRequest, NextResponse } from "next/server";

import { findPublicClubNightByToken } from "@/lib/publicClubNightStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const record = await findPublicClubNightByToken(token);

  if (!record) {
    return NextResponse.json({ error: "Turneringen blev ikke fundet." }, { status: 404 });
  }

  if (record.status !== "active") {
    return NextResponse.json({ error: "Turneringen er afsluttet." }, { status: 410 });
  }

  return NextResponse.json({
    publicToken: record.publicToken,
    clubNight: record.clubNight,
    completedMatches: record.completedMatches ?? [],
  });
}
