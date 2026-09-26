export type ScoringFormat = 301 | 501;

const SCORING_DARTS = [
  0,
  ...Array.from({ length: 20 }, (_, index) => index + 1),
  ...Array.from({ length: 20 }, (_, index) => (index + 1) * 2),
  ...Array.from({ length: 20 }, (_, index) => (index + 1) * 3),
  25,
  50,
];

const CHECKOUT_DARTS = [
  ...Array.from({ length: 20 }, (_, index) => (index + 1) * 2),
  50,
];

export function legsToWin(bestOfLegs: number) {
  return Math.floor(bestOfLegs / 2) + 1;
}

export function canCheckout(remaining: number, maxDarts = 3) {
  if (remaining < 2 || remaining > 170) return false;

  for (const checkoutDart of CHECKOUT_DARTS) {
    if (checkoutDart === remaining) return true;
    if (maxDarts < 2) continue;

    for (const firstDart of SCORING_DARTS) {
      if (firstDart + checkoutDart === remaining) return true;
      if (maxDarts < 3) continue;

      for (const secondDart of SCORING_DARTS) {
        if (firstDart + secondDart + checkoutDart === remaining) return true;
      }
    }
  }
  return false;
}

export function getCheckoutEntryOptions(remaining: number) {
  return [1, 2, 3].filter((darts) => canCheckout(remaining, darts));
}

export function getPossibleCheckoutAttempts(remaining: number, entryDarts: number) {
  const attempts = new Set<number>();

  function walk(remainingBeforeDart: number, dartsLeft: number, attemptsUsed: number) {
    if (dartsLeft === 1) {
      if (CHECKOUT_DARTS.includes(remainingBeforeDart)) attempts.add(attemptsUsed + 1);
      return;
    }
    if (CHECKOUT_DARTS.includes(remainingBeforeDart)) {
      walk(remainingBeforeDart, dartsLeft - 1, attemptsUsed + 1);
    }
    for (const score of SCORING_DARTS) {
      const nextRemaining = remainingBeforeDart - score;
      if (nextRemaining < 2) continue;
      walk(nextRemaining, dartsLeft - 1, attemptsUsed);
    }
  }

  walk(remaining, entryDarts, 0);
  return [...attempts].sort((a, b) => a - b);
}

export function inferCheckoutAttempts(remaining: number, entryDarts: number) {
  const possibleAttempts = getPossibleCheckoutAttempts(remaining, entryDarts);
  return possibleAttempts.length === 1 ? possibleAttempts[0] : null;
}

export function resolveVisit(remaining: number, score: number) {
  const after = remaining - score;
  const bust = score > remaining || after < 0 || after === 1;
  const checkout = !bust && after === 0 && canCheckout(remaining, 3);
  return {
    after: bust || (after === 0 && !checkout) ? remaining : after,
    bust: bust || (after === 0 && !checkout),
    checkout,
  };
}

export function checkoutFinishesMatch(currentLegs: number, bestOfLegs: number) {
  return currentLegs + 1 >= legsToWin(bestOfLegs);
}

export function checkoutHint(remaining: number) {
  const common: Record<number, string> = {
    170: "T20 T20 Bull", 167: "T20 T19 Bull", 164: "T20 T18 Bull", 161: "T20 T17 Bull",
    160: "T20 T20 D20", 158: "T20 T20 D19", 157: "T20 T19 D20", 156: "T20 T20 D18",
    154: "T20 T18 D20", 152: "T20 T20 D16", 150: "T20 T18 D18", 141: "T20 T19 D12",
    140: "T20 T20 D10", 121: "T20 T11 D14", 120: "T20 20 D20", 100: "T20 D20",
  };
  if (remaining > 170 || [169, 168, 166, 165, 163, 162, 159].includes(remaining)) return null;
  if (common[remaining]) return common[remaining];
  if (remaining <= 40 && remaining % 2 === 0) return `D${remaining / 2}`;
  if (remaining <= 60) {
    const double = Math.min(20, Math.floor(remaining / 2));
    const single = remaining - double * 2;
    if (single >= 0) return single === 0 ? `D${double}` : `${single} D${double}`;
  }
  if (remaining <= 99) {
    const triple = Math.min(20, Math.floor((remaining - 2) / 3));
    const rest = remaining - triple * 3;
    if (rest > 0 && rest <= 40 && rest % 2 === 0) return `T${triple} D${rest / 2}`;
  }
  return null;
}
