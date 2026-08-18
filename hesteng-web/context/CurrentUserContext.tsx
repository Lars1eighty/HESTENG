"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";

import { DEMO_CLUB_ID } from "@/data/clubs";
import { getPlayerRegistry } from "@/lib/playerRegistry";
import type { PlayerProfile } from "@/lib/playerIdentity";

export type CurrentUser = {
  id: string;
  name: string;
  email?: string;
  currentPlayerId: string;
  memberships: {
    clubId: string;
    playerId: string;
    role: "member" | "admin";
  }[];
};

type CurrentUserContextType = {
  currentUser: CurrentUser;
  currentPlayer: PlayerProfile;
  currentPlayerId: string;
};

const DEMO_CURRENT_PLAYER_NAME = "Lars Hesteng Jensen";
const FALLBACK_DEMO_PLAYER: PlayerProfile = {
  id: "demo-player-lars-hesteng",
  name: DEMO_CURRENT_PLAYER_NAME,
  type: "player",
};
const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

function getDemoCurrentPlayer() {
  const registry = getPlayerRegistry(DEMO_CLUB_ID);
  return registry.find((player) => player.name === DEMO_CURRENT_PLAYER_NAME) ?? registry[0] ?? FALLBACK_DEMO_PLAYER;
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const currentPlayer = getDemoCurrentPlayer();
  const currentUser = useMemo<CurrentUser>(() => ({
    id: "demo-user-lars-hesteng",
    name: currentPlayer.name,
    currentPlayerId: currentPlayer.id,
    memberships: [
      {
        clubId: DEMO_CLUB_ID,
        playerId: currentPlayer.id,
        role: "admin",
      },
    ],
  }), [currentPlayer.id, currentPlayer.name]);

  const value = useMemo(() => ({
    currentUser,
    currentPlayer,
    currentPlayerId: currentPlayer.id,
  }), [currentPlayer, currentUser]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  }

  return context;
}
