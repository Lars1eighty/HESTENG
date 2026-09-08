import { playerEloSeed } from "@/data/playerEloSeed";
import { DEMO_CLUB_ID } from "@/data/clubs";
import { getCurrentClubId } from "@/lib/currentClub";
import { normalizeName, type PlayerProfile } from "@/lib/playerIdentity";

const PLAYER_BOARD_NEEDS_STORAGE_KEY = "hesteng.playerBoardNeeds.v1";
const CUSTOM_PLAYERS_STORAGE_KEY = "hesteng.customPlayers.v1";
const CUSTOM_PLAYERS_CHANGE_EVENT = "hesteng.customPlayersChanged";
const SHARED_CLUB_DATA_API = "/api/shared-club-data";

export type PlayerBoardNeedsState = Record<string, Record<string, { requiresAccessibleBoard?: boolean }>>;
export type CustomPlayersState = Record<string, PlayerProfile[]>;

function createStablePlayerId(source: "seed" | "custom", name: string) {
  return `${source}:${normalizeName(name).replace(/\s+/g, "-")}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function getPlayerBoardNeedsState(): PlayerBoardNeedsState {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(PLAYER_BOARD_NEEDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function savePlayerBoardNeedsState(state: PlayerBoardNeedsState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PLAYER_BOARD_NEEDS_STORAGE_KEY, JSON.stringify(state));
}

function getCustomPlayersState(): CustomPlayersState {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(CUSTOM_PLAYERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveCustomPlayersState(state: CustomPlayersState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CUSTOM_PLAYERS_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CUSTOM_PLAYERS_CHANGE_EVENT));
}

function syncPlayerBoardNeedsToSharedStore(state: PlayerBoardNeedsState) {
  if (typeof window === "undefined") return;
  void fetch(SHARED_CLUB_DATA_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerBoardNeeds: state }),
  }).catch(() => undefined);
}

function syncCustomPlayersToSharedStore(state: CustomPlayersState) {
  if (typeof window === "undefined") return;
  void fetch(SHARED_CLUB_DATA_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customPlayers: state }),
  }).catch(() => undefined);
}

export function subscribeCustomPlayers(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(CUSTOM_PLAYERS_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener(CUSTOM_PLAYERS_CHANGE_EVENT, callback);
  };
}

export function getCustomPlayersStorageValue() {
  if (!canUseStorage()) return "{}";
  return window.localStorage.getItem(CUSTOM_PLAYERS_STORAGE_KEY) ?? "{}";
}

export function getCustomPlayersStateForSync(): CustomPlayersState {
  return getCustomPlayersState();
}

export function replaceCustomPlayersFromSharedState(state: CustomPlayersState) {
  saveCustomPlayersState(state);
}

export function getPlayerBoardNeedsStateForSync(): PlayerBoardNeedsState {
  return getPlayerBoardNeedsState();
}

export function replacePlayerBoardNeedsFromSharedState(state: PlayerBoardNeedsState) {
  savePlayerBoardNeedsState(state);
}

export function getPlayerRegistry(clubId = getCurrentClubId()): PlayerProfile[] {
  const boardNeeds = getPlayerBoardNeedsState()[clubId] ?? {};
  const customPlayers = getCustomPlayersState()[clubId] ?? [];
  const seededPlayers = playerEloSeed
    .filter((seed) => (seed.clubId ?? DEMO_CLUB_ID) === clubId)
    .map((seed) => {
      const id = seed.playerId ?? createStablePlayerId("seed", seed.name);

      return {
        id,
        name: seed.name,
        type: "player" as const,
        requiresAccessibleBoard: boardNeeds[id]?.requiresAccessibleBoard ?? false,
      };
    });

  return [...seededPlayers, ...customPlayers.map((player) => ({
    ...player,
    requiresAccessibleBoard: boardNeeds[player.id]?.requiresAccessibleBoard ?? player.requiresAccessibleBoard ?? false,
  }))]
    .filter((player, index, players) => (
      players.findIndex((item) => item.id === player.id || normalizeName(item.name) === normalizeName(player.name)) === index
    ))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function addPlayerToRegistry(clubId: string, name: string): PlayerProfile | null {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const existing = getPlayerRegistry(clubId).find((player) => normalizeName(player.name) === normalizeName(trimmedName));
  if (existing) return existing;

  const state = getCustomPlayersState();
  const nextPlayer: PlayerProfile = {
    id: createStablePlayerId("custom", trimmedName),
    name: trimmedName,
    type: "player",
    requiresAccessibleBoard: false,
  };
  const nextState = {
    ...state,
    [clubId]: [...(state[clubId] ?? []), nextPlayer],
  };

  saveCustomPlayersState(nextState);
  syncCustomPlayersToSharedStore(nextState);

  return nextPlayer;
}

export function getSelectablePlayerNames(clubId = getCurrentClubId()): string[] {
  return getPlayerRegistry(clubId).map((player) => player.name);
}

export function setPlayerAccessibleBoardNeed(clubId: string, playerId: string, requiresAccessibleBoard: boolean) {
  const state = getPlayerBoardNeedsState();
  const clubNeeds = state[clubId] ?? {};

  const nextClubNeeds = {
    ...clubNeeds,
    [playerId]: {
      ...clubNeeds[playerId],
      requiresAccessibleBoard,
    },
  };

  savePlayerBoardNeedsState({
    ...state,
    [clubId]: nextClubNeeds,
  });
  syncPlayerBoardNeedsToSharedStore({
    ...state,
    [clubId]: nextClubNeeds,
  });
}

export function getAccessibleBoardPlayers(clubId = getCurrentClubId()): PlayerProfile[] {
  return getPlayerRegistry(clubId).filter((player) => player.requiresAccessibleBoard);
}
