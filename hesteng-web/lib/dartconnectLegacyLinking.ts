import { dartConnectLegacyMatches, type DartConnectLegacyMatch } from "@/data/dartconnectLegacyMatches";
import type { DartConnectTimingRecord } from "@/lib/dartconnectTiming";
import { getCurrentClubId } from "@/lib/currentClub";
import { resolveDartConnectPlayerAlias } from "@/lib/playerAliasStore";

export type DartConnectLegacyLinkedTimingMatch = {
  timing: DartConnectTimingRecord;
  legacyMatch: DartConnectLegacyMatch;
  player1: { playerId: string; canonicalName: string };
  player2: { playerId: string; canonicalName: string };
  sourceNames: [string, string];
};

export type DartConnectLegacyLinkSummary = {
  linkedMatches: DartConnectLegacyLinkedTimingMatch[];
  unmatchedMatchIds: string[];
  unresolvedNames: string[];
};

function validTimingRecord(record: DartConnectTimingRecord): boolean {
  return record.matchId.length > 0 && record.durationSeconds > 0 && record.legsPlayed > 0 && record.avgSecondsPerLeg > 0;
}

const legacyMatchesById = new Map(dartConnectLegacyMatches.map((match) => [match.matchId, match]));

export function getDartConnectLegacyMatch(matchId: string): DartConnectLegacyMatch | null {
  return legacyMatchesById.get(matchId) ?? null;
}

export function linkTimingRecordsToDartConnectLegacyMatches(
  records: DartConnectTimingRecord[],
  clubId = getCurrentClubId()
): DartConnectLegacyLinkSummary {
  const unmatchedMatchIds = new Set<string>();
  const unresolvedNames = new Set<string>();
  const linkedMatches: DartConnectLegacyLinkedTimingMatch[] = [];

  records.filter(validTimingRecord).forEach((timing) => {
    const legacyMatch = getDartConnectLegacyMatch(timing.matchId);
    if (!legacyMatch) {
      unmatchedMatchIds.add(timing.matchId);
      return;
    }

    const winner = resolveDartConnectPlayerAlias(legacyMatch.winner, clubId);
    const loser = resolveDartConnectPlayerAlias(legacyMatch.loser, clubId);

    if (!winner) unresolvedNames.add(legacyMatch.winner);
    if (!loser) unresolvedNames.add(legacyMatch.loser);
    if (!winner || !loser) return;

    linkedMatches.push({
      timing,
      legacyMatch,
      player1: {
        playerId: winner.playerId,
        canonicalName: winner.canonicalName,
      },
      player2: {
        playerId: loser.playerId,
        canonicalName: loser.canonicalName,
      },
      sourceNames: [legacyMatch.winner, legacyMatch.loser],
    });
  });

  return {
    linkedMatches,
    unmatchedMatchIds: [...unmatchedMatchIds].sort(),
    unresolvedNames: [...unresolvedNames].sort((a, b) => a.localeCompare(b)),
  };
}
