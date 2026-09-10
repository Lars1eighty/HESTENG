"use client";

import { useMemo, useState } from "react";

type GuestMatchScorerResult = {
  id: string;
  player1: string;
  player1Id?: string;
  player2: string;
  player2Id?: string;
  winner: string;
  score1: number;
  score2: number;
  bestOfLegs: number;
  status: "finished";
  finishedAt: string;
  timingSource: "hesteng-scorer";
  players: [GuestPlayerStats, GuestPlayerStats];
};

type GuestPlayerStats = {
  playerId?: string;
  name: string;
  legs: number;
  totalScored: number;
  entries: number;
  darts: number;
  average: number;
  hundredPlus: number;
  oneFortyPlus: number;
  checkouts: number;
  checkoutAttempts: number;
  checkoutPercent: number;
  highestCheckout?: number;
  highCheckouts?: number[];
  oneEighties: number;
  fastestLegDarts: number | null;
};

type Props = {
  matchId: string;
  player1: string;
  player1Id?: string;
  player2: string;
  player2Id?: string;
  bestOfLegs?: number;
  disabled?: boolean;
  onComplete: (result: GuestMatchScorerResult) => Promise<void> | void;
  onCancel?: () => void;
};

type PlayerState = {
  remaining: number;
  legs: number;
  totalScored: number;
  entries: number;
  darts: number;
  legDarts: number;
  fastestLegDarts: number | null;
  hundredPlus: number;
  oneFortyPlus: number;
  oneEighties: number;
  checkouts: number;
  checkoutAttempts: number;
  highestCheckout: number;
  highCheckouts: number[];
  lastInput: number | null;
};

type Snapshot = {
  players: [PlayerState, PlayerState];
  currentPlayer: 0 | 1;
};

type PendingDouble = {
  value: number;
  dartsUsed: number;
  after: number;
  bust: boolean;
  checkout: boolean;
  possibleAttempts?: number[];
};

type PendingEntryCheckout = {
  value: number;
};

const MAX_SCORE = 180;
const NUMBER_ROWS = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
const QUICK_LEFT = [26, 41, 45, 100];
const QUICK_RIGHT = [60, 81, 85, 140];
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

const CHECKOUTS: Record<number, string> = {
  170: "T20 T20 Bull", 167: "T20 T19 Bull", 164: "T20 T18 Bull", 161: "T20 T17 Bull",
  160: "T20 T20 D20", 158: "T20 T20 D19", 157: "T20 T19 D20", 156: "T20 T20 D18",
  155: "T20 T19 D19", 154: "T20 T18 D20", 153: "T20 T19 D18", 152: "T20 T20 D16",
  151: "T20 T17 D20", 150: "T20 T18 D18", 149: "T19 T20 D16", 148: "T20 T16 D20",
  147: "T20 T17 D18", 146: "T20 T18 D16", 145: "T20 T15 D20", 144: "T20 T20 D12",
  143: "T20 T17 D16", 142: "T20 T14 D20", 141: "T20 T19 D12", 140: "T20 T20 D10",
  138: "T20 T18 D12", 137: "T20 T19 D10", 136: "T20 T20 D8", 135: "Bull T15 D20",
  134: "T20 T14 D16", 133: "T20 T19 D8", 132: "Bull Bull D16", 131: "T20 T13 D16",
  130: "T20 T20 D5", 129: "T19 T16 D12", 128: "T18 T18 D10", 127: "T20 T17 D8",
  126: "T19 T19 D6", 125: "Bull T17 D12", 124: "T20 T16 D8", 123: "T19 T16 D9",
  122: "T18 T18 D7", 121: "T20 T11 D14", 120: "T20 20 D20", 119: "T19 T12 D13",
  118: "T20 18 D20", 117: "T20 17 D20", 116: "T20 16 D20", 115: "T20 15 D20",
  114: "T20 14 D20", 113: "T20 13 D20", 112: "T20 12 D20", 111: "T20 11 D20",
  110: "T20 10 D20", 109: "T20 9 D20", 108: "T20 16 D16", 107: "T19 10 D20",
  106: "T20 14 D16", 105: "T20 13 D16", 104: "T18 18 D16", 103: "T19 14 D16",
  102: "T20 10 D16", 101: "T17 10 D20", 100: "T20 D20",
};

