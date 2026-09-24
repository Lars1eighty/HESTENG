import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const competitionId = typeof body.competitionId === "string" ? body.competitionId.trim() : "";
  const competition = body.competition;
  const completedMatches = Array.isArray(body.completedMatches) ? body.completedMatches : [];

  if (!competitionId || !competition) {
    return NextResponse.json({ error: "Competition mangler." }, { status: 400 });
  }

  const prisma = getPrisma();
  const competitionJson = JSON.stringify(competition);
  const completedMatchesJson = JSON.stringify(completedMatches);
  const existing = await prisma.$queryRaw<Array<{ publicToken: string }>>`
    SELECT "publicToken" FROM "PublicClubNight"
    WHERE "clubNightId" = ${competitionId}
      AND "ownerUserId" = ${userId}
      AND "accessType" = 'competition'
    LIMIT 1
  `;

  if (existing[0]) {
    await prisma.$executeRaw`
      UPDATE "PublicClubNight"
      SET "clubNight" = ${competitionJson}::jsonb,
          "completedMatches" = ${completedMatchesJson}::jsonb,
          "status" = 'active',
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "clubNightId" = ${competitionId}
        AND "ownerUserId" = ${userId}
        AND "accessType" = 'competition'
    `;
    return NextResponse.json({ publicToken: existing[0].publicToken });
  }

  const id = randomUUID();
  const publicToken = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "PublicClubNight"
      ("id","clubNightId","clubId","ownerUserId","accessType","publicToken","status","clubNight","completedMatches","createdAt","updatedAt")
    VALUES
      (${id}, ${competitionId}, NULL, ${userId}, 'competition', ${publicToken}, 'active', ${competitionJson}::jsonb, ${completedMatchesJson}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  return NextResponse.json({ publicToken });
}
