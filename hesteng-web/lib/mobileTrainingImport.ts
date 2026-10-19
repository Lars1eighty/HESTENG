/**
 * Converts completed HESTENG Training v7 mobile sessions into historical
 * per-exercise results. Does not invent darts or double attempts.
 * No writes to the user's mobile backup.
 */
export type MobileTrainingHistoricalEntry = {
  exerciseId: string;
  completedAt: string;
  variant?: string;
  metrics: Record<string, number>;
};
type JsonObject = Record<string, unknown>;
const object = (x: unknown): x is JsonObject =>
  !!x && typeof x === "object" && !Array.isArray(x);
const pct = (a: number, b: number) => Math.round(a * 10000 / b) / 100;
function getEvents(x: unknown, id: string): unknown[] {
  if (!object(x) || !Array.isArray(x.events) || x.events.length > 5000)
    throw new Error("Ugyldige registreringer i " + id);
  return x.events;
}
function binary(a: unknown[], id: string): number[] {
  if (!a.every(x => x === 0 || x === 1))
    throw new Error("Ugyldig træfregistrering i " + id);
  return a as number[];
}
export function convertMobileV7Backup(parsed: unknown): MobileTrainingHistoricalEntry[] {
  if (!object(parsed) || parsed.format !== "HESTENG-MOBILE-V7" ||
      !object(parsed.state) || !Array.isArray(parsed.state.history))
    throw new Error("Filen er ikke en HESTENG Træning v7-sikkerhedskopi.");
  const sessions = parsed.state.history;
  if (sessions.length > 60)
    throw new Error("Sikkerhedskopien indeholder over 60 træninger. Del den op før import.");
  const rows: MobileTrainingHistoricalEntry[] = [];
  for (const session of sessions) {
    if (!object(session) || typeof session.date !== "string" ||
        !Number.isFinite(Date.parse(session.date)) || !object(session.results))
      throw new Error("En træning mangler en gyldig dato eller resultater.");
    const completedAt = new Date(session.date).toISOString();
    if (Date.parse(completedAt) > Date.now() + 86_400_000)
      throw new Error("En træning er dateret i fremtiden.");
    const results = session.results;
    const add = (exerciseId: string, metrics: Record<string, number>) => {
      rows.push({ exerciseId, completedAt, variant: "Mobil v7", metrics });
    };
    if (results.doubles !== undefined) {
      const a = binary(getEvents(results.doubles, "Jorden rundt doubler"), "Jorden rundt doubler");
      if (a.length) {
        const hits = a.filter(Boolean).length, firstShots = Math.ceil(a.length / 3);
        const firstDartHits = a.filter((x, i) => i % 3 === 0 && x === 1).length;
        add("mobile-around-the-world-doubles", {
          dartsUsed: a.length, hits, visits: firstShots,
          hitPercent: pct(hits, a.length), firstDartHits,
          firstDartHitPercent: pct(firstDartHits, firstShots),
        });
      }
    }
    if (results.singles !== undefined) {
      const a = binary(getEvents(results.singles, "Store singler"), "Store singler");
      if (a.length) {
        const successes = a.filter(Boolean).length;
        add("mobile-big-singles", {
          visits: a.length, successes, successPercent: pct(successes, a.length),
        });
      }
    }
    if (results.scoring !== undefined) {
      const a = getEvents(results.scoring, "Scoring 20");
      if (!a.every(x => Number.isInteger(x) && Number(x) >= 0 && Number(x) <= 4))
        throw new Error("Ugyldige point i Scoring 20.");
      if (a.length) {
        const v = a as number[], points = v.reduce((sum, x) => sum + x, 0);
        add("mobile-scoring-20", {
          visits: v.length, points, dartsUsed: v.length * 3,
          pointsPerVisit: Math.round(points / v.length * 100) / 100,
          scoring100Plus: v.filter(x => x >= 2).length,
        });
      }
    }
    if (results.checkout !== undefined) {
      const a = binary(getEvents(results.checkout, "Lukninger 60–69"), "Lukninger 60–69");
      if (a.length) {
        const checkouts = a.filter(Boolean).length;
        add("mobile-checkout-60-69", {
          checkouts, checkoutAttempts: a.length, checkoutPercent: pct(checkouts, a.length),
        });
      }
    }
    if (results.combos !== undefined) {
      const a = binary(getEvents(results.combos, "Double-kombinationer"), "Double-kombinationer");
      if (a.length) {
        const hits = a.filter(Boolean).length;
        add("mobile-double-combos", {
          hits, attempts: a.length, hitPercent: pct(hits, a.length),
        });
      }
    }
    if (results["501"] !== undefined) {
      const a = getEvents(results["501"], "501");
      if (a.length) {
        let darts = 0, score = 0, checkouts = 0, doubleAttempts = 0, busts = 0;
        let high100 = 0, high140 = 0, high180 = 0, knownAttempts = true;
        for (const visit of a) {
          if (!object(visit) || !Number.isInteger(visit.score) ||
              Number(visit.score) < 0 || Number(visit.score) > 180 ||
              !Number.isInteger(visit.darts) || Number(visit.darts) < 1 ||
              Number(visit.darts) > 3 || typeof visit.finish !== "boolean")
            throw new Error("501 indeholder en ugyldig indgang.");
          const n = Number(visit.score);
          darts += Number(visit.darts); score += n;
          if (visit.finish) checkouts += 1;
          if (visit.bust === true) busts += 1;
          if (n >= 100) high100 += 1;
          if (n >= 140) high140 += 1;
          if (n === 180) high180 += 1;
          if (Number.isInteger(visit.doubleAttempts) &&
              Number(visit.doubleAttempts) >= 0 &&
              Number(visit.doubleAttempts) <= Number(visit.darts))
            doubleAttempts += Number(visit.doubleAttempts);
          else knownAttempts = false;
        }
        const metrics: Record<string, number> = {
          threeDartAverage: Math.round(score * 3 / darts * 100) / 100,
          legs: checkouts, visits: a.length, dartsUsed: darts,
          checkouts, high100, high140, high180, busts,
        };
        // Older v6 records lack double-attempt data. Do not invent checkout%.
        if (knownAttempts && doubleAttempts >= checkouts && doubleAttempts > 0) {
          metrics.checkoutAttempts = doubleAttempts;
          metrics.checkoutPercent = pct(checkouts, doubleAttempts);
        }
        add("mobile-501-five-legs", metrics);
      }
    }
  }
  if (!rows.length)
    throw new Error("Ingen afsluttede øvelser i sikkerhedskopiens historik.");
  return rows;
}
