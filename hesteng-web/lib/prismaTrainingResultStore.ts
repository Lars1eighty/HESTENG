import { Prisma } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";
import type { TrainingResult, TrainingResultDetails, TrainingResultMetrics } from "@/lib/trainingTypes";

export type PrismaTrainingResultState = {
  version: 1;
  results: TrainingResult[];
  updatedAt: string;
};

function normalizeTrainingResults(results: TrainingResult[]) {
  const byId = new Map<string, TrainingResult>();

  results.forEach((result) => {
    if (!result?.id || !result.playerId || !result.exerciseId || !result.completedAt) return;
    byId.set(result.id, result);
  });

  return [...byId.values()].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

function normalizeDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function toTrainingResult(result: {
  id: string;
  playerId: string;
  clubId: string | null;
  exerciseId: string;
  variant: string | null;
  completedAt: Date;
  metrics: unknown;
  details: unknown;
}): TrainingResult {
  return {
    id: result.id,
    playerId: result.playerId,
    clubId: result.clubId ?? undefined,
    exerciseId: result.exerciseId,
    variant: result.variant ?? undefined,
    completedAt: result.completedAt.toISOString(),
    metrics: isRecord(result.metrics) ? result.metrics as TrainingResultMetrics : {},
    details: isRecord(result.details) ? result.details as TrainingResultDetails : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function ensurePlayerProfile(playerId: string) {
  const userId = `training-user-${playerId}`;
  const prisma = getPrisma();

  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      name: playerId,
      playerProfile: {
        create: {
          id: playerId,
          displayName: playerId,
        },
      },
    },
    update: {},
  });

  await prisma.playerProfile.upsert({
    where: { id: playerId },
    create: {
      id: playerId,
      userId,
      displayName: playerId,
    },
    update: {},
  });
}

export async function readPrismaTrainingResultsForPlayer(playerId: string): Promise<PrismaTrainingResultState> {
  const prisma = getPrisma();
  const results = await prisma.trainingResult.findMany({
    where: { playerId },
    orderBy: { completedAt: "desc" },
  });

  return {
    version: 1,
    results: results.map(toTrainingResult),
    updatedAt: new Date().toISOString(),
  };
}

export async function upsertPrismaTrainingResult(result: TrainingResult): Promise<PrismaTrainingResultState> {
  const prisma = getPrisma();
  await ensurePlayerProfile(result.playerId);
  const metrics = result.metrics as Prisma.InputJsonValue;
  const details = result.details ? result.details as Prisma.InputJsonValue : Prisma.JsonNull;

  await prisma.trainingResult.upsert({
    where: { id: result.id },
    create: {
      id: result.id,
      playerId: result.playerId,
      clubId: result.clubId ?? null,
      exerciseId: result.exerciseId,
      variant: result.variant ?? null,
      completedAt: normalizeDate(result.completedAt),
      metrics,
      details,
    },
    update: {
      clubId: result.clubId ?? null,
      exerciseId: result.exerciseId,
      variant: result.variant ?? null,
      completedAt: normalizeDate(result.completedAt),
      metrics,
      details,
    },
  });

  return readPrismaTrainingResultsForPlayer(result.playerId);
}

export async function mergePrismaTrainingResultsForPlayer(playerId: string, results: TrainingResult[]) {
  const playerResults = normalizeTrainingResults(results.filter((result) => result.playerId === playerId));

  for (const result of playerResults) {
    await upsertPrismaTrainingResult(result);
  }

  return readPrismaTrainingResultsForPlayer(playerId);
}

export async function deletePrismaTrainingResult(resultId: string, playerId: string) {
  const prisma = getPrisma();
  await prisma.trainingResult.deleteMany({
    where: {
      id: resultId,
      playerId,
    },
  });

  return readPrismaTrainingResultsForPlayer(playerId);
}
