"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Pool = {
  name: string;
  players: string[];
};

type KlubaftenContextType = {
  selectedPlayers: string[];
  setSelectedPlayers: (players: string[]) => void;
  pools: Pool[];
  setPools: (pools: Pool[]) => void;
};

const KlubaftenContext = createContext<KlubaftenContextType | undefined>(undefined);

export function KlubaftenProvider({ children }: { children: ReactNode }) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);

  return (
    <KlubaftenContext.Provider
      value={{ selectedPlayers, setSelectedPlayers, pools, setPools }}
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
