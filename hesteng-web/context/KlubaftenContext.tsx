"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type KlubaftenContextType = {
  selectedPlayers: string[];
  setSelectedPlayers: (players: string[]) => void;
};

const KlubaftenContext = createContext<KlubaftenContextType | undefined>(undefined);

export function KlubaftenProvider({ children }: { children: ReactNode }) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  return (
    <KlubaftenContext.Provider value={{ selectedPlayers, setSelectedPlayers }}>
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