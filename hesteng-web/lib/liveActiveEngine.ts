import type { ClubNight } from "@/context/KlubaftenContext";
import { DEMO_CLUB_ID } from "@/data/clubs";
import { liveActiveSnapshotSeed } from "@/data/liveActiveSnapshotSeed";
import { getPlayerElo } from "@/lib/eloRatingEngine";
import { normalizeName, type PlayerProfile } from "@/lib/playerIdentity";
import { getPlayerRegistry } from "@/lib/playerRegistry";

export type LiveActiveSnapshotRow = {
  playerId?: string;
  playerName?: string;
  player: string;
  rank: number;
  elo: number;
  snapshotDate?: string;
};

export type LiveActiveSnapshot = {
  clubId: string;
  clubNightId: string;
  createdAt: string;
  rows: LiveActiveSnapshotRow[];
};

export type LiveActiveRow = LiveActiveSnapshotRow & {
  rankDelta: number | null;
  eloDelta: number | null;
};

const LIVE_ACTIVE_SNAPSHOT_KEY = "hesteng.liveActiveSnapshots";
const LIVE_ACTIVE_SNAPSHOT_EVENT = "hesteng.liveActiveSnapshotsChanged";
const LIVE_ACTIVE_CLUB_NIGHT_COUNT = 4;
const LIVE_ACTIVE_BOOTSTRAP_CLUB_NIGHT_ID = "live-active-bootstrap-2026-08-20";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readSnapshots(): LiveActiveSnapshot[] {
  try {
    const raw = getLiveActiveSnapshotStorageValue();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSnapshots(snapshots: LiveActiveSnapshot[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(LIVE_ACTIVE_SNAPSHOT_KEY, JSON.stringify(snapshots));
  window.dispatchEvent(new Event(LIVE_ACTIVE_SNAPSHOT_EVENT));
}

export function getLiveActiveSnapshotStorageValue() {
  if (!canUseStorage()) return "[]";
  return window.localStorage.getItem(LIVE_ACTIVE_SNAPSHOT_KEY) ?? "[]";
}

export function subscribeLiveActiveSnapshots(listener: () => void) {
  if (!canUseStorage()) return () => {};
  const handleStorage = (event: StorageEvent) => {
    if (event.key === LIVE_ACTIVE_SNAPSHOT_KEY) listener();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(LIVE_ACTIVE_SNAPSHOT_EVENT, listener);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LIVE_ACTIVE_SNAPSHOT_EVENT, listener);
  };
}

function clubNightTimestamp(clubNight: ClubNight) {
  return clubNight.finishedAt ?? clubNight.date ?? clubNight.createdAt ?? "";
}

function resolveBootstrapRows(clubId: string): LiveActiveSnapshotRow[] {
  const registry = getPlayerRegistry(clubId);
  const registryByName = new Map(registry.map((player) => [normalizeName(player.name), player]));
  const rows: LiveActiveSnapshotRow[] = [];

  liveActiveSnapshotSeed
    .filter((entry) => (entry.clubId ?? DEMO_CLUB_ID) === clubId)
    .forEach((entry) => {
      const player = registryByName.get(normalizeName(entry.playerName));
      if (!player) return;

      rows.push({
        playerId: player.id,
        playerName: player.name,
        player: player.name,
        rank: entry.rank,
        elo: entry.elo,
        snapshotDate: entry.snapshotDate,
      });
    });

  return rows;
}

function getBootstrapSnapshot(clubId: string): LiveActiveSnapshot | null {
  const rows = resolveBootstrapRows(clubId);
  if (rows.length === 0) return null;

  return {
    clubId,
    clubNightId: LIVE_ACTIVE_BOOTSTRAP_CLUB_NIGHT_ID,
    createdAt: "2026-08-20T00:00:00.000Z",
    rows,
  };
}

function resolvePlayerFromName(registry: PlayerProfile[], name: string) {
  return registry.find((player) => normalizeName(player.name) === normalizeName(name)) ?? null;
}

function getCurrentSelectedPlayers(clubNights: ClubNight[], clubId: string, currentClubNightId?: string) {
  if (!currentClubNightId) return [];
  const registry = getPlayerRegistry(clubId);
  const clubNight = clubNights.find((item) => item.id === currentClubNightId && (item.clubId ?? clubId) === clubId);
  if (!clubNight || clubNight.status !== "active") return [];

  return clubNight.selectedPlayers
    .map((name) => resolvePlayerFromName(registry, name))
    .filter((player): player is PlayerProfile => player !== null);
}

function getRecentActivitySources(clubNights: ClubNight[], clubId: string) {
  const registry = getPlayerRegistry(clubId);
  const actualSources = clubNights
    .filter((clubNight) => (clubNight.clubId ?? clubId) === clubId)
    .filter((clubNight) => clubNight.status === "finished")
    .map((clubNight) => ({
      timestamp: clubNightTimestamp(clubNight),
      players: getParticipantNames(clubNight)
        .map((name) => resolvePlayerFromName(registry, name))
        .filter((player): player is PlayerProfile => player !== null),
    }));
  const bootstrapRows = resolveBootstrapRows(clubId);
  const bootstrapSource = bootstrapRows.length
    ? [{
      timestamp: "2026-08-20T00:00:00.000Z",
      players: bootstrapRows.map((row) => ({
        id: row.playerId ?? row.player,
        name: row.playerName ?? row.player,
        type: "player" as const,
      })),
    }]
    : [];

  return [...actualSources, ...bootstrapSource]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, LIVE_ACTIVE_CLUB_NIGHT_COUNT);
}

function getParticipantNames(clubNight: ClubNight) {
  const names = new Map<string, string>();

  clubNight.selectedPlayers.forEach((player) => {
    names.set(normalizeName(player), player);
  });

  clubNight.matches.forEach((match) => {
    names.set(normalizeName(match.player1), match.player1);
    names.set(normalizeName(match.player2), match.player2);
  });

  return [...names.values()];
}

function calculateCurrentRows(clubNights: ClubNight[], clubId: string, currentClubNightId?: string): LiveActiveSnapshotRow[] {
  const activePlayers = new Map<string, PlayerProfile>();

  getRecentActivitySources(clubNights, clubId).forEach((source) => {
    source.players.forEach((player) => {
      activePlayers.set(player.id, player);
    });
  });

  getCurrentSelectedPlayers(clubNights, clubId, currentClubNightId).forEach((player) => {
    activePlayers.set(player.id, player);
  });

  return [...activePlayers.values()]
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      player: player.name,
      elo: getPlayerElo(player.name, clubId).elo,
    }))
    .sort((a, b) => b.elo - a.elo || a.player.localeCompare(b.player))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function getLiveActiveBootstrapUnmatchedNames(clubId: string): string[] {
  const registry = getPlayerRegistry(clubId);
  const registryNames = new Set(registry.map((player) => normalizeName(player.name)));

  return liveActiveSnapshotSeed
    .filter((entry) => (entry.clubId ?? DEMO_CLUB_ID) === clubId)
    .filter((entry) => !registryNames.has(normalizeName(entry.playerName)))
    .map((entry) => entry.playerName);
}

