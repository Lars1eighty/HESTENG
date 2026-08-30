import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [],
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;

        if (typeof token.playerProfileId === "string") {
          session.user.playerProfileId = token.playerProfileId;
        }
      }

      return session;
    },
    jwt({ token }) {
      return token;
    },
  },
};
