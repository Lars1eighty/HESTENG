import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

function testUserId(ownerUserId: string) {
  return `training-test-user:${ownerUserId}`;
}

function testPlayerId(ownerUserId: string) {
  return `training-test-player:${ownerUserId}`;
}

async function requireTrainingTester() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Authentication required", status: 401 as const };
  }

  const isAdmin = (session.user.memberships ?? []).some((membership: { role: string }) => membership.role === "ADMIN");
  if (!isAdmin) {
    return { error: "Admin access required", status: 403 as const };
  }

  return { session };
}

export async function POST() {
  const resolved = await requireTrainingTester();
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const ownerUserId = resolved.session.user!.id!;
  const userId = testUserId(ownerUserId);
  const playerId = testPlayerId(ownerUserId);
  const prisma = getPrisma();

  await prisma.user.upsert({
    where: { id: userId },
    update: { name: "HESTENG Testspiller" },
    create: {
      id: userId,
      name: "HESTENG Testspiller",
    },
  });

  const player = await prisma.playerProfile.upsert({
    where: { id: playerId },
    update: { displayName: "HESTENG Testspiller" },
    create: {
      id: playerId,
      userId,
      displayName: "HESTENG Testspiller",
    },
    select: {
      id: true,
      displayName: true,
    },
  });

  return NextResponse.json({
    playerId: player.id,
    name: player.displayName,
  });
}

export async function DELETE() {
  const resolved = await requireTrainingTester();
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const ownerUserId = resolved.session.user.id;
  const prisma = getPrisma();

  // PlayerProfile and all TrainingResults are deleted through Prisma cascades.
  await prisma.user.deleteMany({
    where: { id: testUserId(ownerUserId) },
  });

  return NextResponse.json({ deleted: true });
}
