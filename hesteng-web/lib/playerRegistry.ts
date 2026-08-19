import { playerEloSeed } from "@/data/playerEloSeed";
import { DEMO_CLUB_ID } from "@/data/clubs";
import { getCurrentClubId } from "@/lib/currentClub";
import { normalizeName, type PlayerProfile } from "@/lib/playerIdentity";

const PLAYER_BOARD_NEEDS_STORAGE_KEY = "hesteng.playerBoardNeeds.v1";

type PlayerBoardNeedsState = Record<string, Record<string, { requiresAccessibleBoard?: boolean }>>;

function createStablePlayerId(source: "seed", name: string) {
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

export function getPlayerRegistry(clubId = getCurrentClubId()): PlayerProfile[] {
  const boardNeeds = getPlayerBoardNeedsState()[clubId] ?? {};

  return playerEloSeed
    .filter((seed) => (seed.clubId ?? DEMO_CLUB_ID) === clubId)
    .map((seed) => {
      const id = seed.playerId ?? createStablePlayerId("seed", seed.name);

      return {
        id,
        name: seed.name,
        type: "player" as const,
        requiresAccessibleBoard: boardNeeds[id]?.requiresAccessibleBoard ?? false,
      };
    })
    .filter((player, index, players) => (
      players.findIndex((item) => item.id === player.id || normalizeName(item.name) === normalizeName(player.name)) === index
    ))
    .sort((a, b) => a.name.localeCompare(b.name));
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
}

export function getAccessibleBoardPlayers(clubId = getCurrentClubId()): PlayerProfile[] {
  return getPlayerRegistry(clubId).filter((player) => player.requiresAccessibleBoard);
}
