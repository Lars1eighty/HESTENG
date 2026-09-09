import { randomUUID } from "node:crypto";

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

export async function findPublicClubNightByToken(publicToken: string) {
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
    WHERE "publicToken" = ${publicToken}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function createPublicClubNight(input: {
  clubNightId: string;
  clubId: string;
  status: string;
  clubNight: unknown;
}) {
  const id = randomUUID();
  const publicToken = randomUUID();
  const completedMatches: unknown[] = [];

  const rows = await getPrisma().$queryRaw<PublicClubNightRecord[]>`
    INSERT INTO "PublicClubNight" (
      "id",
      "clubNightId",
      "clubId",
      "publicToken",
      "status",
      "clubNight",
      "completedMatches",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${input.clubNightId},
      ${input.clubId},
      ${publicToken},
      ${input.status},
      ${JSON.stringify(input.clubNight)}::jsonb,
      ${JSON.stringify(completedMatches)}::jsonb,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    RETURNING *
  `;

  return rows[0];
}

export async function updatePublicClubNightSnapshot(input: {
  clubNightId: string;
  status: string;
  clubNight: unknown;
  completedMatches: unknown;
}) {
  const rows = await getPrisma().$queryRaw<PublicClubNightRecord[]>`
    UPDATE "PublicClubNight"
    SET
      "status" = ${input.status},
      "clubNight" = ${JSON.stringify(input.clubNight)}::jsonb,
      "completedMatches" = ${JSON.stringify(input.completedMatches)}::jsonb,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "clubNightId" = ${input.clubNightId}
    RETURNING *
  `;

  return rows[0] ?? null;
}

export async function updatePublicClubNightSnapshotByToken(input: {
  publicToken: string;
  clubNight: unknown;
  completedMatches: unknown;
}) {
  const rows = await getPrisma().$queryRaw<PublicClubNightRecord[]>`
    UPDATE "PublicClubNight"
    SET
      "clubNight" = ${JSON.stringify(input.clubNight)}::jsonb,
      "completedMatches" = ${JSON.stringify(input.completedMatches)}::jsonb,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "publicToken" = ${input.publicToken}
      AND "status" = 'active'
    RETURNING *
  `;

  return rows[0] ?? null;
}
