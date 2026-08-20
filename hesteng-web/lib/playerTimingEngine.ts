import type { DartConnectTimingRecord } from "@/lib/dartconnectTiming";
import { getDartConnectTimingRecords } from "@/lib/dartconnectTimingStore";
import { getEloEvents, type EloRatingEvent } from "@/lib/eloRatingEngine";
import { getCompletedMatchesForClub, type CompletedMatch } from "@/lib/matchStore";
import { getCurrentClubId } from "@/lib/currentClub";
import { normalizeName, type PlayerProfile } from "@/lib/playerIdentity";
import { getPlayerRegistry } from "@/lib/playerRegistry";

export const MIN_TIMED_MATCHES_FOR_PLAYER_PROFILE = 5;

export type TimingProfile = {
  matchesTimed: number;
  avgMatchDurationSeconds: number;
  medianMatchDurationSeconds: number;
  avgSecondsPerLeg: number;
  medianSecondsPerLeg: number;
};

export type PlayerTimingProfile = TimingProfile & {
  playerId: string;
  canonicalName: string;
};

export type EloBucket = "<1000" | "1000-1099" | "1100-1199" | "1200-1299" | "1300-1399" | "1400+";

export type EloMatchupTimingProfile = TimingProfile & {
  eloA: EloBucket;
  eloB: EloBucket;
  avgLegsPlayed: number;
};

export type TimingDataQuality = {
  totalTimingRecords: number;
  linkedToCompletedMatch: number;
  unlinkedTimingRecords: number;
  linkedToPlayers: number;
  missingPlayerIdentity: number;
  linkedHistoricalElo: number;
  missingHistoricalElo: number;
  outliers: number;
  playerProfilesWithEnoughHistory: number;
  eloMatchupsWithEnoughHistory: number;
};

export type LinkedTimingMatch = {
  timing: DartConnectTimingRecord;
  match: CompletedMatch;
  player1: PlayerProfile;
  player2: PlayerProfile;
  eloEvent: EloRatingEvent | null;
  isOutlier: boolean;
};

export type EstimateMatchDurationInput = {
  player1Id: string;
  player2Id: string;
  bestOfLegs: number;
  playerProfiles: PlayerTimingProfile[];
  matchupProfile?: EloMatchupTimingProfile | null;
  globalProfile?: TimingProfile | null;
  minimumPlayerMatches?: number;
};

export type EstimateMatchDurationResult = {
  estimatedSeconds: number;
  source: "players" | "player+elo-matchup" | "elo-matchup" | "global" | "neutral";
};

const ELO_BUCKET_ORDER: EloBucket[] = ["<1000", "1000-1099", "1100-1199", "1200-1299", "1300-1399", "1400+"];
const NEUTRAL_SECONDS_PER_LEG = 300;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(2));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function averageLegs(records: DartConnectTimingRecord[]): number {
  return average(records.map((record) => record.legsPlayed));
}

function validTimingRecord(record: DartConnectTimingRecord): boolean {
  return record.durationSeconds > 0 && record.legsPlayed > 0 && record.avgSecondsPerLeg > 0;
}

function timingIsOutlier(record: DartConnectTimingRecord): boolean {
  return record.durationSeconds > 14_400 || record.avgSecondsPerLeg > 1_800;
}

function findPlayerByName(players: PlayerProfile[], name: string): PlayerProfile | null {
  const normalized = normalizeName(name);
  return players.find((player) => normalizeName(player.name) === normalized) ?? null;
}

function getEloBucket(elo: number): EloBucket {
  if (elo < 1000) return "<1000";
  if (elo < 1100) return "1000-1099";
  if (elo < 1200) return "1100-1199";
  if (elo < 1300) return "1200-1299";
  if (elo < 1400) return "1300-1399";
  return "1400+";
}

function normalizeBucketPair(left: EloBucket, right: EloBucket): [EloBucket, EloBucket] {
  return ELO_BUCKET_ORDER.indexOf(left) <= ELO_BUCKET_ORDER.indexOf(right) ? [left, right] : [right, left];
}

function findEloEventForMatch(events: EloRatingEvent[], match: CompletedMatch, clubId: string): EloRatingEvent | null {
  return events.find((event) => (
    event.matchId === match.id &&
    (event.clubId ?? clubId) === clubId
  )) ?? null;
}

