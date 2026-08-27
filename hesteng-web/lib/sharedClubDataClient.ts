"use client";

import { getEloStateForSync, replaceEloStateFromSharedState } from "@/lib/eloRatingEngine";
import { getLiveActiveSnapshotsForSync, replaceLiveActiveSnapshotsFromSharedState } from "@/lib/liveActiveEngine";
import { getPlayerAliasStateForSync, replacePlayerAliasesFromSharedState } from "@/lib/playerAliasStore";
import { getPlayerBoardNeedsStateForSync, replacePlayerBoardNeedsFromSharedState } from "@/lib/playerRegistry";
import {
  hasSharedClubData,
  mergeSharedClubData,
  normalizeSharedClubDataState,
  type SharedClubDataState,
} from "@/lib/sharedClubData";

const SHARED_CLUB_DATA_API = "/api/shared-club-data";
const SHARED_CLUB_DATA_MIGRATION_KEY = "hesteng.sharedClubDataMigrated.v1";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function hasMigratedLocalSharedClubData() {
  if (!canUseStorage()) return true;
  return window.localStorage.getItem(SHARED_CLUB_DATA_MIGRATION_KEY) === "true";
}

function markLocalSharedClubDataMigrated() {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SHARED_CLUB_DATA_MIGRATION_KEY, "true");
}

function collectLocalSharedClubData(): SharedClubDataState {
  const eloState = getEloStateForSync();

  return normalizeSharedClubDataState({
    ...eloState,
    liveActiveSnapshots: getLiveActiveSnapshotsForSync(),
    playerBoardNeeds: getPlayerBoardNeedsStateForSync(),
    playerAliases: getPlayerAliasStateForSync(),
  });
}

function replaceLocalSharedClubData(state: SharedClubDataState) {
  replaceEloStateFromSharedState({
    eloRatings: state.eloRatings,
    eloEvents: state.eloEvents,
  });
  replaceLiveActiveSnapshotsFromSharedState(state.liveActiveSnapshots);
  replacePlayerBoardNeedsFromSharedState(state.playerBoardNeeds);
  replacePlayerAliasesFromSharedState(state.playerAliases);
}

async function postSharedClubData(state: SharedClubDataState, mode: "merge" | "replace" = "merge") {
  const response = await fetch(SHARED_CLUB_DATA_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...state, mode }),
  });

  if (!response.ok) return null;
  return normalizeSharedClubDataState(await response.json());
}

export async function syncSharedClubDataFromServer() {
  if (typeof window === "undefined") return null;

  const response = await fetch(SHARED_CLUB_DATA_API, { cache: "no-store" });
  if (!response.ok) return null;

  const serverState = normalizeSharedClubDataState(await response.json());
  const localState = collectLocalSharedClubData();

  if (!hasMigratedLocalSharedClubData() && hasSharedClubData(localState)) {
    const migratedState = mergeSharedClubData(serverState, localState);
    const savedState = await postSharedClubData(migratedState, "replace");
    if (savedState) {
      replaceLocalSharedClubData(savedState);
      markLocalSharedClubDataMigrated();
      return savedState;
    }
  }

  replaceLocalSharedClubData(serverState);
  return serverState;
}
