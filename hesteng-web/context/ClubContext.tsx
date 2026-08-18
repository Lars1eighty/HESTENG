"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { clubs, DEMO_CLUB_ID, type Club } from "@/data/clubs";

type ClubContextType = {
  clubs: Club[];
  currentClubId: string;
  currentClub: Club;
  setCurrentClubId: (clubId: string) => void;
};

const STORAGE_KEY = "hesteng.currentClubId";
const STORAGE_CHANGE_EVENT = "hesteng.currentClubChanged";
const ClubContext = createContext<ClubContextType | undefined>(undefined);

function isKnownClub(clubId: string | null) {
  return !!clubId && clubs.some((club) => club.id === clubId);
}

function getStoredClubId() {
  if (typeof window === "undefined") return DEMO_CLUB_ID;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isKnownClub(stored) ? stored! : DEMO_CLUB_ID;
}

function subscribeToClub(callback: () => void) {
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

function saveClubId(clubId: string) {
  if (typeof window === "undefined" || !isKnownClub(clubId)) return;
  window.localStorage.setItem(STORAGE_KEY, clubId);
  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
}

export function ClubProvider({ children }: { children: ReactNode }) {
  const currentClubId = useSyncExternalStore(subscribeToClub, getStoredClubId, () => DEMO_CLUB_ID);
  const currentClub = useMemo(
    () => clubs.find((club) => club.id === currentClubId) ?? clubs[0],
    [currentClubId]
  );
  const setCurrentClubId = useCallback((clubId: string) => saveClubId(clubId), []);
  const value = useMemo(() => ({
    clubs,
    currentClubId: currentClub.id,
    currentClub,
    setCurrentClubId,
  }), [currentClub, setCurrentClubId]);

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const context = useContext(ClubContext);

  if (!context) {
    throw new Error("useClub must be used inside ClubProvider");
  }

  return context;
}
