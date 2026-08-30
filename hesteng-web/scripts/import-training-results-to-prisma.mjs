import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for Prisma PostgreSQL persistence");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const storeFile = path.join(process.cwd(), ".hesteng-shared", "training-results.json");

function normalizeDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function normalizeResults(results) {
  const byId = new Map();

  for (const result of results) {
    if (!result?.id || !result.playerId || !result.exerciseId || !result.completedAt) continue;
    byId.set(result.id, result);
  }

  return [...byId.values()];
}

async function ensurePlayerProfile(playerId) {
  const userId = `training-user-${playerId}`;

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

async function readJsonResults() {
  try {
    const raw = await readFile(storeFile, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeResults(Array.isArray(parsed?.results) ? parsed.results : []);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function main() {
  const results = await readJsonResults();
  let imported = 0;
  let existing = 0;

  for (const result of results) {
    const alreadyExists = await prisma.trainingResult.findUnique({
      where: { id: result.id },
      select: { id: true },
    });

    if (alreadyExists) {
      existing += 1;
      continue;
    }

    await ensurePlayerProfile(result.playerId);
    await prisma.trainingResult.create({
      data: {
        id: result.id,
        playerId: result.playerId,
        clubId: result.clubId ?? null,
        exerciseId: result.exerciseId,
        variant: result.variant ?? null,
        completedAt: normalizeDate(result.completedAt),
        metrics: result.metrics ?? {},
        details: result.details ?? null,
      },
    });
    imported += 1;
  }

  console.log(JSON.stringify({
    source: storeFile,
    found: results.length,
    imported,
    alreadyExisting: existing,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
