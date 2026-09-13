"use client";

import { useMemo, useState } from "react";

const START_SCORE = 170;
const LEGS_TO_WIN = 5;

type CpuLevel = 45 | 55 | 65;

type MatchResult = {
  metrics: Record<string, number>;
  details: Record<string, unknown>;
};

type Props = {
  onComplete: (result: MatchResult) => void;
};

const IMPOSSIBLE_CHECKOUTS = new Set([169, 168, 166, 165, 163, 162, 159]);

function clampScore(score: number) {
  return Math.max(0, Math.min(180, Math.round(score)));
}

function isCheckoutable(remaining: number) {
  return remaining >= 2 && remaining <= 170 && !IMPOSSIBLE_CHECKOUTS.has(remaining);
}

function cpuCheckoutChance(remaining: number, level: CpuLevel) {
  if (!isCheckoutable(remaining)) return 0;

  const baseChance = level === 45 ? 0.12 : level === 55 ? 0.18 : 0.25;
  const difficultyFactor =
    remaining <= 40 ? 1.45 : remaining <= 80 ? 1 : remaining <= 120 ? 0.68 : 0.38;

  // Hidden form variance makes two CPU players at the same level behave differently
  // from visit to visit, so checkout timing cannot be read from a fixed pattern.
  const formFactor = 0.5 + Math.random() * 1.1;

  return Math.min(0.58, Math.max(0.025, baseChance * difficultyFactor * formFactor));
}

function cpuVisitScore(level: CpuLevel, remaining: number) {
  const spread = level === 45 ? 36 : level === 55 ? 33 : 30;
  const randomOffset = (Math.random() + Math.random() - 1) * spread;
  let score = clampScore(level + randomOffset);

  if (score > remaining || remaining - score === 1) {
    const safeMax = Math.max(0, remaining - 2);
    score = Math.min(score, safeMax);
  }

  return score;
}

