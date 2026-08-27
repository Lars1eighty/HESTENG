"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, ReactNode } from "react";
import type { ClubMatch } from "@/lib/matchEngine";
import { DEMO_CLUB_ID } from "@/data/clubs";
import { useClub } from "@/context/ClubContext";
import { getCurrentClubId } from "@/lib/currentClub";
import { getCompletedMatches, replaceCompletedMatchesFromSharedState } from "@/lib/matchStore";
import { saveLiveActiveSnapshotForClubNight } from "@/lib/liveActiveEngine";
import { syncSharedClubDataFromServer } from "@/lib/sharedClubDataClient";
import type { SharedClubNightState } from "@/lib/serverClubNightStateStore";

export type Pool = {
  name: string;
  players: string[];
};

type KlubaftenContextType = {
  currentClubId: string;
  clubNights: ClubNight[];
  activeClubNights: ClubNight[];
  archivedClubNights: ClubNight[];
  isSharedStateReady: boolean;
  currentClubNightId: string | null;
  currentClubNight: ClubNight | null;
  setCurrentClubNightId: (clubNightId: string | null) => void;
  createClubNight: (input: { name: string; date: string; boardCount?: number; handicapBoards?: number[] }) => ClubNight;
  updateClubNight: (clubNightId: string, update: (clubNight: ClubNight) => ClubNight) => void;
  deleteClubNight: (clubNightId: string) => void;
  selectedPlayers: string[];
  setSelectedPlayers: (players: string[]) => void;
  pools: Pool[];
  setPools: (pools: Pool[]) => void;
  matches: ClubMatch[];
  setMatches: (matches: ClubMatch[]) => void;
  boardCount: number;
  setBoardCount: (count: number) => void;
  handicapBoards: number[];
  setHandicapBoards: (boards: number[]) => void;
  isFinished: boolean;
  finishKlubaften: () => void;
  finishClubNight: (clubNightId?: string) => void;
  abortClubNight: (clubNightId?: string) => void;
};

const KlubaftenContext = createContext<KlubaftenContextType | undefined>(undefined);
const STORAGE_KEY = "hesteng.klubaftenState";
const STORAGE_CHANGE_EVENT = "hesteng.klubaftenStateChanged";
const SHARED_STATE_MIGRATION_KEY = "hesteng.sharedClubNightMigrated.v2";
const SHARED_STATE_API = "/api/club-night-state";
const SHARED_STATE_POLL_INTERVAL_MS = 5000;

export type ClubNightStatus = "active" | "finished" | "aborted";

export type ClubNight = {
  id: string;
  clubId?: string;
  name: string;
  date: string;
  status: ClubNightStatus;
  selectedPlayers: string[];
  pools: Pool[];
  matches: ClubMatch[];
  boardCount: number;
  handicapBoards: number[];
  createdAt: string;
  finishedAt?: string;
};

type LegacyKlubaftenSnapshot = {
  selectedPlayers?: string[];
  pools?: Pool[];
  matches?: ClubMatch[];
  boardCount?: number;
  handicapBoards?: number[];
  isFinished?: boolean;
};

export type KlubaftenSnapshot = {
  clubNights: ClubNight[];
  currentClubNightId: string | null;
};

const EMPTY_CLUB_NIGHT: Omit<ClubNight, "id" | "name" | "date" | "status" | "createdAt" | "finishedAt"> = {
  selectedPlayers: [],
  pools: [],
  matches: [],
  boardCount: 13,
  handicapBoards: [],
};

