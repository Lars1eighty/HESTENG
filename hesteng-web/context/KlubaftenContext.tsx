"use client";

import { createContext, useContext, useSyncExternalStore, ReactNode } from "react";
import type { ClubMatch } from "@/lib/matchEngine";

export type Pool = {
  name: string;
  players: string[];
};

type KlubaftenContextType = {
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
};

const KlubaftenContext = createContext<KlubaftenContextType | undefined>(undefined);
const STORAGE_KEY = "hesteng.klubaftenState";
const STORAGE_CHANGE_EVENT = "hesteng.klubaftenStateChanged";

type KlubaftenSnapshot = {
  selectedPlayers: string[];
  pools: Pool[];
  matches: ClubMatch[];
  boardCount: number;
  handicapBoards: number[];
  isFinished: boolean;
};

const DEFAULT_KLUBAFTEN: KlubaftenSnapshot = {
  selectedPlayers: [],
  pools: [],
  matches: [],
  boardCount: 13,
  handicapBoards: [],
  isFinished: false,
};
let cachedRawSnapshot: string | null = null;
let cachedSnapshot: KlubaftenSnapshot = DEFAULT_KLUBAFTEN;

function normalizeSnapshot(snapshot: Partial<KlubaftenSnapshot>): KlubaftenSnapshot {
  return {
    selectedPlayers: snapshot.selectedPlayers ?? DEFAULT_KLUBAFTEN.selectedPlayers,
    pools: snapshot.pools ?? DEFAULT_KLUBAFTEN.pools,
    matches: snapshot.matches ?? DEFAULT_KLUBAFTEN.matches,
    boardCount: snapshot.boardCount ?? DEFAULT_KLUBAFTEN.boardCount,
    handicapBoards: snapshot.handicapBoards ?? DEFAULT_KLUBAFTEN.handicapBoards,
    isFinished: snapshot.isFinished ?? DEFAULT_KLUBAFTEN.isFinished,
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

function saveStoredKlubaften(snapshot: KlubaftenSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
}

function updateStoredKlubaften(update: (snapshot: KlubaftenSnapshot) => KlubaftenSnapshot) {
  saveStoredKlubaften(update(getStoredKlubaften()));
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
  const setSelectedPlayers = (players: string[]) => updateStoredKlubaften((current) => ({ ...current, selectedPlayers: players }));
  const setPools = (pools: Pool[]) => updateStoredKlubaften((current) => ({ ...current, pools }));
  const setMatches = (matches: ClubMatch[]) => updateStoredKlubaften((current) => ({ ...current, matches }));
  const setBoardCount = (boardCount: number) => updateStoredKlubaften((current) => ({ ...current, boardCount }));
  const setHandicapBoards = (handicapBoards: number[]) => updateStoredKlubaften((current) => ({ ...current, handicapBoards }));
  const finishKlubaften = () => updateStoredKlubaften((current) => ({ ...current, isFinished: true }));

  return (
    <KlubaftenContext.Provider
      value={{
        selectedPlayers: snapshot.selectedPlayers,
        setSelectedPlayers,
        pools: snapshot.pools,
        setPools,
        matches: snapshot.matches,
        setMatches,
        boardCount: snapshot.boardCount,
        setBoardCount,
        handicapBoards: snapshot.handicapBoards,
        setHandicapBoards,
        isFinished: snapshot.isFinished,
        finishKlubaften,
      }}
    >
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
