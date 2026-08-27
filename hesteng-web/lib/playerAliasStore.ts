import { DEMO_CLUB_ID } from "@/data/clubs";
import { getCurrentClubId } from "@/lib/currentClub";
import { normalizeName, type PlayerId } from "@/lib/playerIdentity";
import { getPlayerRegistry } from "@/lib/playerRegistry";

const STORAGE_KEY = "hesteng.playerAliases.v1";
const SHARED_CLUB_DATA_API = "/api/shared-club-data";

export type PlayerAliasMapping = {
  clubId: string;
  alias: string;
  normalizedAlias: string;
  playerId: PlayerId;
  canonicalName: string;
  source: "dartconnect";
  createdAt: string;
};

type PlayerAliasState = Record<string, PlayerAliasMapping[]>;

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readAliasState(): PlayerAliasState {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeAliasState(state: PlayerAliasState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function syncPlayerAliasesToSharedStore(state: PlayerAliasState) {
  if (typeof window === "undefined") return;
  void fetch(SHARED_CLUB_DATA_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerAliases: state }),
  }).catch(() => undefined);
}

export function getPlayerAliasStateForSync(): PlayerAliasState {
  return readAliasState();
}

export function replacePlayerAliasesFromSharedState(state: PlayerAliasState) {
  writeAliasState(state);
}

export function getDartConnectPlayerAliases(clubId = getCurrentClubId()): PlayerAliasMapping[] {
  return readAliasState()[clubId] ?? [];
}

export function resolveDartConnectPlayerAlias(alias: string, clubId = getCurrentClubId()) {
  const normalizedAlias = normalizeName(alias);
  const exactPlayer = getPlayerRegistry(clubId).find((player) => normalizeName(player.name) === normalizedAlias);
  if (exactPlayer) {
    return {
      playerId: exactPlayer.id,
      canonicalName: exactPlayer.name,
      matchType: "exact-name" as const,
    };
  }

  const knownAlias = getDartConnectPlayerAliases(clubId).find((mapping) => mapping.normalizedAlias === normalizedAlias);
  if (!knownAlias) return null;

  return {
    playerId: knownAlias.playerId,
    canonicalName: knownAlias.canonicalName,
    matchType: "known-alias" as const,
  };
}

export function addDartConnectPlayerAlias(
  alias: string,
  playerId: PlayerId,
  clubId = getCurrentClubId(),
  createdAt = new Date().toISOString()
): PlayerAliasMapping | null {
  const player = getPlayerRegistry(clubId).find((item) => item.id === playerId);
  if (!player) return null;

  const mapping: PlayerAliasMapping = {
    clubId: clubId ?? DEMO_CLUB_ID,
    alias,
    normalizedAlias: normalizeName(alias),
    playerId,
    canonicalName: player.name,
    source: "dartconnect",
    createdAt,
  };

  const state = readAliasState();
  const clubAliases = state[clubId] ?? [];
  const nextAliases = [
    mapping,
    ...clubAliases.filter((item) => item.normalizedAlias !== mapping.normalizedAlias),
  ].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName) || a.alias.localeCompare(b.alias));

  writeAliasState({
    ...state,
    [clubId]: nextAliases,
  });
  syncPlayerAliasesToSharedStore({
    ...state,
    [clubId]: nextAliases,
  });

  return mapping;
}
