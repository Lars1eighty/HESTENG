import { promises as fs } from "fs";
import path from "path";
import type { ClubNight, KlubaftenSnapshot } from "@/context/KlubaftenContext";
import type { CompletedMatch } from "@/lib/matchStore";
import type { ClubMatch } from "@/lib/matchEngine";

export type SharedClubNightState = KlubaftenSnapshot & {
  version: 1;
  completedMatches: CompletedMatch[];
  updatedAt: string;
};

const STORE_DIR = path.join(process.cwd(), ".hesteng-shared");
const STORE_FILE = path.join(STORE_DIR, "club-night-state.json");

const EMPTY_STATE: SharedClubNightState = {
  version: 1,
  clubNights: [],
  currentClubNightId: null,
  completedMatches: [],
  updatedAt: new Date(0).toISOString(),
};

let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureStoreDir() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

function normalizeCompletedMatches(matches: CompletedMatch[]) {
  const byId = new Map<string, CompletedMatch>();
  matches.forEach((match) => {
    if (!match?.id) return;
    const existing = byId.get(match.id);
    const matchCompletedAt = match.completedAt ?? match.finishedAt ?? "";
    const existingCompletedAt = existing?.completedAt ?? existing?.finishedAt ?? "";
    if (!existing || matchCompletedAt.localeCompare(existingCompletedAt) >= 0) byId.set(match.id, match);
  });
  return [...byId.values()].sort((a, b) => (b.completedAt ?? b.finishedAt ?? "").localeCompare(a.completedAt ?? a.finishedAt ?? ""));
}

function normalizeClubNights(clubNights: ClubNight[]) {
  const byId = new Map<string, ClubNight>();
  clubNights.forEach((clubNight) => {
    if (clubNight?.id) byId.set(clubNight.id, clubNight);
  });
  return [...byId.values()];
}

function normalizeState(input: Partial<SharedClubNightState>): SharedClubNightState {
  const clubNights = normalizeClubNights(Array.isArray(input.clubNights) ? input.clubNights : []);
  const currentClubNightId = clubNights.some((clubNight) => clubNight.id === input.currentClubNightId)
    ? input.currentClubNightId ?? null
    : clubNights.find((clubNight) => clubNight.status === "active")?.id ?? clubNights[0]?.id ?? null;
  return {
    version: 1,
    clubNights,
    currentClubNightId,
    completedMatches: normalizeCompletedMatches(Array.isArray(input.completedMatches) ? input.completedMatches : []),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export async function readSharedClubNightState(): Promise<SharedClubNightState> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return EMPTY_STATE;
    throw error;
  }
}

async function writeStateNow(input: Partial<SharedClubNightState>): Promise<SharedClubNightState> {
  const state = normalizeState({ ...input, updatedAt: new Date().toISOString() });
  await ensureStoreDir();
  const temporaryFile = `${STORE_FILE}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(temporaryFile, STORE_FILE);
  return state;
}

function serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function writeSharedClubNightState(input: Partial<SharedClubNightState>): Promise<SharedClubNightState> {
  return serializeWrite(() => writeStateNow(input));
}

export async function replaceSharedClubNightSnapshot(input: {
  clubNights: ClubNight[];
  currentClubNightId: string | null;
  completedMatches?: CompletedMatch[];
}): Promise<SharedClubNightState> {
  return writeSharedClubNightState({
    clubNights: input.clubNights,
    currentClubNightId: input.currentClubNightId,
    completedMatches: normalizeCompletedMatches(input.completedMatches ?? []),
  });
}

export async function upsertSharedClubNightMatches(clubNightId: string, matches: ClubMatch[]): Promise<SharedClubNightState> {
  return serializeWrite(async () => {
    const current = await readSharedClubNightState();
    const clubNight = current.clubNights.find((item) => item.id === clubNightId);
    if (!clubNight) return current;

    const byId = new Map(clubNight.matches.map((match) => [match.id, match]));
    matches.forEach((match) => {
      if (match?.id) byId.set(match.id, { ...match, clubNightId: match.clubNightId ?? clubNightId });
    });

    return writeStateNow({
      ...current,
      clubNights: current.clubNights.map((item) => item.id === clubNightId ? { ...item, matches: [...byId.values()] } : item),
    });
  });
}

export async function upsertSharedCompletedMatch(match: CompletedMatch): Promise<SharedClubNightState> {
  return serializeWrite(async () => {
    const current = await readSharedClubNightState();
    return writeStateNow({
      ...current,
      completedMatches: normalizeCompletedMatches([match, ...current.completedMatches]),
    });
  });
}
