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
  const patterns = [
    /recap\.dartconnect\.com\/matches\/([a-z0-9]+)/i,
    /recap\.dartconnect\.com%2Fmatches%2F([a-z0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
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

  const matchId = extractMatchId(`${mail.subject}\n${mail.body}`);
  if (!matchId) return null;

  return {
    mailId: mail.id,
    receivedAt: mail.receivedAt,
    subject: mail.subject,
    matchId,
  };
}
