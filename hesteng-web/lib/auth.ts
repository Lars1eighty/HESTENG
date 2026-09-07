import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { getPrisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwordUtils";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(getPrisma()),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    CredentialsProvider({
      name: "E-mail og adgangskode",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Adgangskode", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase() ?? "";
        const password = credentials?.password ?? "";

        if (!email || !password) return null;

        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            emailVerified: true,
          },
        });

        if (!user?.passwordHash || !user.emailVerified) return null;

        const isValidPassword = await verifyPassword(password, user.passwordHash);
        if (!isValidPassword) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const existingAccount = await getPrisma().account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          select: {
            userId: true,
          },
        });

        console.log("Google sign-in diagnostic", {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: typeof profile?.email === "string" ? profile.email : undefined,
          sub: typeof profile?.sub === "string" ? profile.sub : undefined,
          accountFound: Boolean(existingAccount),
          userId: existingAccount?.userId ?? null,
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      const userId = token.sub;
      if (session.user && userId) {
        const user = await getPrisma().user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        if (!user) return session;

        const playerProfile = await ensurePlayerProfileForUser({
          userId: user.id,
          name: user.name,
          email: user.email,
        });

        session.user.id = user.id;
        session.user.playerProfileId = playerProfile.id;
        session.user.name = playerProfile.displayName;
        session.user.email = user.email;
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