export default function Checkout170VsCpuTraining({ onComplete }: Props) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [cpuLevel, setCpuLevel] = useState<CpuLevel>(55);
  const [playerRemaining, setPlayerRemaining] = useState(START_SCORE);
  const [cpuRemaining, setCpuRemaining] = useState(START_SCORE);
  const [playerLegs, setPlayerLegs] = useState(0);
  const [cpuLegs, setCpuLegs] = useState(0);
  const [legNumber, setLegNumber] = useState(1);
  const [visitInput, setVisitInput] = useState("");
  const [playerPoints, setPlayerPoints] = useState(0);
  const [playerVisits, setPlayerVisits] = useState(0);
  const [message, setMessage] = useState("Du starter første leg.");

  const threeDartAverage = useMemo(
    () => (playerVisits > 0 ? playerPoints / playerVisits : 0),
    [playerPoints, playerVisits]
  );

  function completeMatch(nextPlayerLegs: number, nextCpuLegs: number, nextPoints: number, nextVisits: number) {
    setFinished(true);
    onComplete({
      metrics: {
        score: nextPlayerLegs,
        won: nextPlayerLegs > nextCpuLegs ? 1 : 0,
        playerLegs: nextPlayerLegs,
        cpuLegs: nextCpuLegs,
        threeDartAverage: nextVisits > 0 ? nextPoints / nextVisits : 0,
        cpuLevel,
      },
      details: {
        startScore: START_SCORE,
        legsToWin: LEGS_TO_WIN,
        cpuLevel,
        playerLegs: nextPlayerLegs,
        cpuLegs: nextCpuLegs,
      },
    });
  }

  function resetForNextLeg(nextLeg: number, nextPlayerLegs: number, nextCpuLegs: number) {
    setPlayerRemaining(START_SCORE);
    setCpuRemaining(START_SCORE);
    setLegNumber(nextLeg);
    setVisitInput("");

    if (nextLeg % 2 === 0) {
      const cpu = playCpuTurn(START_SCORE);
      if (cpu.closed) {
        const cpuWins = nextCpuLegs + 1;
        setCpuLegs(cpuWins);
        if (cpuWins >= LEGS_TO_WIN) {
          completeMatch(nextPlayerLegs, cpuWins, playerPoints, playerVisits);
          return;
        }
        resetForNextLeg(nextLeg + 1, nextPlayerLegs, cpuWins);
        return;
      }
      setCpuRemaining(cpu.remaining);
      setMessage(`CPU startede med ${cpu.scored}. Din tur.`);
    } else {
      setMessage("Du starter dette leg.");
    }
  }

  function playCpuTurn(remaining: number) {
    if (Math.random() < cpuCheckoutChance(remaining, cpuLevel)) {
      return { closed: true, scored: remaining, remaining: 0 };
    }

    const scored = cpuVisitScore(cpuLevel, remaining);
    return { closed: false, scored, remaining: remaining - scored };
  }

  function finishPlayerLeg() {
    if (!started || finished) return;

    const nextVisits = playerVisits + 1;
    const nextPoints = playerPoints + playerRemaining;
    const nextPlayerLegs = playerLegs + 1;

    setPlayerVisits(nextVisits);
    setPlayerPoints(nextPoints);
    setPlayerLegs(nextPlayerLegs);
    setPlayerRemaining(0);
    setVisitInput("");

    if (nextPlayerLegs >= LEGS_TO_WIN) {
      completeMatch(nextPlayerLegs, cpuLegs, nextPoints, nextVisits);
      return;
    }

    resetForNextLeg(legNumber + 1, nextPlayerLegs, cpuLegs);
  }

  function registerVisit() {
    if (!started || finished) return;

    const parsed = Number.parseInt(visitInput, 10);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 180) {
      setMessage("Indtast en score fra 0 til 180.");
      return;
    }

    const bust = parsed > playerRemaining || playerRemaining - parsed === 1;
    const effectiveScore = bust ? 0 : parsed;
    const nextRemaining = bust ? playerRemaining : playerRemaining - parsed;
    const nextPoints = playerPoints + effectiveScore;
    const nextVisits = playerVisits + 1;

    setPlayerPoints(nextPoints);
    setPlayerVisits(nextVisits);
    setPlayerRemaining(nextRemaining);
    setVisitInput("");

    if (nextRemaining === 0) {
      setMessage("Brug Lukket-knappen, når du checker ud.");
      setPlayerRemaining(playerRemaining);
      setPlayerPoints(playerPoints);
      setPlayerVisits(playerVisits);
      return;
    }

    const cpu = playCpuTurn(cpuRemaining);
    if (cpu.closed) {
      const nextCpuLegs = cpuLegs + 1;
      setCpuLegs(nextCpuLegs);
      setCpuRemaining(0);
      if (nextCpuLegs >= LEGS_TO_WIN) {
        completeMatch(playerLegs, nextCpuLegs, nextPoints, nextVisits);
        return;
      }
      resetForNextLeg(legNumber + 1, playerLegs, nextCpuLegs);
      return;
    }

    setCpuRemaining(cpu.remaining);
    setMessage(
      bust
        ? `Bust. CPU scorede ${cpu.scored}. Din tur.`
        : `Du scorede ${parsed}. CPU scorede ${cpu.scored}. Din tur.`
    );
  }

  if (!started) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">170 vs CPU</div>
          <h2 className="mt-2 text-3xl font-bold text-white">Først til 5 legs</h2>
          <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base">
            I starter begge på 170. Registrer din score efter hver visit. Brug Lukket, når du checker ud. CPU spiller automatisk efter din tur.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {[45, 55, 65].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setCpuLevel(level as CpuLevel)}
                className={`rounded-2xl px-3 py-3 text-sm font-black transition ${
                  cpuLevel === level ? "bg-orange-500 text-white" : "bg-white/10 text-gray-300 hover:bg-white/15"
                }`}
              >
                CPU {level}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-5 w-full rounded-2xl bg-orange-500 px-5 py-4 text-lg font-bold text-white transition hover:bg-orange-400 sm:w-auto sm:min-w-56"
          >
            Start kamp
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-7">
      <div className="mx-auto max-w-2xl">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Dig" value={`${playerLegs} legs`} />
          <Stat label="Leg" value={legNumber} />
          <Stat label={`CPU ${cpuLevel}`} value={`${cpuLegs} legs`} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-3xl bg-black/25 p-5">
            <div className="text-xs font-black uppercase tracking-wider text-gray-400">Dig</div>
            <div className="mt-2 text-6xl font-black tabular-nums text-white">{playerRemaining}</div>
          </div>
          <div className="rounded-3xl bg-black/25 p-5">
            <div className="text-xs font-black uppercase tracking-wider text-gray-400">CPU</div>
            <div className="mt-2 text-6xl font-black tabular-nums text-white">{cpuRemaining}</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-black/20 p-4">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-400" htmlFor="visitScore">
            Din score denne visit
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="visitScore"
              inputMode="numeric"
              value={visitInput}
              onChange={(event) => setVisitInput(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              onKeyDown={(event) => {
                if (event.key === "Enter") registerVisit();
              }}
              className="min-w-0 flex-1 rounded-2xl border border-gray-700 bg-gray-950 px-4 py-4 text-center text-2xl font-black text-white outline-none focus:border-orange-400"
              placeholder="0-180"
            />
            <button
              type="button"
              onClick={registerVisit}
              className="rounded-2xl bg-white px-5 py-3 font-black text-gray-950 transition hover:bg-gray-200"
            >
              Score
            </button>
          </div>
          <button
            type="button"
            onClick={finishPlayerLeg}
            className="mt-3 w-full rounded-2xl bg-emerald-500 px-5 py-4 text-lg font-black text-white transition hover:bg-emerald-400"
          >
            Lukket
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <Stat label="Dit 3-pils snit" value={threeDartAverage.toFixed(1)} />
          <Stat label="Først til" value={`${LEGS_TO_WIN} legs`} />
        </div>

        <p className="mt-4 text-center text-sm font-semibold text-gray-400">{message}</p>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-xl font-black text-white">{value}</div>
    </div>
  );
}
