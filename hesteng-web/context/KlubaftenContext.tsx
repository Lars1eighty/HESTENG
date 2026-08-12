"use client";

import { createContext, useContext, useState, ReactNode } from "react";
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
};

const KlubaftenContext = createContext<KlubaftenContextType | undefined>(undefined);

export function KlubaftenProvider({ children }: { children: ReactNode }) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [matches, setMatches] = useState<ClubMatch[]>([]);

  return (
    <KlubaftenContext.Provider
      value={{
        selectedPlayers,
        setSelectedPlayers,
        pools,
        setPools,
        matches,
        setMatches,
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
