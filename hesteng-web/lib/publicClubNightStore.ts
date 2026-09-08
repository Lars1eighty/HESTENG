import { getPrisma } from "@/lib/prisma";

export type PublicClubNightRecord = {
  id: string;
  clubNightId: string;
  clubId: string;
  publicToken: string;
  status: string;
  clubNight: unknown;
  completedMatches: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export async function findPublicClubNightById(clubNightId: string) {
  const rows = await getPrisma().$queryRaw<PublicClubNightRecord[]>`
    SELECT
      "id",
      "clubNightId",
      "clubId",
      "publicToken",
      "status",
      "clubNight",
      "completedMatches",
      "createdAt",
      "updatedAt"
    FROM "PublicClubNight"
    WHERE "clubNightId" = ${clubNightId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}
