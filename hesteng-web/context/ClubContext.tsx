"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { clubs as demoClubs, DEMO_CLUB_ID, type Club } from "@/data/clubs";
import {
  useAdminGuestPreview,
  useOptionalCurrentUser,
} from "@/context/CurrentUserContext";

type ClubContextType = {
  clubs: Club[];
  currentClubId: string;
  currentClub: Club;
  setCurrentClubId: (clubId: string) => void;
};

const STORAGE_KEY = "hesteng.currentClubId";
const STORAGE_CHANGE_EVENT = "hesteng.currentClubChanged";
const ClubContext = createContext<ClubContextType | undefined>(undefined);
const GUEST_CLUB: Club = {
  id: "guest-no-club",
  name: "Ingen klub tilknyttet",
  slug: "ingen-klub",
  createdAt: "",
};

function getStoredClubId() {
  if (typeof window === "undefined") return DEMO_CLUB_ID;
  return window.localStorage.getItem(STORAGE_KEY) ?? DEMO_CLUB_ID;
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
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, clubId);
  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ClubProvider({ children }: { children: ReactNode }) {
  const currentUserContext = useOptionalCurrentUser();
  const isAdminGuestPreview = useAdminGuestPreview();
  const memberships = currentUserContext?.currentUser.memberships ?? [];
  const storedClubId = useSyncExternalStore(
    subscribeToClub,
    getStoredClubId,
    () => DEMO_CLUB_ID
  );

  const availableClubs = useMemo<Club[]>(() => {
    if (isAdminGuestPreview) return [];

    const byId = new Map<string, Club>();

    demoClubs.forEach((club) => byId.set(club.id, club));

    memberships.forEach((membership) => {
      byId.set(membership.clubId, {
        id: membership.clubId,
        name: membership.clubName ?? "HESTENG klub",
        slug: slugify(membership.clubName ?? membership.clubId),
        createdAt: "",
      });
    });

    return Array.from(byId.values());
  }, [isAdminGuestPreview, memberships]);

  const currentClub = useMemo(() => {
    if (isAdminGuestPreview) return GUEST_CLUB;

    return (
      availableClubs.find((club) => club.id === storedClubId) ??
      availableClubs[0] ??
      demoClubs[0]
    );
  }, [availableClubs, isAdminGuestPreview, storedClubId]);

  const setCurrentClubId = useCallback(
    (clubId: string) => {
      if (isAdminGuestPreview) return;
      if (!availableClubs.some((club) => club.id === clubId)) return;
      saveClubId(clubId);
    },
    [availableClubs, isAdminGuestPreview]
  );

  const value = useMemo(
    () => ({
      clubs: availableClubs,
      currentClubId: currentClub.id,
      currentClub,
      setCurrentClubId,
    }),
    [availableClubs, currentClub, setCurrentClubId]
  );

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const context = useContext(ClubContext);

  if (!context) {
    throw new Error("useClub must be used inside ClubProvider");
  }

  return context;
}
