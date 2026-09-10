import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { createClubPlayer, listClubPlayers } from "@/lib/clubPlayerStore";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function canAccessClub(userId: string, clubId: string) {
  return getPrisma().clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const clubId = request.nextUrl.searchParams.get("clubId")?.trim() ?? "";
  if (!clubId) return NextResponse.json({ error: "clubId mangler." }, { status: 400 });
  if (!(await canAccessClub(userId, clubId))) {
    return NextResponse.json({ error: "Ingen adgang til klubben." }, { status: 403 });
  }

  return NextResponse.json({ players: await listClubPlayers(clubId) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const clubId = typeof body.clubId === "string" ? body.clubId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!clubId || !name) {
    return NextResponse.json({ error: "clubId og spillernavn skal udfyldes." }, { status: 400 });
  }
  if (!(await canAccessClub(userId, clubId))) {
    return NextResponse.json({ error: "Ingen adgang til klubben." }, { status: 403 });
  }

  const player = await createClubPlayer(clubId, name);
  return NextResponse.json({ player });
}
