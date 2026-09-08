"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clubs as demoClubs, DEMO_CLUB_ID, type Club } from "@/data/clubs";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";

type ClubContextType = {
  clubs: Club[];
  currentClubId: string;
  currentClub: Club;
  setCurrentClubId: (clubId: string) => void;
};

const STORAGE_KEY = "hesteng.currentClubId";
const ClubContext = createContext<ClubContextType | undefined>(undefined);

function slugifyClubName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "klub";
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
  const [selectedClubId, setSelectedClubId] = useState(DEMO_CLUB_ID);

  useEffect(() => {
    const storedClubId = window.localStorage.getItem(STORAGE_KEY);
    const storedClubExists = availableClubs.some((club) => club.id === storedClubId);

    if (storedClubExists && storedClubId) {
      setSelectedClubId(storedClubId);
      return;
    }

    setSelectedClubId(availableClubs[0]?.id ?? DEMO_CLUB_ID);
  }, [availableClubs]);

  const currentClub = useMemo(
    () => availableClubs.find((club) => club.id === selectedClubId) ?? availableClubs[0] ?? demoClubs[0],
    [availableClubs, selectedClubId]
  );

  const setCurrentClubId = useCallback((clubId: string) => {
    setSelectedClubId(clubId);
    window.localStorage.setItem(STORAGE_KEY, clubId);
  }, []);

  const value = useMemo(() => ({
    clubs: availableClubs,
    currentClubId: currentClub.id,
    currentClub,
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
