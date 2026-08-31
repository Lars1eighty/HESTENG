import "next-auth";
import type { ClubMembershipRole } from "@prisma/client";

declare module "next-auth" {
  interface ClubMembershipSession {
    clubId: string;
    clubName: string;
    role: ClubMembershipRole;
  }

  interface Session {
    user?: {
      id?: string;
      playerProfileId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      memberships?: ClubMembershipSession[];
    };
  }
}
