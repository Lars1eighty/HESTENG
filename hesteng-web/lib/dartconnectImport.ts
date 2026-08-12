import { DartConnectMail, parseDartConnectMail } from "@/lib/dartconnectMail";
import type { ClubMatch } from "@/lib/matchEngine";

export type ImportCandidate = {
  mailId: string;
  matchId: string;
  receivedAt: string;
  subject: string;
  match: ClubMatch;
};

export type ImportDecision =
  | { status: "import"; candidate: ImportCandidate }
  | { status: "duplicate"; matchId: string }
  | { status: "not-tonight"; matchId?: string }
  | { status: "unmatched"; matchId: string };

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftParts = left.split(" ");
  const rightParts = right.split(" ");

  // Allow common DartConnect abbreviations such as "Lars J" vs "Lars Jensen".
  return (
    leftParts.length >= 2 &&
    rightParts.length >= 2 &&
    leftParts[0] === rightParts[0] &&
    (leftParts[1] === rightParts[1] ||
      leftParts[1][0] === rightParts[1][0])
  );
}

export function findTonightMatch(
  matches: ClubMatch[],
  player1: string,
  player2: string
): ClubMatch | null {
  return (
    matches.find(
      (match) =>
        match.status !== "finished" &&
        ((namesMatch(match.player1, player1) && namesMatch(match.player2, player2)) ||
          (namesMatch(match.player1, player2) && namesMatch(match.player2, player1)))
    ) ?? null
  );
}

export function decideImport(
  mail: DartConnectMail,
  tonightMatches: ClubMatch[],
  alreadyImportedMatchIds: Set<string>,
  dartConnectPlayers: { player1: string; player2: string }
): ImportDecision {
  const parsed = parseDartConnectMail(mail);
  if (!parsed) return { status: "not-tonight" };

  if (alreadyImportedMatchIds.has(parsed.matchId)) {
    return { status: "duplicate", matchId: parsed.matchId };
  }

  const match = findTonightMatch(
    tonightMatches,
    dartConnectPlayers.player1,
    dartConnectPlayers.player2
  );

  if (!match) {
    return { status: "unmatched", matchId: parsed.matchId };
  }

  return {
    status: "import",
    candidate: {
      mailId: parsed.mailId,
      matchId: parsed.matchId,
      receivedAt: parsed.receivedAt,
      subject: parsed.subject,
      match,
    },
  };
}