function checkoutHint(remaining: number) {
  if (remaining > 170 || [169, 168, 166, 165, 163, 162, 159].includes(remaining)) return null;
  if (CHECKOUTS[remaining]) return CHECKOUTS[remaining];
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

function canCheckout(remaining: number, maxDarts: number) {
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

function getCheckoutEntryOptions(remaining: number) {
  return [1, 2, 3].filter((darts) => canCheckout(remaining, darts));
}

function isOneDartCheckout(remaining: number) {
  return CHECKOUT_DARTS.includes(remaining);
}

function getPossibleCheckoutAttempts(remaining: number, entryDarts: number) {
  const attempts = new Set<number>();

  function walk(remainingBeforeDart: number, dartsLeft: number, attemptsUsed: number) {
    if (dartsLeft === 1) {
      if (CHECKOUT_DARTS.includes(remainingBeforeDart)) attempts.add(attemptsUsed + 1);
      return;
    }

    if (isOneDartCheckout(remainingBeforeDart)) {
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

function inferCheckoutAttempts(remaining: number, entryDarts: number) {
  const possibleAttempts = getPossibleCheckoutAttempts(remaining, entryDarts);
  return possibleAttempts.length === 1 ? possibleAttempts[0] : null;
}

function initialPlayerState(): PlayerState {
  return {
    remaining: 501,
    legs: 0,
    totalScored: 0,
    entries: 0,
    darts: 0,
    legDarts: 0,
    fastestLegDarts: null,
    hundredPlus: 0,
    oneFortyPlus: 0,
    oneEighties: 0,
    checkouts: 0,
    checkoutAttempts: 0,
    highestCheckout: 0,
    highCheckouts: [],
    lastInput: null,
  };
}

function copyPlayers(players: [PlayerState, PlayerState]): [PlayerState, PlayerState] {
  return players.map((player) => ({ ...player, highCheckouts: [...player.highCheckouts] })) as [PlayerState, PlayerState];
}

function checkoutPercent(player: PlayerState) {
  return player.checkoutAttempts ? Math.round((player.checkouts / player.checkoutAttempts) * 100) : 0;
}

function toStats(state: PlayerState, name: string, playerId?: string): GuestPlayerStats {
  const average = state.darts ? (state.totalScored / state.darts) * 3 : 0;
  return {
    playerId,
    name,
    legs: state.legs,
    totalScored: state.totalScored,
    entries: state.entries,
    darts: state.darts,
    average: Number(average.toFixed(2)),
    hundredPlus: state.hundredPlus,
    oneFortyPlus: state.oneFortyPlus,
    checkouts: state.checkouts,
    checkoutAttempts: state.checkoutAttempts,
    checkoutPercent: checkoutPercent(state),
    highestCheckout: state.highestCheckout || undefined,
    highCheckouts: state.highCheckouts.length ? state.highCheckouts : undefined,
    oneEighties: state.oneEighties,
    fastestLegDarts: state.fastestLegDarts,
  };
}

export default function GuestMatchScorer({
  matchId,
  player1,
  player1Id,
  player2,
  player2Id,
  bestOfLegs = 1,
  disabled = false,
  onComplete,
  onCancel,
}: Props) {
  const [players, setPlayers] = useState<[PlayerState, PlayerState]>([initialPlayerState(), initialPlayerState()]);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [input, setInput] = useState("");
  const [scoreParts, setScoreParts] = useState<number[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingEntryCheckout, setPendingEntryCheckout] = useState<PendingEntryCheckout | null>(null);
  const [pendingDouble, setPendingDouble] = useState<PendingDouble | null>(null);

  const legsToWin = useMemo(() => Math.floor(bestOfLegs / 2) + 1, [bestOfLegs]);
  const names = [player1, player2] as const;
  const hint = checkoutHint(players[currentPlayer].remaining);
  const scorePartsSum = scoreParts.reduce((sum, part) => sum + part, 0);
  const currentPart = input ? Number(input) : 0;
  const calculatorTotal = scorePartsSum + currentPart;
  const hasCalculatorState = scoreParts.length > 0;
  const hasPendingPrompt = !!pendingEntryCheckout || !!pendingDouble;

  function clearInput() {
    setInput("");
    setScoreParts([]);
    setMessage("");
  }

  function addDigit(digit: number) {
    if (disabled || saving || hasPendingPrompt || input.length >= 3) return;
    const next = input + digit;
    if (scorePartsSum + Number(next) > MAX_SCORE) return;
    setInput(next);
    setMessage("");
  }

  function chooseScore(value: number) {
    if (disabled || saving || hasPendingPrompt || scorePartsSum + value > MAX_SCORE) return;
    setInput(String(value));
    setMessage("");
  }

  function addScorePart() {
    if (!input || disabled || saving || hasPendingPrompt) return;
    const part = Number(input);
    if (!Number.isInteger(part) || part < 0 || scorePartsSum + part > MAX_SCORE) {
      setMessage("Samlet score må maks være 180.");
      return;
    }
    setScoreParts((parts) => [...parts, part]);
    setInput("");
    setMessage("");
  }

  async function applyVisit(pending: PendingDouble, doubleAttempts: number) {
    const before = { players: copyPlayers(players), currentPlayer };
    const next = copyPlayers(players);
    const active = next[currentPlayer];

    active.entries++;
    active.darts += pending.dartsUsed;
    active.legDarts += pending.dartsUsed;
    active.lastInput = pending.value;
    active.checkoutAttempts += doubleAttempts;

    if (!pending.bust) {
      active.remaining = pending.after;
      active.totalScored += pending.value;
      if (pending.value === 180) active.oneEighties++;
      else if (pending.value >= 140) active.oneFortyPlus++;
      else if (pending.value >= 100) active.hundredPlus++;
    }

    if (!pending.bust && pending.checkout) {
      active.legs++;
      active.checkouts++;
      active.highestCheckout = Math.max(active.highestCheckout, pending.value);
      if (pending.value >= 100) active.highCheckouts.push(pending.value);
      active.fastestLegDarts = active.fastestLegDarts === null
        ? active.legDarts
        : Math.min(active.fastestLegDarts, active.legDarts);

      if (active.legs >= legsToWin) {
        setHistory((items) => [...items, before]);
        setPlayers(next);
        clearInput();
        setPendingEntryCheckout(null);
        setPendingDouble(null);
        setMessage("");
        setSaving(true);

        const result: GuestMatchScorerResult = {
          id: matchId,
          player1,
          player1Id,
          player2,
          player2Id,
          winner: names[currentPlayer],
          score1: next[0].legs,
          score2: next[1].legs,
          bestOfLegs,
          status: "finished",
          finishedAt: new Date().toISOString(),
          timingSource: "hesteng-scorer",
          players: [
            toStats(next[0], player1, player1Id),
            toStats(next[1], player2, player2Id),
          ],
        };

        try {
          await onComplete(result);
        } finally {
          setSaving(false);
        }
        return;
      }

      next[0].remaining = 501;
      next[1].remaining = 501;
      next[0].legDarts = 0;
      next[1].legDarts = 0;
    }

    setHistory((items) => [...items, before]);
    setPlayers(next);
    setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
    clearInput();
    setPendingEntryCheckout(null);
    setPendingDouble(null);
    setMessage(pending.bust ? "Bust" : "");
  }

  function chooseCheckoutEntryDarts(dartsUsed: number) {
    if (!pendingEntryCheckout) return;
    const possibleEntryDarts = getCheckoutEntryOptions(pendingEntryCheckout.value);
    if (!possibleEntryDarts.includes(dartsUsed)) return;

    const inferredAttempts = inferCheckoutAttempts(pendingEntryCheckout.value, dartsUsed);
    const pending: PendingDouble = {
      value: pendingEntryCheckout.value,
      dartsUsed,
      after: 0,
      bust: false,
      checkout: true,
      possibleAttempts: getPossibleCheckoutAttempts(pendingEntryCheckout.value, dartsUsed),
    };

    setPendingEntryCheckout(null);
    if (inferredAttempts !== null) {
      void applyVisit(pending, inferredAttempts);
      return;
    }
    setPendingDouble(pending);
  }

  function submitScore(forcedScore?: number) {
    if (disabled || saving || hasPendingPrompt) return;
    const value = forcedScore ?? calculatorTotal;
    if (!Number.isInteger(value) || value < 0 || value > MAX_SCORE || (!input && !hasCalculatorState && forcedScore === undefined)) {
      setMessage("Skriv en score fra 0 til 180.");
      return;
    }

    const remaining = players[currentPlayer].remaining;
    const after = remaining - value;
    const bust = value > remaining || after === 1 || after < 0;
    const checkout = !bust && after === 0;

    if (checkout) {
      if (!canCheckout(remaining, 3)) {
        void applyVisit({ value: 0, dartsUsed: 3, after: remaining, bust: true, checkout: false }, 0);
        return;
      }
      setPendingEntryCheckout({ value });
      clearInput();
      return;
    }

    const pending: PendingDouble = { value, dartsUsed: 3, after, bust, checkout: false };
    if (!bust && after < 50) {
      setPendingDouble(pending);
      return;
    }

    void applyVisit(pending, 0);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous || saving || hasPendingPrompt) return;
    setPlayers(copyPlayers(previous.players));
    setCurrentPlayer(previous.currentPlayer);
    setHistory((items) => items.slice(0, -1));
    clearInput();
    setMessage("");
  }

  const expression = hasCalculatorState
    ? `${scoreParts.join(" + ")}${input ? ` + ${input}` : " +"}`
    : "";

  return (
    <div className="relative rounded-2xl border border-orange-500/40 bg-gray-900 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-orange-400">Scoreboard</div>
          <div className="text-xs font-semibold text-gray-500">Først til {legsToWin}</div>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving || hasPendingPrompt} className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-bold text-gray-300 disabled:opacity-50">
            Luk
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map((index) => (
          <div key={names[index]} className={`rounded-xl border px-3 py-3 text-center ${currentPlayer === index ? "border-orange-500 bg-orange-500/10" : "border-gray-800 bg-gray-950"}`}>
            <div className="truncate text-sm font-black">{names[index]}</div>
            <div className="mt-1 text-4xl font-black tabular-nums sm:text-5xl">{players[index].remaining}</div>
            <div className="mt-1 text-xs text-gray-500">{players[index].lastInput === null ? "—" : `Sidst ${players[index].lastInput}`} · Leg {players[index].legs}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-center text-sm font-black text-orange-300">{names[currentPlayer]} kaster</div>

      {hint && (
        <div className="mt-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-center text-sm">
          <span className="font-black text-cyan-300">CO {players[currentPlayer].remaining}: </span>
          <span className="font-bold text-cyan-100">{hint}</span>
        </div>
      )}

      <div className="mt-3 flex min-h-16 items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-950 px-4">
        <div className="min-w-0">
          <div className="text-3xl font-black tabular-nums">{hasCalculatorState ? calculatorTotal : input || "0"}</div>
          {hasCalculatorState && <div className="truncate text-xs font-bold text-gray-500">{expression}</div>}
        </div>
        <button type="button" onClick={clearInput} disabled={hasPendingPrompt} className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-black text-gray-400 disabled:opacity-40">CLR</button>
      </div>

      <div className="mt-2 grid grid-cols-5 gap-2">
        <div className="grid gap-2">
          {QUICK_LEFT.map((value) => (
            <button key={value} type="button" onClick={() => chooseScore(value)} className="rounded-xl border border-green-900 bg-green-500/10 py-3 text-lg font-black text-green-400">{value}</button>
          ))}
        </div>
        <div className="col-span-3 grid gap-2">
          {NUMBER_ROWS.map((row) => (
            <div key={row[0]} className="grid grid-cols-3 gap-2">
              {row.map((digit) => (
                <button key={digit} type="button" onClick={() => addDigit(digit)} className="rounded-xl border border-gray-700 bg-gray-950 py-3 text-2xl font-black">{digit}</button>
              ))}
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          {QUICK_RIGHT.map((value) => (
            <button key={value} type="button" onClick={() => chooseScore(value)} className="rounded-xl border border-green-900 bg-green-500/10 py-3 text-lg font-black text-green-400">{value}</button>
          ))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        <button type="button" onClick={undo} disabled={!history.length || saving || hasPendingPrompt} className="rounded-xl border border-red-900 bg-red-500/10 py-3 font-black text-red-400 disabled:opacity-40">↶</button>
        <button type="button" onClick={addScorePart} disabled={!input || saving || hasPendingPrompt} className="rounded-xl border border-orange-500/70 bg-orange-500/10 py-3 text-2xl font-black text-orange-300 disabled:opacity-40">+</button>
        <button type="button" onClick={() => input ? addDigit(0) : chooseScore(180)} disabled={saving || hasPendingPrompt} className="rounded-xl border border-blue-600 bg-blue-600 py-3 text-lg font-black text-white disabled:opacity-40">{input ? "0" : "180"}</button>
        <button type="button" onClick={() => submitScore()} disabled={disabled || saving || hasPendingPrompt} className="rounded-xl bg-green-500 py-3 font-black text-black disabled:opacity-50">ENTER</button>
      </div>

      {message && <div className={`mt-2 text-center text-sm font-black ${message === "Bust" ? "text-red-300" : "text-gray-400"}`}>{saving ? "Gemmer..." : message}</div>}

      {pendingEntryCheckout && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-orange-500/40 bg-gray-900 p-5 shadow-2xl">
            <div className="text-center">
              <div className="text-xs font-black uppercase tracking-widest text-orange-400">Indgang</div>
              <div className="mt-2 text-xl font-black">Hvor mange pile blev brugt på indgangen?</div>
              <div className="mt-1 text-sm text-gray-400">Checkout {pendingEntryCheckout.value}</div>
            </div>

            <div className={`mt-5 grid gap-2 ${getCheckoutEntryOptions(pendingEntryCheckout.value).length === 1 ? "grid-cols-1" : getCheckoutEntryOptions(pendingEntryCheckout.value).length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {getCheckoutEntryOptions(pendingEntryCheckout.value).map((darts) => (
                <button
                  key={darts}
                  type="button"
                  onClick={() => chooseCheckoutEntryDarts(darts)}
                  className={`rounded-xl border py-5 text-2xl font-black ${darts === 3 ? "border-green-600 bg-green-500 text-black" : darts === 2 ? "border-yellow-500 bg-yellow-400 text-black" : "border-red-600 bg-red-500 text-white"}`}
                >
                  {darts}
                </button>
              ))}
            </div>

            <button type="button" onClick={() => setPendingEntryCheckout(null)} className="mt-3 w-full rounded-xl border border-gray-700 py-3 text-sm font-bold text-gray-400">
              Tilbage
            </button>
          </div>
        </div>
      )}

      {pendingDouble && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-cyan-500/40 bg-gray-900 p-5 shadow-2xl">
            <div className="text-center">
              <div className="text-xs font-black uppercase tracking-widest text-cyan-400">Double</div>
              <div className="mt-2 text-xl font-black">Hvor mange pile blev brugt på double?</div>
              <div className="mt-1 text-sm text-gray-400">{pendingDouble.checkout ? `Lukning ${pendingDouble.value} · ${pendingDouble.dartsUsed} pile` : `Rest ${pendingDouble.after}`}</div>
            </div>

            <div className={`mt-5 grid gap-2 ${pendingDouble.checkout ? "grid-cols-3" : "grid-cols-4"}`}>
              {(pendingDouble.checkout ? [1, 2, 3] : [0, 1, 2, 3]).map((attempts) => {
                const allowed = !pendingDouble.checkout || !pendingDouble.possibleAttempts || pendingDouble.possibleAttempts.includes(attempts);
                return (
                  <button
                    key={attempts}
                    type="button"
                    disabled={!allowed}
                    onClick={() => void applyVisit(pendingDouble, attempts)}
                    className="rounded-xl border border-cyan-600 bg-cyan-500/10 py-5 text-2xl font-black text-cyan-200 disabled:opacity-25"
                  >
                    {attempts}
                  </button>
                );
              })}
            </div>

            <button type="button" onClick={() => setPendingDouble(null)} className="mt-3 w-full rounded-xl border border-gray-700 py-3 text-sm font-bold text-gray-400">
              Tilbage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
