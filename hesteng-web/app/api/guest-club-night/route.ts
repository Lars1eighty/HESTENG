import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { createPublicClubNight, findPublicClubNightById } from "@/lib/publicClubNightStore";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function canAccessClub(userId: string, clubId: string) {
  return getPrisma().clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const clubId = typeof body.clubId === "string" ? body.clubId.trim() : "";
  const clubNightId = typeof body.clubNightId === "string" ? body.clubNightId.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim() : "active";
  const clubNight = body.clubNight;

  if (!clubId || !clubNightId || !clubNight) {
    return NextResponse.json({ error: "Klub og klubaften skal udfyldes." }, { status: 400 });
  }

  if (!(await canAccessClub(userId, clubId))) {
    return NextResponse.json({ error: "Ingen adgang til klubben." }, { status: 403 });
  }

  const existing = await findPublicClubNightById(clubNightId);
  if (existing) return NextResponse.json(existing);

  const record = await createPublicClubNight({ clubNightId, clubId, status, clubNight });
  return NextResponse.json(record);
}
