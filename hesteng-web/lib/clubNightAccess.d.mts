import type { SharedClubNightState } from "./serverClubNightStateStore";

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
