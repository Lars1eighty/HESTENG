"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import type { ClubMembershipRole } from "@prisma/client";

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
    clubName?: string;
    playerId?: string;
    role: ClubMembershipRole;
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
const CAN_USE_DEMO_USER =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_HESTENG_DEMO_USER === "true";

const ADMIN_GUEST_PREVIEW_KEY = "hesteng.adminGuestPreview";
const ADMIN_GUEST_PREVIEW_EVENT = "hesteng.adminGuestPreviewChanged";

function getAdminGuestPreviewSnapshot() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(ADMIN_GUEST_PREVIEW_KEY) === "true";
}

function subscribeToAdminGuestPreview(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ADMIN_GUEST_PREVIEW_KEY) callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ADMIN_GUEST_PREVIEW_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ADMIN_GUEST_PREVIEW_EVENT, callback);
  };
}

export function useAdminGuestPreview() {
  return useSyncExternalStore(
    subscribeToAdminGuestPreview,
    getAdminGuestPreviewSnapshot,
    () => false
  );
}

export function setAdminGuestPreview(enabled: boolean) {
  if (typeof window === "undefined") return;

  if (enabled) {
    window.sessionStorage.setItem(ADMIN_GUEST_PREVIEW_KEY, "true");
  } else {
    window.sessionStorage.removeItem(ADMIN_GUEST_PREVIEW_KEY);
  }

  window.dispatchEvent(new Event(ADMIN_GUEST_PREVIEW_EVENT));
}

function getDemoCurrentPlayer() {
  const registry = getPlayerRegistry(DEMO_CLUB_ID);
  return registry.find((player) => player.name === DEMO_CURRENT_PLAYER_NAME) ?? registry[0] ?? FALLBACK_DEMO_PLAYER;
}

function withLegacyJydenAdmin(
  memberships: CurrentUser["memberships"],
  playerId: string
): CurrentUser["memberships"] {
  if (memberships.some((membership) => membership.clubId === DEMO_CLUB_ID)) {
    return memberships.map((membership) =>
      membership.clubId === DEMO_CLUB_ID
        ? {
            ...membership,
            clubName: membership.clubName ?? "Jyden Dartklub",
            playerId: membership.playerId ?? playerId,
            role: "ADMIN",
          }
        : membership
    );
  }

  return [
    ...memberships,
    {
      clubId: DEMO_CLUB_ID,
      clubName: "Jyden Dartklub",
      playerId,
      role: "ADMIN",
    },
  ];
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CurrentUserProviderInner>{children}</CurrentUserProviderInner>
    </SessionProvider>
  );
}

function CurrentUserProviderInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isAdminGuestPreview = useAdminGuestPreview();
  const sessionPlayer = getSessionPlayer(session);
  const demoPlayer = status === "unauthenticated" && CAN_USE_DEMO_USER ? getDemoCurrentPlayer() : undefined;
  const currentPlayer = sessionPlayer ?? demoPlayer;
  let currentUser: CurrentUser | undefined;

  if (session?.user?.id && sessionPlayer) {
    currentUser = {
      id: session.user.id,
      name: session.user.name ?? sessionPlayer.name,
      email: session.user.email ?? undefined,
      currentPlayerId: sessionPlayer.id,
      memberships: withLegacyJydenAdmin(
        session.user.memberships ?? [],
        sessionPlayer.id
      ),
    };
  } else if (demoPlayer) {
    currentUser = {
      id: "demo-user-lars-hesteng",
      name: demoPlayer.name,
      currentPlayerId: demoPlayer.id,
      memberships: [
        {
          clubId: DEMO_CLUB_ID,
          clubName: "Jyden Dartklub",
          playerId: demoPlayer.id,
          role: "ADMIN",
        },
      ],
    };
  }

  const value = useMemo(() => {
    if (!currentPlayer || !currentUser || isAdminGuestPreview) {
      return undefined;
    }

    return {
      currentUser,
      currentPlayer,
      currentPlayerId: currentPlayer.id,
    };
  }, [currentPlayer, currentUser, isAdminGuestPreview]);

  if (!value) {
    return <>{children}</>;
  }

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

function getSessionPlayer(session: Session | null): PlayerProfile | undefined {
  if (!session?.user?.playerProfileId) {
    return undefined;
  }

  return {
    id: session.user.playerProfileId,
    name: session.user.name ?? session.user.email ?? "HESTENG Player",
    type: "player",
  };
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  }

  return context;
}

export function useOptionalCurrentUser() {
  return useContext(CurrentUserContext);
}