export function getLatestLiveActiveSnapshot(clubId: string): LiveActiveSnapshot | null {
  return [
    ...readSnapshots(),
    getBootstrapSnapshot(clubId),
  ]
    .filter((snapshot): snapshot is LiveActiveSnapshot => snapshot !== null && snapshot.clubId === clubId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export function getLatestLiveActiveSnapshotFromStorageValue(clubId: string, storageValue: string): LiveActiveSnapshot | null {
  try {
    const parsed = JSON.parse(storageValue);
    const snapshots = Array.isArray(parsed) ? parsed : [];
    return [
      ...snapshots,
      getBootstrapSnapshot(clubId),
    ]
      .filter((snapshot): snapshot is LiveActiveSnapshot => snapshot !== null && snapshot.clubId === clubId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  } catch {
    return getBootstrapSnapshot(clubId);
  }
}

export function calculateLiveActiveRows(
  clubNights: ClubNight[],
  clubId: string,
  latestSnapshot: LiveActiveSnapshot | null = getLatestLiveActiveSnapshot(clubId),
  currentClubNightId?: string
): LiveActiveRow[] {
  const currentRows = calculateCurrentRows(clubNights, clubId, currentClubNightId);
  const previousRows = new Map(
    (latestSnapshot?.rows ?? []).map((row) => [normalizeName(row.player), row])
  );

  return currentRows.map((row) => {
    const previous = previousRows.get(normalizeName(row.player));
    return {
      ...row,
      rankDelta: previous ? previous.rank - row.rank : null,
      eloDelta: previous ? row.elo - previous.elo : null,
    };
  });
}

export function saveLiveActiveSnapshotForClubNight(clubNights: ClubNight[], clubId: string, clubNightId: string) {
  const rows = calculateCurrentRows(clubNights, clubId);
  const snapshot: LiveActiveSnapshot = {
    clubId,
    clubNightId,
    createdAt: new Date().toISOString(),
    rows,
  };
  const next = [
    snapshot,
    ...readSnapshots().filter((item) => !(item.clubId === clubId && item.clubNightId === clubNightId)),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  writeSnapshots(next);
  return snapshot;
}
