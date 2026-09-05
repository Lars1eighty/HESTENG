import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { getPrisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(getPrisma()),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "database",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, user }) {
      if (session.user && user?.id) {
        const playerProfile = await ensurePlayerProfileForUser({
          userId: user.id,
          name: session.user.name ?? user.name,
          email: session.user.email ?? user.email,
        });

        session.user.id = user.id;
        session.user.playerProfileId = playerProfile.id;
        session.user.name = playerProfile.displayName;
        session.user.memberships = await getUserClubMemberships(user.id);
      }

      return session;
    },
  },
};

async function ensurePlayerProfileForUser(user: {
  userId: string;
  name?: string | null;
  email?: string | null;
}) {
  const prisma = getPrisma();
  const existingForUser = await prisma.playerProfile.findUnique({
    where: { userId: user.userId },
  });

  if (existingForUser && !isSeedPlayerProfile(existingForUser.id)) {
    return existingForUser;
  }

  if (existingForUser) {
    return moveSeedProfileToDemoOwnerAndCreateAuthProfile(existingForUser, user);
  }

  return prisma.playerProfile.create({
    data: {
      id: `auth:${user.userId}`,
      userId: user.userId,
      displayName: user.name ?? user.email ?? "HESTENG Player",
    },
  });
}

async function moveSeedProfileToDemoOwnerAndCreateAuthProfile(
  seedProfile: { id: string; displayName: string; primaryClubId: string | null },
  user: { userId: string; name?: string | null; email?: string | null }
) {
  const prisma = getPrisma();
  const demoUserId = `training-user-${seedProfile.id}`;
  const authProfileId = `auth:${user.userId}`;
  const displayName = user.name ?? user.email ?? "HESTENG Player";

  return prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: demoUserId },
      create: {
        id: demoUserId,
        name: seedProfile.displayName,
      },
      update: {},
    });

    await tx.playerProfile.update({
      where: { id: seedProfile.id },
      data: {
        userId: demoUserId,
      },
    });

    return tx.playerProfile.upsert({
      where: { id: authProfileId },
      create: {
        id: authProfileId,
        userId: user.userId,
        displayName,
      },
      update: {
        userId: user.userId,
        displayName,
      },
    });
  });
}

function isSeedPlayerProfile(playerProfileId: string) {
  return playerProfileId.startsWith("seed:");
}

async function getUserClubMemberships(userId: string) {
  const prisma = getPrisma();
  const memberships = await prisma.clubMembership.findMany({
    where: { userId },
    include: {
      club: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return memberships.map((membership) => ({
    clubId: membership.clubId,
    clubName: membership.club.name,
    role: membership.role,
  }));
}
