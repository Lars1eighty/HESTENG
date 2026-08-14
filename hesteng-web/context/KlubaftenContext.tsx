"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

type KlubaftenSnapshot = {
  selectedPlayers: string[];
  pools: Pool[];
  matches: ClubMatch[];
  boardCount: number;
  handicapBoards: number[];
  isFinished: boolean;
};

function getStoredKlubaften(): Partial<KlubaftenSnapshot> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStoredKlubaften(snapshot: KlubaftenSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function KlubaftenProvider({ children }: { children: ReactNode }) {
  const stored = getStoredKlubaften();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(stored.selectedPlayers ?? []);
  const [pools, setPools] = useState<Pool[]>(stored.pools ?? []);
  const [matches, setMatches] = useState<ClubMatch[]>(stored.matches ?? []);
  const [boardCount, setBoardCount] = useState(stored.boardCount ?? 13);
  const [handicapBoards, setHandicapBoards] = useState<number[]>(stored.handicapBoards ?? []);
  const [isFinished, setIsFinished] = useState(stored.isFinished ?? false);

  const finishKlubaften = () => setIsFinished(true);

  useEffect(() => {
    saveStoredKlubaften({ selectedPlayers, pools, matches, boardCount, handicapBoards, isFinished });
  }, [selectedPlayers, pools, matches, boardCount, handicapBoards, isFinished]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue) as Partial<KlubaftenSnapshot>;
        setSelectedPlayers(next.selectedPlayers ?? []);
        setPools(next.pools ?? []);
        setMatches(next.matches ?? []);
        setBoardCount(next.boardCount ?? 13);
        setHandicapBoards(next.handicapBoards ?? []);
        setIsFinished(next.isFinished ?? false);
      } catch {
        // Ignore malformed external storage writes.
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <KlubaftenContext.Provider
      value={{
        selectedPlayers,
        setSelectedPlayers,
        pools,
        setPools,
        matches,
        setMatches,
        boardCount,
        setBoardCount,
        handicapBoards,
        setHandicapBoards,
        isFinished,
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
