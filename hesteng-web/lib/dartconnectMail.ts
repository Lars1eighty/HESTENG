export const THURSDAY_IMPORT_START_MINUTE = 19 * 60 + 8;
export const THURSDAY_IMPORT_END_MINUTE = 23 * 60 + 8;

export type DartConnectMail = {
  id: string;
  receivedAt: string;
  subject: string;
  body: string;
};

export type ParsedDartConnectMail = {
  mailId: string;
  receivedAt: string;
  subject: string;
  matchId: string;
  recapUrl: string;
};

export function isThursdayImportWindow(date: Date): boolean {
  if (date.getDay() !== 4) return false;

  const minutes = date.getHours() * 60 + date.getMinutes();
  return (
    minutes >= THURSDAY_IMPORT_START_MINUTE &&
    minutes <= THURSDAY_IMPORT_END_MINUTE
  );
}

export function extractMatchId(text: string): string | null {
  return extractRecapLinks(text)[0]?.matchId ?? null;
}

export function extractRecapLinks(text: string): { matchId: string; url: string }[] {
  const patterns = [
    /https?:\/\/[^\s"'<>]+recap\.dartconnect\.com[^\s"'<>]+/gi,
    /https?:\/\/[^\s"'<>]+recap\.dartconnect\.com%2Fmatches%2F[a-z0-9]+[^\s"'<>]*/gi,
    /recap\.dartconnect\.com\/matches\/([a-z0-9]+)/gi,
    /recap\.dartconnect\.com%2Fmatches%2F([a-z0-9]+)/gi,
  ];
  const links: { matchId: string; url: string }[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[0];
      const decoded = decodeURIComponent(raw.replace(/&amp;/g, "&"));
      const matchId = decoded.match(/recap\.dartconnect\.com\/matches\/([a-z0-9]+)/i)?.[1] ?? match[1];
      if (!matchId || seen.has(matchId)) continue;

      seen.add(matchId);
      links.push({
        matchId,
        url: `https://recap.dartconnect.com/matches/${matchId}`,
      });
    }
  }

  return links;
}

export function parseDartConnectMail(
  mail: DartConnectMail,
  now = new Date()
): ParsedDartConnectMail | null {
  const receivedAt = new Date(mail.receivedAt);

  // The mail itself must belong to the Thursday import window.
  // `now` is intentionally accepted for future clock/window validation hooks.
  void now;
  if (!isThursdayImportWindow(receivedAt)) return null;

  const recapLink = extractRecapLinks(`${mail.subject}\n${mail.body}`)[0];
  if (!recapLink) return null;

  return {
    mailId: mail.id,
    receivedAt: mail.receivedAt,
    subject: mail.subject,
    matchId: recapLink.matchId,
    recapUrl: recapLink.url,
  };
}
