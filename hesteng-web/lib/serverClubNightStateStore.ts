import { promises as fs } from "fs";
import path from "path";
import type { ClubNight, KlubaftenSnapshot } from "@/context/KlubaftenContext";
import type { CompletedMatch } from "@/lib/matchStore";

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

async function ensureStoreDir() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

function normalizeCompletedMatches(matches: CompletedMatch[]) {
  const byId = new Map<string, CompletedMatch>();

  matches.forEach((match) => {
    if (!match?.id) return;
    const existing = byId.get(match.id);
    if (!existing || (match.finishedAt ?? "").localeCompare(existing.finishedAt ?? "") >= 0) {
      byId.set(match.id, match);
    }
  });

  return [...byId.values()].sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""));
}

function normalizeClubNights(clubNights: ClubNight[]) {
  const byId = new Map<string, ClubNight>();

  clubNights.forEach((clubNight) => {
    if (!clubNight?.id) return;
    byId.set(clubNight.id, clubNight);
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

export async function writeSharedClubNightState(input: Partial<SharedClubNightState>): Promise<SharedClubNightState> {
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

export async function replaceSharedClubNightSnapshot(input: {
  clubNights: ClubNight[];
  currentClubNightId: string | null;
  completedMatches?: CompletedMatch[];
}): Promise<SharedClubNightState> {
  const current = await readSharedClubNightState();

  return writeSharedClubNightState({
    clubNights: input.clubNights,
    currentClubNightId: input.currentClubNightId,
    completedMatches: normalizeCompletedMatches([
      ...current.completedMatches,
      ...(input.completedMatches ?? []),
    ]),
  });
}

export async function upsertSharedCompletedMatch(match: CompletedMatch): Promise<SharedClubNightState> {
  const current = await readSharedClubNightState();

  return writeSharedClubNightState({
    ...current,
    completedMatches: normalizeCompletedMatches([match, ...current.completedMatches]),
  });
}
