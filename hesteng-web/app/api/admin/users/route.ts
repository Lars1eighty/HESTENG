import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const prisma = getPrisma();
  const adminMembership = await prisma.clubMembership.findFirst({
    where: {
      userId,
      role: "ADMIN",
    },
    select: { id: true },
  });

  if (!adminMembership) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const realUserWhere = {
    email: { not: null },
    id: { not: { startsWith: "training-user-" } },
  } as const;

  const [totalUsers, recentUsers] = await Promise.all([
    prisma.user.count({ where: realUserWhere }),
    prisma.user.findMany({
      where: realUserWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        playerProfile: {
          select: {
            username: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    totalUsers,
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      username: user.playerProfile?.username ?? null,
      createdAt: user.createdAt.toISOString(),
    })),
  });
}
