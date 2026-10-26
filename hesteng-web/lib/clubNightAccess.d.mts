import type { SharedClubNightState } from "./serverClubNightStateStore";
import type { ClubNight } from "@/context/KlubaftenContext";

export function scopeClubNightState(
  state: SharedClubNightState,
  permittedClubIds: ReadonlySet<string>,
): SharedClubNightState;

export function knownMatchBelongsToClub(
  state: SharedClubNightState,
  clubId: string,
  clubNightId: string,
  matchId: string,
): boolean;

export function validClubNightSnapshot(nights: unknown, clubId: string): boolean;

export function replaceScopedClubNights(
  currentNights: ClubNight[],
  submittedNights: ClubNight[],
  clubId: string,
  mergeNight: (night: ClubNight, oldNight?: ClubNight) => ClubNight,
): ClubNight[];
