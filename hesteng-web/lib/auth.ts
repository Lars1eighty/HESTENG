import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { DEMO_CLUB_ID } from "@/data/clubs";
import { getPlayerRegistry } from "@/lib/playerRegistry";
import { normalizeName } from "@/lib/playerIdentity";
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

  if (existingForUser) {
    return existingForUser;
  }

  const mappedPlayer = resolveMappedClubPlayer(user.name);

  if (mappedPlayer) {
    const existingMappedProfile = await prisma.playerProfile.findUnique({
      where: { id: mappedPlayer.id },
    });

    if (!existingMappedProfile) {
      return prisma.playerProfile.create({
        data: {
          id: mappedPlayer.id,
          userId: user.userId,
          displayName: mappedPlayer.name,
          primaryClubId: DEMO_CLUB_ID,
        },
      });
    }

    if (isSyntheticTrainingUser(existingMappedProfile.userId)) {
      return prisma.playerProfile.update({
        where: { id: mappedPlayer.id },
        data: {
          userId: user.userId,
          displayName: mappedPlayer.name,
          primaryClubId: existingMappedProfile.primaryClubId ?? DEMO_CLUB_ID,
        },
      });
    }
  }

  return prisma.playerProfile.create({
    data: {
      id: `auth:${user.userId}`,
      userId: user.userId,
      displayName: user.name ?? user.email ?? "HESTENG Player",
    },
  });
}

function resolveMappedClubPlayer(name?: string | null) {
  const explicitPlayerId = process.env.HESTENG_AUTH_PLAYER_PROFILE_ID;
  const registry = getPlayerRegistry(DEMO_CLUB_ID);

  if (explicitPlayerId) {
    return registry.find((player) => player.id === explicitPlayerId) ?? null;
  }

  if (!name) {
    return null;
  }

  const normalizedName = normalizeName(name);
  const matches = registry.filter((player) => normalizeName(player.name) === normalizedName);

  return matches.length === 1 ? matches[0] : null;
}

function isSyntheticTrainingUser(userId: string) {
  return userId.startsWith("training-user-");
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
