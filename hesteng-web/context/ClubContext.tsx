"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { clubs as demoClubs, DEMO_CLUB_ID, type Club } from "@/data/clubs";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";

type ClubContextType = {
  clubs: Club[];
  currentClubId: string;
  currentClub: Club;
  setCurrentClubId: (clubId: string) => void;
};

const STORAGE_KEY = "hesteng.currentClubId";
const STORAGE_CHANGE_EVENT = "hesteng.currentClubChanged";
const ClubContext = createContext<ClubContextType | undefined>(undefined);

function slugifyClubName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "klub";
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

function getStoredClubId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function ClubProvider({ children }: { children: ReactNode }) {
  const currentUserContext = useOptionalCurrentUser();
  const currentUser = currentUserContext?.currentUser;
  const authenticatedClubs = useMemo<Club[]>(() => (
    currentUser?.memberships.map((membership) => ({
      id: membership.clubId,
      name: membership.clubName ?? "Klub",
      slug: slugifyClubName(membership.clubName ?? membership.clubId),
      createdAt: "",
    })) ?? []
  ), [currentUser]);
  const availableClubs = authenticatedClubs.length > 0 ? authenticatedClubs : demoClubs;
  const storedClubId = useSyncExternalStore(subscribeToClub, getStoredClubId, () => "");
  const currentClub = useMemo(
    () => availableClubs.find((club) => club.id === storedClubId) ?? availableClubs[0] ?? demoClubs[0],
    [availableClubs, storedClubId]
  );

  const setCurrentClubId = useCallback((clubId: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, clubId);
    window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({
    clubs: availableClubs,
    currentClubId: currentClub?.id ?? DEMO_CLUB_ID,
    currentClub: currentClub ?? demoClubs[0],
    setCurrentClubId,
  }), [availableClubs, currentClub, setCurrentClubId]);

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const context = useContext(ClubContext);

  if (!context) {
    throw new Error("useClub must be used inside ClubProvider");
  }

  return context;
}
