import { promises as fs } from "fs";
import path from "path";
import {
  EMPTY_SHARED_CLUB_DATA_STATE,
  mergeSharedClubData,
  normalizeSharedClubDataState,
  type SharedClubDataState,
} from "@/lib/sharedClubData";

const STORE_DIR = path.join(process.cwd(), ".hesteng-shared");
const STORE_FILE = path.join(STORE_DIR, "shared-club-data.json");

async function ensureStoreDir() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

export async function readSharedClubDataState(): Promise<SharedClubDataState> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return normalizeSharedClubDataState(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return EMPTY_SHARED_CLUB_DATA_STATE;
    throw error;
  }
}

async function writeSharedClubDataState(input: Partial<SharedClubDataState>): Promise<SharedClubDataState> {
  const state = normalizeSharedClubDataState({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  await ensureStoreDir();
  const temporaryFile = `${STORE_FILE}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(temporaryFile, STORE_FILE);

  return state;
}

export async function replaceSharedClubDataState(input: Partial<SharedClubDataState>): Promise<SharedClubDataState> {
  return writeSharedClubDataState(input);
}

export async function mergeSharedClubDataState(input: Partial<SharedClubDataState>): Promise<SharedClubDataState> {
  const current = await readSharedClubDataState();
  return writeSharedClubDataState(mergeSharedClubData(current, input));
}
