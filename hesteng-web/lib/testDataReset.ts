import { DEMO_CLUB_ID } from "@/data/clubs";
import { resetEloRatingsToSeedForClub } from "@/lib/eloRatingEngine";
import { resetLiveActiveSnapshotsToBootstrap } from "@/lib/liveActiveEngine";
import { deleteCompletedMatchesForClub } from "@/lib/matchStore";

const KLUBAFTEN_STORAGE_KEY = "hesteng.klubaftenState";
const KLUBAFTEN_STORAGE_CHANGE_EVENT = "hesteng.klubaftenStateChanged";
const RESET_TESTDATA_API = "/api/admin/reset-testdata";

type StoredClubNight = {
  id?: string;
  clubId?: string;
};

type StoredKlubaftenSnapshot = {
  clubNights?: StoredClubNight[];
  currentClubNightId?: string | null;
};

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readStoredKlubaften(): StoredKlubaftenSnapshot {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(KLUBAFTEN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function resetStoredKlubaftenForClub(clubId: string) {
  if (!canUseStorage()) return 0;
  const snapshot = readStoredKlubaften();
  const clubNights = Array.isArray(snapshot.clubNights) ? snapshot.clubNights : [];
  const nextClubNights = clubNights.filter((clubNight) => (clubNight.clubId ?? DEMO_CLUB_ID) !== clubId);
  const currentClubNightId = nextClubNights.some((clubNight) => clubNight.id === snapshot.currentClubNightId)
    ? snapshot.currentClubNightId ?? null
    : nextClubNights[0]?.id ?? null;

  window.localStorage.setItem(KLUBAFTEN_STORAGE_KEY, JSON.stringify({
    clubNights: nextClubNights,
    currentClubNightId,
  }));
  window.dispatchEvent(new Event(KLUBAFTEN_STORAGE_CHANGE_EVENT));

  return clubNights.length - nextClubNights.length;
}

export type ResetTestDataResult = {
  removedLocalClubNights: number;
  remainingCompletedMatches: number;
  restoredEloRatings: number;
  restoredLiveActiveSnapshot: boolean;
  removedSharedClubNights: number;
  removedSharedCompletedMatches: number;
};

export async function resetTestDataToBaseline(clubId = DEMO_CLUB_ID): Promise<ResetTestDataResult> {
  const initialRemovedLocalClubNights = resetStoredKlubaftenForClub(clubId);
  deleteCompletedMatchesForClub(clubId);

  const response = await fetch(RESET_TESTDATA_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clubId }),
  });

  if (!response.ok) {
    throw new Error("Reset af shared testdata fejlede.");
  }

  const sharedResult = await response.json() as {
    removedClubNights?: number;
    removedCompletedMatches?: number;
  };
  const removedLocalClubNights = initialRemovedLocalClubNights + resetStoredKlubaftenForClub(clubId);
  const remainingCompletedMatches = deleteCompletedMatchesForClub(clubId).length;
  const restoredEloRatings = resetEloRatingsToSeedForClub(clubId).length;
  const restoredLiveActiveSnapshot = resetLiveActiveSnapshotsToBootstrap(clubId) !== null;

  return {
    removedLocalClubNights,
    remainingCompletedMatches,
    restoredEloRatings,
    restoredLiveActiveSnapshot,
    removedSharedClubNights: sharedResult.removedClubNights ?? 0,
    removedSharedCompletedMatches: sharedResult.removedCompletedMatches ?? 0,
  };
}
