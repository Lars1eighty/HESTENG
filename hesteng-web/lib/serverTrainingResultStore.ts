import { promises as fs } from "fs";
import path from "path";
import type { TrainingResult } from "@/lib/trainingTypes";

export type SharedTrainingResultState = {
  version: 1;
  results: TrainingResult[];
  updatedAt: string;
};

const STORE_DIR = path.join(process.cwd(), ".hesteng-shared");
const STORE_FILE = path.join(STORE_DIR, "training-results.json");

const EMPTY_STATE: SharedTrainingResultState = {
  version: 1,
  results: [],
  updatedAt: new Date(0).toISOString(),
};

async function ensureStoreDir() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

function getDeterministicResultKey(result: TrainingResult) {
  return result.id || `${result.playerId}:${result.exerciseId}:${result.variant ?? ""}:${result.completedAt}`;
}

export function normalizeTrainingResults(results: TrainingResult[]) {
  const byKey = new Map<string, TrainingResult>();

  results.forEach((result) => {
    if (!result?.playerId || !result.exerciseId || !result.completedAt) return;
    byKey.set(getDeterministicResultKey(result), result);
  });

  return [...byKey.values()].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

function normalizeState(input: Partial<SharedTrainingResultState>): SharedTrainingResultState {
  return {
    version: 1,
    results: normalizeTrainingResults(Array.isArray(input.results) ? input.results : []),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export async function readSharedTrainingResults(): Promise<SharedTrainingResultState> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return EMPTY_STATE;
    throw error;
  }
}

async function writeSharedTrainingResults(input: Partial<SharedTrainingResultState>) {
  const state = normalizeState({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  await ensureStoreDir();
  const temporaryFile = `${STORE_FILE}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(temporaryFile, STORE_FILE);

  return state;
}

export async function mergeSharedTrainingResults(results: TrainingResult[]) {
  const current = await readSharedTrainingResults();

  return writeSharedTrainingResults({
    results: normalizeTrainingResults([...results, ...current.results]),
  });
}

export async function mergeSharedTrainingResultsForPlayer(playerId: string, results: TrainingResult[]) {
  const current = await readSharedTrainingResults();
  const playerResults = results.filter((result) => result.playerId === playerId);
  const otherPlayerResults = current.results.filter((result) => result.playerId !== playerId);

  return writeSharedTrainingResults({
    results: normalizeTrainingResults([...playerResults, ...otherPlayerResults, ...current.results.filter((result) => result.playerId === playerId)]),
  });
}

export async function upsertSharedTrainingResult(result: TrainingResult) {
  const current = await readSharedTrainingResults();

  return writeSharedTrainingResults({
    results: normalizeTrainingResults([result, ...current.results]),
  });
}

export async function deleteSharedTrainingResult(resultId: string, playerId?: string) {
  const current = await readSharedTrainingResults();

  return writeSharedTrainingResults({
    results: current.results.filter((result) => result.id !== resultId || (playerId !== undefined && result.playerId !== playerId)),
  });
}
