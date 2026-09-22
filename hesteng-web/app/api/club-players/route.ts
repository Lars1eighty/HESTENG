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


export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const clubId = typeof body.clubId === "string" ? body.clubId.trim() : "";
  const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
  const deleteStatistics = body.deleteStatistics === true;
  if (!clubId || !playerId) {
    return NextResponse.json({ error: "clubId og playerId mangler." }, { status: 400 });
  }
  if (!(await canAccessClub(userId, clubId))) {
    return NextResponse.json({ error: "Ingen adgang til klubben." }, { status: 403 });
  }

  const prisma = getPrisma();
  const player = await prisma.clubPlayer.findFirst({ where: { id: playerId, clubId } });
  if (!player) return NextResponse.json({ error: "Spilleren findes ikke." }, { status: 404 });

  const nights = await prisma.publicClubNight.findMany({
    where: { clubId },
    select: { clubNight: true, completedMatches: true },
  });
  const playerKey = player.name.trim().toLocaleLowerCase("da-DK");
  const hasStatistics = nights.some((night) =>
    JSON.stringify([night.clubNight, night.completedMatches]).toLocaleLowerCase("da-DK").includes(playerKey)
  );

  if (hasStatistics && !deleteStatistics) {
    return NextResponse.json({
      error: "Spilleren har registrerede kampdata og kan ikke slettes direkte.",
      hasStatistics: true,
      player: { id: player.id, name: player.name },
    }, { status: 409 });
  }

  await prisma.clubPlayer.delete({ where: { id: player.id } });
  return NextResponse.json({ deleted: true, playerId: player.id });
}
