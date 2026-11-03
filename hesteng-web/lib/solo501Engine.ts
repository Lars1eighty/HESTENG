export type Solo501Visit = {
  leg: number;
  before: number;
  score: number;
  after: number;
  darts: 1 | 2 | 3;
  doubleAttempts: number;
  bust: boolean;
  checkout: boolean;
};

export type Solo501VisitInput = {
  score: number;
  darts: 1 | 2 | 3;
  doubleAttempts: number;
  bust?: boolean;
};

export type Solo501LegCount = 1 | 3 | 5 | 10;

const IMPOSSIBLE_CHECKOUTS = new Set([169, 168, 166, 165, 163, 162, 159]);

export function canCheckout501(remaining: number) {
  return remaining >= 2 && remaining <= 170 && !IMPOSSIBLE_CHECKOUTS.has(remaining);
}

export function finished501Legs(visits: Solo501Visit[]) {
  return visits.filter((visit) => visit.checkout).length;
}

export function remaining501(visits: Solo501Visit[]) {
  const last = visits.at(-1);
  return !last || last.checkout ? 501 : last.after;
}

export function record501Visit(
  visits: Solo501Visit[],
  input: Solo501VisitInput,
  targetLegs: Solo501LegCount,
): Solo501Visit[] {
  const completed = finished501Legs(visits);
  if (completed >= targetLegs) throw new Error("Træningen er allerede afsluttet.");
  if (!Number.isInteger(input.score) || input.score < 0 || input.score > 180) {
    throw new Error("En indgang skal være mellem 0 og 180 point.");
  }
  if (![1, 2, 3].includes(input.darts)) throw new Error("Vælg 1, 2 eller 3 pile.");
  if (!Number.isInteger(input.doubleAttempts) || input.doubleAttempts < 0 || input.doubleAttempts > input.darts) {
    throw new Error("Doubleforsøg kan ikke overstige antal pile.");
  }

  const before = remaining501(visits);
  const bust = Boolean(input.bust);
  const score = bust ? 0 : input.score;
  const after = before - score;
  if (!bust && (after < 0 || after === 1)) {
    throw new Error("Bust: Restscoren kan ikke blive negativ eller 1.");
  }
  const checkout = !bust && after === 0;
  if (checkout && (!canCheckout501(before) || input.doubleAttempts < 1)) {
    throw new Error("En lukning kræver en mulig double og mindst ét doubleforsøg.");
  }

  return [...visits, {
    leg: completed + 1,
    before,
    score,
    after,
    darts: input.darts,
    doubleAttempts: input.doubleAttempts,
    bust,
    checkout,
  }];
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function average501(points: number, darts: number) {
  return darts ? round1(points * 3 / darts) : 0;
}

export function summarize501(visits: Solo501Visit[], targetLegs: Solo501LegCount) {
  const completed = finished501Legs(visits);
  if (completed !== targetLegs) throw new Error("Alle valgte legs skal være færdige.");

  const totalPoints = visits.reduce((sum, visit) => sum + visit.score, 0);
  const totalDarts = visits.reduce((sum, visit) => sum + visit.darts, 0);
  const doubleAttempts = visits.reduce((sum, visit) => sum + visit.doubleAttempts, 0);
  const checkouts = completed;
  const closingVisits = visits.filter((visit) => visit.checkout);
  const highestCheckout = Math.max(0, ...closingVisits.map((visit) => visit.before));
  const first9Visits = Array.from({ length: targetLegs }, (_, i) =>
    visits.filter((visit) => visit.leg === i + 1).slice(0, 3)
  ).flat();
  const first9Points = first9Visits.reduce((sum, visit) => sum + visit.score, 0);
  const first9Darts = first9Visits.reduce((sum, visit) => sum + visit.darts, 0);

  const legs = Array.from({ length: targetLegs }, (_, i) => {
    const legVisits = visits.filter((visit) => visit.leg === i + 1);
    const darts = legVisits.reduce((sum, visit) => sum + visit.darts, 0);
    const points = legVisits.reduce((sum, visit) => sum + visit.score, 0);
    const closing = legVisits.find((visit) => visit.checkout);
    return {
      leg: i + 1,
      darts,
      visits: legVisits.length,
      average: average501(points, darts),
      checkout: closing?.before ?? 0,
      doubleAttempts: legVisits.reduce((sum, visit) => sum + visit.doubleAttempts, 0),
    };
  });

  const threeDartAverage = average501(totalPoints, totalDarts);
  const metrics = {
    score: threeDartAverage,
    threeDartAverage,
    first9Average: average501(first9Points, first9Darts),
    visits: visits.length,
    darts: totalDarts,
    legs: targetLegs,
    checkouts,
    checkout: highestCheckout,
    highestCheckout,
    checkoutAttempts: doubleAttempts,
    checkoutPercent: doubleAttempts ? round1(checkouts * 100 / doubleAttempts) : 0,
    highestVisit: Math.max(0, ...visits.map((visit) => visit.score)),
    oneEighties: visits.filter((visit) => visit.score === 180).length,
    high100: visits.filter((visit) => visit.score >= 100).length,
    high140: visits.filter((visit) => visit.score >= 140).length,
    busts: visits.filter((visit) => visit.bust).length,
    bestLegDarts: Math.min(...legs.map((leg) => leg.darts)),
    averageDartsPerLeg: round1(totalDarts / targetLegs),
  };

  return {
    metrics,
    details: {
      mode: "501-solo",
      rulesVersion: 2,
      targetLegs,
      legs,
      visits,
    },
  };
}