const DEFAULT_KLUBAFTEN: KlubaftenSnapshot = {
  clubNights: [],
  currentClubNightId: null,
};
let cachedRawSnapshot: string | null = null;
let cachedSnapshot: KlubaftenSnapshot = DEFAULT_KLUBAFTEN;
let pendingSharedPushRaw: string | null = null;

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `club-night-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeClubNight(clubNight: Partial<ClubNight>, fallbackId = createId(), fallbackClubId = getCurrentClubId()): ClubNight {
  const id = clubNight.id ?? fallbackId;
  const clubId = clubNight.clubId ?? fallbackClubId;
  return {
    id,
    clubId,
    name: clubNight.name ?? "Klubaften",
    date: clubNight.date ?? todayIsoDate(),
    status: clubNight.status ?? "active",
    selectedPlayers: clubNight.selectedPlayers ?? EMPTY_CLUB_NIGHT.selectedPlayers,
    pools: clubNight.pools ?? EMPTY_CLUB_NIGHT.pools,
    matches: (clubNight.matches ?? EMPTY_CLUB_NIGHT.matches).map((match) => ({
      ...match,
      clubId: match.clubId ?? clubId,
      clubNightId: match.clubNightId ?? id,
    })),
    boardCount: clubNight.boardCount ?? EMPTY_CLUB_NIGHT.boardCount,
    handicapBoards: clubNight.handicapBoards ?? EMPTY_CLUB_NIGHT.handicapBoards,
    createdAt: clubNight.createdAt ?? new Date().toISOString(),
    finishedAt: clubNight.finishedAt,
  };
}

function migrateLegacySnapshot(snapshot: LegacyKlubaftenSnapshot): KlubaftenSnapshot {
  const hasLegacyData =
    (snapshot.selectedPlayers?.length ?? 0) > 0 ||
    (snapshot.pools?.length ?? 0) > 0 ||
    (snapshot.matches?.length ?? 0) > 0;

  if (!hasLegacyData) return DEFAULT_KLUBAFTEN;

  const legacyId = "legacy-club-night";
  const clubNight = normalizeClubNight({
    id: legacyId,
    clubId: DEMO_CLUB_ID,
    name: "Migreret klubaften",
    date: todayIsoDate(),
    status: snapshot.isFinished ? "finished" : "active",
    selectedPlayers: snapshot.selectedPlayers,
    pools: snapshot.pools,
    matches: snapshot.matches,
    boardCount: snapshot.boardCount,
    handicapBoards: snapshot.handicapBoards,
    createdAt: new Date().toISOString(),
    finishedAt: snapshot.isFinished ? new Date().toISOString() : undefined,
  }, legacyId, DEMO_CLUB_ID);

  return {
    clubNights: [clubNight],
    currentClubNightId: clubNight.id,
  };
}

function normalizeSnapshot(snapshot: Partial<KlubaftenSnapshot> & LegacyKlubaftenSnapshot): KlubaftenSnapshot {
  if (!Array.isArray(snapshot.clubNights)) return migrateLegacySnapshot(snapshot);

  const clubNights = snapshot.clubNights.map((clubNight, index) => normalizeClubNight(clubNight, `club-night-${index + 1}`, clubNight.clubId ?? DEMO_CLUB_ID));
  const currentExists = clubNights.some((clubNight) => clubNight.id === snapshot.currentClubNightId);
  const firstActive = clubNights.find((clubNight) => clubNight.status === "active") ?? clubNights[0] ?? null;

  return {
    clubNights,
    currentClubNightId: currentExists ? snapshot.currentClubNightId ?? null : firstActive?.id ?? null,
  };
}

function getStoredKlubaften(): KlubaftenSnapshot {
  if (typeof window === "undefined") return DEFAULT_KLUBAFTEN;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRawSnapshot) return cachedSnapshot;
    if (!raw) return DEFAULT_KLUBAFTEN;
    const parsed = JSON.parse(raw);
    cachedRawSnapshot = raw;
    cachedSnapshot = parsed && typeof parsed === "object" ? normalizeSnapshot(parsed) : DEFAULT_KLUBAFTEN;
    return cachedSnapshot;
  } catch {
    return DEFAULT_KLUBAFTEN;
  }
}

function sharedSnapshotHasClubNightData(snapshot: SharedClubNightState) {
  return snapshot.clubNights.length > 0 || snapshot.completedMatches.length > 0;
}

function hasMigratedLocalSnapshotToShared() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SHARED_STATE_MIGRATION_KEY) === "true";
}

function markLocalSnapshotMigratedToShared() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHARED_STATE_MIGRATION_KEY, "true");
}

function hasLocalClubNightsMissingFromShared(localSnapshot: KlubaftenSnapshot, sharedSnapshot: KlubaftenSnapshot) {
  const sharedIds = new Set(sharedSnapshot.clubNights.map((clubNight) => clubNight.id));
  return localSnapshot.clubNights.some((clubNight) => !sharedIds.has(clubNight.id));
}

function mergeLocalClubNightsIntoShared(localSnapshot: KlubaftenSnapshot, sharedSnapshot: KlubaftenSnapshot): KlubaftenSnapshot {
  const sharedIds = new Set(sharedSnapshot.clubNights.map((clubNight) => clubNight.id));
  const migratedLocalClubNights = localSnapshot.clubNights.filter((clubNight) => !sharedIds.has(clubNight.id));
  const currentClubNightId = sharedSnapshot.currentClubNightId ?? (
    localSnapshot.currentClubNightId && migratedLocalClubNights.some((clubNight) => clubNight.id === localSnapshot.currentClubNightId)
      ? localSnapshot.currentClubNightId
      : null
  );

  return normalizeSnapshot({
    clubNights: [...migratedLocalClubNights, ...sharedSnapshot.clubNights],
    currentClubNightId,
  });
}

async function pushSharedKlubaftenSnapshot(snapshot: KlubaftenSnapshot, rawSnapshot: string, completedMatches = getCompletedMatches()) {
  pendingSharedPushRaw = rawSnapshot;
  try {
    const response = await fetch(SHARED_STATE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clubNights: snapshot.clubNights,
        currentClubNightId: snapshot.currentClubNightId,
        completedMatches,
      }),
    });
    return response.ok;
  } catch {
    // LocalStorage remains a local cache/fallback if the shared dev store is unavailable.
    return false;
  } finally {
    if (pendingSharedPushRaw === rawSnapshot) pendingSharedPushRaw = null;
  }
}

function saveStoredKlubaften(snapshot: KlubaftenSnapshot, options: { syncShared?: boolean } = {}) {
  if (typeof window === "undefined") return;
  const normalized = normalizeSnapshot(snapshot);
  cachedRawSnapshot = JSON.stringify(normalized);
  cachedSnapshot = normalized;
  window.localStorage.setItem(STORAGE_KEY, cachedRawSnapshot);
  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
  if (options.syncShared !== false) {
    void pushSharedKlubaftenSnapshot(normalized, cachedRawSnapshot);
  }
}

function updateStoredKlubaften(update: (snapshot: KlubaftenSnapshot) => KlubaftenSnapshot) {
  const current = getStoredKlubaften();
  const next = normalizeSnapshot(update(current));

  if (JSON.stringify(current) === JSON.stringify(next)) return;

  saveStoredKlubaften(next);
}

function subscribeToKlubaften(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) callback();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_CHANGE_EVENT, callback);
  };
}

export function KlubaftenProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeToKlubaften, getStoredKlubaften, () => DEFAULT_KLUBAFTEN);
  const [isSharedStateReady, setIsSharedStateReady] = useState(false);
  const { currentClubId } = useClub();

  useEffect(() => {
    let cancelled = false;

    async function syncFromSharedState() {
      try {
        await syncSharedClubDataFromServer();
        const response = await fetch(SHARED_STATE_API, { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setIsSharedStateReady(true);
          return;
        }
        const sharedState = await response.json() as SharedClubNightState;
        if (cancelled) return;

        const localSnapshot = getStoredKlubaften();
        const localRaw = JSON.stringify(localSnapshot);
        const sharedSnapshot = normalizeSnapshot({
          clubNights: sharedState.clubNights,
          currentClubNightId: sharedState.currentClubNightId,
        });
        const sharedRaw = JSON.stringify(sharedSnapshot);

        if (
          !hasMigratedLocalSnapshotToShared() &&
          hasLocalClubNightsMissingFromShared(localSnapshot, sharedSnapshot)
        ) {
          const migratedSnapshot = mergeLocalClubNightsIntoShared(localSnapshot, sharedSnapshot);
          const migratedRaw = JSON.stringify(migratedSnapshot);
          const migratedCompletedMatches = [
            ...(sharedState.completedMatches ?? []),
            ...getCompletedMatches(),
          ];
          const migrated = await pushSharedKlubaftenSnapshot(migratedSnapshot, migratedRaw, migratedCompletedMatches);
          if (migrated) {
            markLocalSnapshotMigratedToShared();
            replaceCompletedMatchesFromSharedState(migratedCompletedMatches);
            saveStoredKlubaften(migratedSnapshot, { syncShared: false });
          }
          if (!cancelled) setIsSharedStateReady(true);
          return;
        }

        if (!sharedSnapshotHasClubNightData(sharedState) && localSnapshot.clubNights.length > 0) {
          if (!hasMigratedLocalSnapshotToShared()) {
            const migrated = await pushSharedKlubaftenSnapshot(localSnapshot, localRaw);
            if (migrated) markLocalSnapshotMigratedToShared();
            if (!cancelled) setIsSharedStateReady(true);
            return;
          }
          replaceCompletedMatchesFromSharedState([]);
          if (sharedRaw !== localRaw) {
            saveStoredKlubaften(sharedSnapshot, { syncShared: false });
          }
          if (!cancelled) setIsSharedStateReady(true);
          return;
        }

        replaceCompletedMatchesFromSharedState(sharedState.completedMatches ?? []);
        if (pendingSharedPushRaw && pendingSharedPushRaw !== sharedRaw) return;
        if (sharedRaw !== localRaw) {
          saveStoredKlubaften(sharedSnapshot, { syncShared: false });
        }
        if (!cancelled) setIsSharedStateReady(true);
      } catch {
        // Shared state is a server-side upgrade; localStorage keeps the current device usable offline.
        if (!cancelled) setIsSharedStateReady(true);
      }
    }

    void syncFromSharedState();
    const interval = window.setInterval(syncFromSharedState, SHARED_STATE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const scopedClubNights = useMemo(
    () => snapshot.clubNights.filter((clubNight) => (clubNight.clubId ?? DEMO_CLUB_ID) === currentClubId),
    [currentClubId, snapshot.clubNights]
  );
  const currentClubNight = useMemo(
    () => scopedClubNights.find((clubNight) => clubNight.id === snapshot.currentClubNightId) ?? null,
    [scopedClubNights, snapshot.currentClubNightId]
  );
  const activeClubNights = useMemo(
    () => scopedClubNights.filter((clubNight) => clubNight.status === "active"),
    [scopedClubNights]
  );
  const archivedClubNights = useMemo(
    () => scopedClubNights.filter((clubNight) => clubNight.status !== "active"),
    [scopedClubNights]
  );

  const setCurrentClubNightId = useCallback((clubNightId: string | null) => updateStoredKlubaften((current) => {
    if (current.currentClubNightId === clubNightId) return current;
    return {
      ...current,
      currentClubNightId: clubNightId,
    };
  }), []);

  const updateClubNight = useCallback((clubNightId: string, update: (clubNight: ClubNight) => ClubNight) => {
    updateStoredKlubaften((current) => ({
      ...current,
      clubNights: current.clubNights.map((clubNight) => clubNight.id === clubNightId ? normalizeClubNight(update(clubNight), clubNight.id) : clubNight),
      currentClubNightId: current.currentClubNightId ?? clubNightId,
    }));
  }, []);

  const deleteClubNight = useCallback((clubNightId: string) => {
    updateStoredKlubaften((current) => {
      const remainingClubNights = current.clubNights.filter((clubNight) => clubNight.id !== clubNightId);
      const currentWasDeleted = current.currentClubNightId === clubNightId;
      const nextCurrentClubNight = currentWasDeleted
        ? remainingClubNights.find((clubNight) => clubNight.status === "active") ?? remainingClubNights[0] ?? null
        : remainingClubNights.find((clubNight) => clubNight.id === current.currentClubNightId) ?? null;

      return {
        clubNights: remainingClubNights,
        currentClubNightId: nextCurrentClubNight?.id ?? null,
      };
    });
  }, []);

  const updateCurrentClubNight = useCallback((update: (clubNight: ClubNight) => ClubNight) => {
    const clubNightId = getStoredKlubaften().currentClubNightId;
    if (!clubNightId) return;
    updateClubNight(clubNightId, update);
  }, [updateClubNight]);

  const createClubNight = useCallback((input: { name: string; date: string; boardCount?: number; handicapBoards?: number[] }) => {
    const now = new Date().toISOString();
    const clubNight = normalizeClubNight({
      id: createId(),
      clubId: currentClubId,
      name: input.name.trim() || "Klubaften",
      date: input.date || todayIsoDate(),
      status: "active",
      boardCount: input.boardCount ?? EMPTY_CLUB_NIGHT.boardCount,
      handicapBoards: input.handicapBoards ?? EMPTY_CLUB_NIGHT.handicapBoards,
      createdAt: now,
    }, undefined, currentClubId);

    updateStoredKlubaften((current) => ({
      clubNights: [clubNight, ...current.clubNights],
      currentClubNightId: clubNight.id,
    }));

    return clubNight;
  }, [currentClubId]);

  const setSelectedPlayers = useCallback((players: string[]) => updateCurrentClubNight((current) => ({ ...current, selectedPlayers: players })), [updateCurrentClubNight]);
  const setPools = useCallback((pools: Pool[]) => updateCurrentClubNight((current) => ({ ...current, pools })), [updateCurrentClubNight]);
  const setMatches = useCallback((matches: ClubMatch[]) => updateCurrentClubNight((current) => ({ ...current, matches })), [updateCurrentClubNight]);
  const setBoardCount = useCallback((boardCount: number) => updateCurrentClubNight((current) => ({ ...current, boardCount })), [updateCurrentClubNight]);
  const setHandicapBoards = useCallback((handicapBoards: number[]) => updateCurrentClubNight((current) => ({ ...current, handicapBoards })), [updateCurrentClubNight]);
  const finishClubNight = useCallback((clubNightId = getStoredKlubaften().currentClubNightId ?? undefined) => {
    if (!clubNightId) return;
    const finishedAt = new Date().toISOString();
    updateStoredKlubaften((snapshot) => {
      const nextClubNights = snapshot.clubNights.map((clubNight) => clubNight.id === clubNightId
        ? normalizeClubNight({ ...clubNight, status: "finished", finishedAt }, clubNight.id, clubNight.clubId ?? currentClubId)
        : clubNight
      );
      saveLiveActiveSnapshotForClubNight(nextClubNights, currentClubId, clubNightId);

      return {
        ...snapshot,
        clubNights: nextClubNights,
      };
    });
  }, [currentClubId]);
  const abortClubNight = useCallback((clubNightId = getStoredKlubaften().currentClubNightId ?? undefined) => {
    if (!clubNightId) return;
    updateClubNight(clubNightId, (current) => ({ ...current, status: "aborted", finishedAt: new Date().toISOString() }));
  }, [updateClubNight]);
  const finishKlubaften = useCallback(() => finishClubNight(), [finishClubNight]);
  const contextValue = useMemo(() => ({
    currentClubId,
    clubNights: scopedClubNights,
    activeClubNights,
    archivedClubNights,
    isSharedStateReady,
    currentClubNightId: snapshot.currentClubNightId,
    currentClubNight,
    setCurrentClubNightId,
    createClubNight,
    updateClubNight,
    deleteClubNight,
    selectedPlayers: currentClubNight?.selectedPlayers ?? EMPTY_CLUB_NIGHT.selectedPlayers,
    setSelectedPlayers,
    pools: currentClubNight?.pools ?? EMPTY_CLUB_NIGHT.pools,
    setPools,
    matches: currentClubNight?.matches.filter((match) => (match.clubId ?? currentClubId) === currentClubId) ?? EMPTY_CLUB_NIGHT.matches,
    setMatches,
    boardCount: currentClubNight?.boardCount ?? EMPTY_CLUB_NIGHT.boardCount,
    setBoardCount,
    handicapBoards: currentClubNight?.handicapBoards ?? EMPTY_CLUB_NIGHT.handicapBoards,
    setHandicapBoards,
    isFinished: currentClubNight?.status === "finished",
    finishKlubaften,
    finishClubNight,
    abortClubNight,
  }), [
    abortClubNight,
    activeClubNights,
    archivedClubNights,
    createClubNight,
    currentClubNight,
    currentClubId,
    deleteClubNight,
    finishClubNight,
    finishKlubaften,
    isSharedStateReady,
    setBoardCount,
    setCurrentClubNightId,
    setHandicapBoards,
    setMatches,
    setPools,
    setSelectedPlayers,
    scopedClubNights,
    snapshot.currentClubNightId,
    updateClubNight,
  ]);

  return (
    <KlubaftenContext.Provider value={contextValue}>
      {children}
    </KlubaftenContext.Provider>
  );
}

export function useKlubaften() {
  const context = useContext(KlubaftenContext);

  if (!context) {
    throw new Error("useKlubaften must be used inside KlubaftenProvider");
  }

  return context;
}
