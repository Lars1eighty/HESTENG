export type DartConnectTimingRecord = {
  matchId: string;
  durationSeconds: number;
  legsPlayed: number;
  avgSecondsPerLeg: number;
};

type DartConnectMatchInfo = {
  id?: string;
  match_length?: string;
  game_time?: string;
  total_games?: number;
};

export type DartConnectTimingSkipReason =
  | "missing-match-id"
  | "missing-match-length"
  | "invalid-match-length"
  | "missing-legs"
  | "invalid-legs"
  | "missing-recap-data";

export type DartConnectTimingParseResult =
  | { ok: true; record: DartConnectTimingRecord }
  | { ok: false; reason: DartConnectTimingSkipReason };

export function parseMatchLengthToSeconds(value: string): number | null {
  const parts = value.trim().split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractInertiaMatchInfo(html: string): DartConnectMatchInfo | null {
  const match = html.match(/data-page="([\s\S]*?)"/);
  if (!match?.[1]) return null;

  try {
    const page = JSON.parse(decodeHtmlEntities(match[1]));
    return page?.props?.matchInfo ?? null;
  } catch {
    return null;
  }
}

export function parseDartConnectRecapTimingResult(html: string): DartConnectTimingParseResult {
  const matchInfo = extractInertiaMatchInfo(html);
  if (!matchInfo) return { ok: false, reason: "missing-recap-data" };
  if (!matchInfo.id) return { ok: false, reason: "missing-match-id" };

  const matchLength = matchInfo.match_length ?? matchInfo.game_time;
  if (!matchLength) return { ok: false, reason: "missing-match-length" };

  const durationSeconds = parseMatchLengthToSeconds(matchLength);
  if (durationSeconds === null || durationSeconds <= 0) return { ok: false, reason: "invalid-match-length" };

  if (matchInfo.total_games === undefined || matchInfo.total_games === null) return { ok: false, reason: "missing-legs" };
  const legsPlayed = Number(matchInfo.total_games);
  if (!Number.isFinite(legsPlayed) || legsPlayed <= 0) return { ok: false, reason: "invalid-legs" };

  return {
    ok: true,
    record: {
      matchId: matchInfo.id,
      durationSeconds,
      legsPlayed,
      avgSecondsPerLeg: Number((durationSeconds / legsPlayed).toFixed(2)),
    },
  };
}

export function parseDartConnectRecapTiming(html: string): DartConnectTimingRecord | null {
  const result = parseDartConnectRecapTimingResult(html);
  return result.ok ? result.record : null;
}

export async function fetchDartConnectRecapTiming(matchIdOrUrl: string): Promise<DartConnectTimingRecord | null> {
  const matchId = matchIdOrUrl.match(/matches\/([a-z0-9]+)/i)?.[1] ?? matchIdOrUrl;
  const recapUrl = `https://recap.dartconnect.com/matches/${matchId}`;
  const response = await fetch(recapUrl);
  if (!response.ok) return null;
  return parseDartConnectRecapTiming(await response.text());
}