export function calculateTimingProfile(records: DartConnectTimingRecord[]): TimingProfile {
  const validRecords = records.filter(validTimingRecord);

  return {
    matchesTimed: validRecords.length,
    avgMatchDurationSeconds: average(validRecords.map((record) => record.durationSeconds)),
    medianMatchDurationSeconds: median(validRecords.map((record) => record.durationSeconds)),
    avgSecondsPerLeg: average(validRecords.map((record) => record.avgSecondsPerLeg)),
    medianSecondsPerLeg: median(validRecords.map((record) => record.avgSecondsPerLeg)),
  };
}

export function linkTimingRecordsToMatches(
  records = getDartConnectTimingRecords(),
  matches = getCompletedMatchesForClub(getCurrentClubId()),
  clubId = getCurrentClubId()
): LinkedTimingMatch[] {
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const players = getPlayerRegistry(clubId);
  const eloEvents = getEloEvents().filter((event) => (event.clubId ?? clubId) === clubId);

  return records.flatMap((timing) => {
    const match = matchesById.get(timing.matchId);
    if (!match || !validTimingRecord(timing)) return [];

    const player1 = findPlayerByName(players, match.player1);
    const player2 = findPlayerByName(players, match.player2);
    if (!player1 || !player2) return [];

    return [{
      timing,
      match,
      player1,
      player2,
      eloEvent: findEloEventForMatch(eloEvents, match, clubId),
      isOutlier: timingIsOutlier(timing),
    }];
  });
}

export function calculatePlayerTimingProfiles(options: {
  clubId?: string;
  records?: DartConnectTimingRecord[];
  matches?: CompletedMatch[];
  includeOutliers?: boolean;
} = {}): PlayerTimingProfile[] {
  const clubId = options.clubId ?? getCurrentClubId();
  const linkedMatches = linkTimingRecordsToMatches(
    options.records ?? getDartConnectTimingRecords(),
    options.matches ?? getCompletedMatchesForClub(clubId),
    clubId
  ).filter((linked) => options.includeOutliers || !linked.isOutlier);
  const recordsByPlayer = new Map<string, { player: PlayerProfile; records: DartConnectTimingRecord[] }>();

  linkedMatches.forEach((linked) => {
    [linked.player1, linked.player2].forEach((player) => {
      const current = recordsByPlayer.get(player.id) ?? { player, records: [] };
      current.records.push(linked.timing);
      recordsByPlayer.set(player.id, current);
    });
  });

  return [...recordsByPlayer.values()]
    .map(({ player, records }) => ({
      playerId: player.id,
      canonicalName: player.name,
      ...calculateTimingProfile(records),
    }))
    .sort((a, b) => b.matchesTimed - a.matchesTimed || a.canonicalName.localeCompare(b.canonicalName));
}

export function calculateEloMatchupTimingProfiles(options: {
  clubId?: string;
  records?: DartConnectTimingRecord[];
  matches?: CompletedMatch[];
  includeOutliers?: boolean;
} = {}): EloMatchupTimingProfile[] {
  const clubId = options.clubId ?? getCurrentClubId();
  const linkedMatches = linkTimingRecordsToMatches(
    options.records ?? getDartConnectTimingRecords(),
    options.matches ?? getCompletedMatchesForClub(clubId),
    clubId
  ).filter((linked) => linked.eloEvent && (options.includeOutliers || !linked.isOutlier));
  const recordsByMatchup = new Map<string, { eloA: EloBucket; eloB: EloBucket; records: DartConnectTimingRecord[] }>();

  linkedMatches.forEach((linked) => {
    if (!linked.eloEvent) return;
    const [eloA, eloB] = normalizeBucketPair(
      getEloBucket(linked.eloEvent.player1Before),
      getEloBucket(linked.eloEvent.player2Before)
    );
    const key = `${eloA}|${eloB}`;
    const current = recordsByMatchup.get(key) ?? { eloA, eloB, records: [] };
    current.records.push(linked.timing);
    recordsByMatchup.set(key, current);
  });

  return [...recordsByMatchup.values()]
    .map(({ eloA, eloB, records }) => ({
      eloA,
      eloB,
      ...calculateTimingProfile(records),
      avgLegsPlayed: averageLegs(records),
    }))
    .sort((a, b) => (
      ELO_BUCKET_ORDER.indexOf(a.eloA) - ELO_BUCKET_ORDER.indexOf(b.eloA) ||
      ELO_BUCKET_ORDER.indexOf(a.eloB) - ELO_BUCKET_ORDER.indexOf(b.eloB)
    ));
}

export function calculateTimingDataQuality(options: {
  clubId?: string;
  records?: DartConnectTimingRecord[];
  matches?: CompletedMatch[];
} = {}): TimingDataQuality {
  const clubId = options.clubId ?? getCurrentClubId();
  const records = (options.records ?? getDartConnectTimingRecords()).filter(validTimingRecord);
  const matches = options.matches ?? getCompletedMatchesForClub(clubId);
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const players = getPlayerRegistry(clubId);
  const eloEvents = getEloEvents().filter((event) => (event.clubId ?? clubId) === clubId);
  let linkedToCompletedMatch = 0;
  let linkedToPlayers = 0;
  let linkedHistoricalElo = 0;

  records.forEach((record) => {
    const match = matchesById.get(record.matchId);
    if (!match) return;
    linkedToCompletedMatch += 1;

    const player1 = findPlayerByName(players, match.player1);
    const player2 = findPlayerByName(players, match.player2);
    if (player1 && player2) linkedToPlayers += 1;

    if (findEloEventForMatch(eloEvents, match, clubId)) linkedHistoricalElo += 1;
  });

  const playerProfiles = calculatePlayerTimingProfiles({ clubId, records, matches });
  const matchupProfiles = calculateEloMatchupTimingProfiles({ clubId, records, matches });

  return {
    totalTimingRecords: records.length,
    linkedToCompletedMatch,
    unlinkedTimingRecords: records.length - linkedToCompletedMatch,
    linkedToPlayers,
    missingPlayerIdentity: linkedToCompletedMatch - linkedToPlayers,
    linkedHistoricalElo,
    missingHistoricalElo: linkedToCompletedMatch - linkedHistoricalElo,
    outliers: records.filter(timingIsOutlier).length,
    playerProfilesWithEnoughHistory: playerProfiles.filter((profile) => profile.matchesTimed >= MIN_TIMED_MATCHES_FOR_PLAYER_PROFILE).length,
    eloMatchupsWithEnoughHistory: matchupProfiles.filter((profile) => profile.matchesTimed >= MIN_TIMED_MATCHES_FOR_PLAYER_PROFILE).length,
  };
}

export function estimateMatchDuration(input: EstimateMatchDurationInput): EstimateMatchDurationResult {
  const minimumMatches = input.minimumPlayerMatches ?? MIN_TIMED_MATCHES_FOR_PLAYER_PROFILE;
  const player1 = input.playerProfiles.find((profile) => profile.playerId === input.player1Id);
  const player2 = input.playerProfiles.find((profile) => profile.playerId === input.player2Id);
  const player1Ready = Boolean(player1 && player1.matchesTimed >= minimumMatches);
  const player2Ready = Boolean(player2 && player2.matchesTimed >= minimumMatches);
  const expectedLegs = Math.max(1, input.bestOfLegs);

  if (player1Ready && player2Ready && player1 && player2) {
    return {
      estimatedSeconds: Math.round(average([player1.medianSecondsPerLeg, player2.medianSecondsPerLeg]) * expectedLegs),
      source: "players",
    };
  }

  if ((player1Ready || player2Ready) && input.matchupProfile) {
    const playerProfile = player1Ready ? player1 : player2;
    return {
      estimatedSeconds: Math.round(average([playerProfile?.medianSecondsPerLeg ?? 0, input.matchupProfile.medianSecondsPerLeg]) * expectedLegs),
      source: "player+elo-matchup",
    };
  }

  if (input.matchupProfile) {
    return {
      estimatedSeconds: Math.round(input.matchupProfile.medianSecondsPerLeg * expectedLegs),
      source: "elo-matchup",
    };
  }

  if (input.globalProfile && input.globalProfile.matchesTimed > 0) {
    return {
      estimatedSeconds: Math.round(input.globalProfile.medianSecondsPerLeg * expectedLegs),
      source: "global",
    };
  }

  return {
    estimatedSeconds: NEUTRAL_SECONDS_PER_LEG * expectedLegs,
    source: "neutral",
  };
}
