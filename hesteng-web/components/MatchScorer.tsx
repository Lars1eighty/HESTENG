"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { saveCompletedMatch, type CompletedMatch } from "@/lib/matchStore";

type Multiplier = "S" | "D" | "T";

type DartThrow = {
  multiplier: Multiplier;
  target: number;
  score: number;
};

type PlayerScore = {
  name: string;
  remaining: number;
  legs: number;
  totalScored: number;
  entries: number;
  checkouts: number;
  checkoutAttempts: number;
  highestCheckout: number;
  oneEighties: number;
  lastInput: number | null;
  legDarts: number;
  legEntries: number;
  recentScores: number[];
  fastestLegDarts: number | null;
};

type Props = {
  matchId: string;
  clubId?: string;
  clubNightId?: string;
  player1: string;
  player2: string;
  bestOfLegs?: number;
  board?: number | null;
  pool?: string | null;
  round?: number | null;
  onMatchComplete?: (match: CompletedMatch) => void;
};

type MatchSnapshot = {
  players: PlayerScore[];
  currentPlayer: 0 | 1;
};

const NUMBER_ROWS = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
const DART_TARGET_ROWS = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [25]];
const QUICK_LEFT = [26, 41, 45, 100];
const QUICK_RIGHT = [60, 81, 85, 140];
const MULTIPLIERS: Multiplier[] = ["S", "D", "T"];
const MAX_SCORE = 180;
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
const MAX_LEG_ENTRIES = 14;

function isValidCheckout(score: number) {
  return canCheckout(score, 3);
}

function multiplierValue(multiplier: Multiplier) {
  if (multiplier === "D") return 2;
  if (multiplier === "T") return 3;
  return 1;
}

function dartLabel(dart: DartThrow) {
  if (dart.target === 0) return "0";
  if (dart.target === 25 && dart.multiplier === "D") return "BULL";
  return `${dart.multiplier}${dart.target}`;
}

function getCheckoutEntryOptions(remaining: number) {
  return [1, 2, 3].filter((darts) => canCheckout(remaining, darts));
}

function isOneDartCheckout(remaining: number) {
  return CHECKOUT_DARTS.includes(remaining);
}

function inferCheckoutAttempts(remaining: number, entryDarts: number) {
  const possibleAttempts = getPossibleCheckoutAttempts(remaining, entryDarts);
  return possibleAttempts.length === 1 ? possibleAttempts[0] : null;
}

function getPossibleCheckoutAttempts(remaining: number, entryDarts: number) {
  const attempts = new Set<number>();

  function walk(remainingBeforeDart: number, dartsLeft: number, attemptsUsed: number) {
    if (dartsLeft === 1) {
      if (CHECKOUT_DARTS.includes(remainingBeforeDart)) {
        attempts.add(attemptsUsed + 1);
      }
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

function appendRecentScore(scores: number[], score: number) {
  return [...scores, score].slice(-5);
}

export default function MatchScorer({ matchId, clubId, clubNightId, player1, player2, bestOfLegs = 3, board = null, pool = null, round = null, onMatchComplete }: Props) {
  const [players, setPlayers] = useState<PlayerScore[]>([
    { name: player1, remaining: 501, legs: 0, totalScored: 0, entries: 0, checkouts: 0, checkoutAttempts: 0, highestCheckout: 0, oneEighties: 0, lastInput: null, legDarts: 0, legEntries: 0, recentScores: [], fastestLegDarts: null },
    { name: player2, remaining: 501, legs: 0, totalScored: 0, entries: 0, checkouts: 0, checkoutAttempts: 0, highestCheckout: 0, oneEighties: 0, lastInput: null, legDarts: 0, legEntries: 0, recentScores: [], fastestLegDarts: null },
  ]);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [inputMode, setInputMode] = useState<"score" | "darts">("score");
  const [input, setInput] = useState("");
  const [dartMultiplier, setDartMultiplier] = useState<Multiplier>("S");
  const [dartThrows, setDartThrows] = useState<DartThrow[]>([]);
  const [checkoutEntryDarts, setCheckoutEntryDarts] = useState<number | null>(null);
  const [history, setHistory] = useState<MatchSnapshot[]>([]);
  const [message, setMessage] = useState("");
  const [pendingEntryCheckout, setPendingEntryCheckout] = useState<{ score: number } | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{ score: number; remaining: number; entryDarts: number; possibleAttempts?: number[] } | null>(null);
  const [pendingMiss, setPendingMiss] = useState(false);
  const [pendingBull, setPendingBull] = useState(false);
  const [checkoutDarts, setCheckoutDarts] = useState("");
  const [saved, setSaved] = useState(false);

  const current = players[currentPlayer];
  const neededLegs = Math.ceil(bestOfLegs / 2);
  const matchWinner = useMemo(() => players.find((player) => player.legs >= neededLegs), [players, neededLegs]);
  const dartScore = dartThrows.reduce((total, dart) => total + dart.score, 0);
  const checkoutEntryOptions = getCheckoutEntryOptions(current.remaining);
  const hasPendingCheckoutPrompt = !!pendingEntryCheckout || !!pendingCheckout || pendingMiss || pendingBull;
  const canUseCheckoutEntry = !matchWinner && !hasPendingCheckoutPrompt && checkoutEntryOptions.length > 0;
  const hasVisitInput = inputMode === "darts" ? dartThrows.length > 0 : !!input;
  const showBustMiss = !matchWinner && !hasPendingCheckoutPrompt && current.remaining <= 170 && !hasVisitInput;

  const buildCompletedMatch = useCallback(() => {
    if (!matchWinner) return null;
    const stats = players.map((player) => ({
      name: player.name,
      legs: player.legs,
      totalScored: player.totalScored,
      entries: player.entries,
      average: player.entries ? player.totalScored / player.entries : 0,
      checkouts: player.checkouts,
      checkoutAttempts: player.checkoutAttempts,
      checkoutPercent: player.checkoutAttempts ? Math.round((player.checkouts / player.checkoutAttempts) * 100) : 0,
      highestCheckout: player.highestCheckout,
      oneEighties: player.oneEighties,
      fastestLegDarts: player.fastestLegDarts,
    })) as [{ name: string; legs: number; totalScored: number; entries: number; average: number; checkouts: number; checkoutAttempts: number; checkoutPercent: number; highestCheckout: number; oneEighties: number; fastestLegDarts: number | null }, { name: string; legs: number; totalScored: number; entries: number; average: number; checkouts: number; checkoutAttempts: number; checkoutPercent: number; highestCheckout: number; oneEighties: number; fastestLegDarts: number | null }];

    return {
      id: matchId,
      clubId,
      clubNightId,
      player1: players[0].name,
      player2: players[1].name,
      winner: matchWinner.name,
      score1: players[0].legs,
      score2: players[1].legs,
      bestOfLegs,
      board,
      pool,
      round,
      status: "finished" as const,
      finishedAt: new Date().toISOString(),
      players: stats,
    };
  }, [bestOfLegs, board, clubId, clubNightId, matchId, matchWinner, players, pool, round]);

  useEffect(() => {
    if (!matchWinner || saved) return;
    const completedMatch = buildCompletedMatch();
    if (!completedMatch) return;
    saveCompletedMatch(completedMatch);
    onMatchComplete?.(completedMatch);
    // Preserve the existing once-per-match save guard after syncing MatchStore.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(true);
  }, [buildCompletedMatch, matchWinner, onMatchComplete, saved]);

  function resetInputState() {
    setInput("");
    setDartThrows([]);
    setCheckoutEntryDarts(null);
  }

  function addDigit(digit: number) {
    if (matchWinner || hasPendingCheckoutPrompt || input.length >= 3) return;
    const nextInput = input + digit.toString();
    const nextScore = Number(nextInput);
    if (nextScore > MAX_SCORE) return;
    setInputMode("score");
    setInput(nextInput);
    setDartThrows([]);
    setMessage("");
  }

  function chooseScore(score: number) {
    if (matchWinner || hasPendingCheckoutPrompt || score > MAX_SCORE) return;
    setInputMode("score");
    setInput(score.toString());
    setDartThrows([]);
    setMessage("");
  }

  function clearInput() {
    if (hasPendingCheckoutPrompt) return;
    resetInputState();
    setMessage("");
  }

  function chooseInputMode(mode: "score" | "darts") {
    if (hasPendingCheckoutPrompt || matchWinner) return;
    setInputMode(mode);
    setInput("");
    setDartThrows([]);
    setMessage("");
  }

  function addDart(target: number) {
    if (matchWinner || hasPendingCheckoutPrompt || dartThrows.length >= 3) return;
    if (target === 25 && dartMultiplier === "T") return;
    const score = target * multiplierValue(dartMultiplier);
    const nextScore = dartScore + score;
    if (nextScore > MAX_SCORE) return;
    setInputMode("darts");
    setInput("");
    setDartThrows((items) => [...items, { multiplier: dartMultiplier, target, score }]);
    setMessage("");
  }

  function removeLastDart() {
    if (hasPendingCheckoutPrompt) return;
    setDartThrows((items) => items.slice(0, -1));
    setMessage("");
  }

  function chooseCheckoutEntryDarts(darts: number) {
    if (matchWinner || hasPendingCheckoutPrompt || !checkoutEntryOptions.includes(darts)) return;
    setHistory((items) => [...items, { players: players.map((player) => ({ ...player })), currentPlayer }]);
    setCheckoutEntryDarts(darts);
    const inferredAttempts = inferCheckoutAttempts(current.remaining, darts);
    if (inferredAttempts !== null) {
      completeSuccessfulCheckout(current.remaining, darts, inferredAttempts);
      return;
    }
    setPendingCheckout({ score: current.remaining, remaining: 0, entryDarts: darts, possibleAttempts: getPossibleCheckoutAttempts(current.remaining, darts) });
    setCheckoutDarts("");
    setInput("");
    setDartThrows([]);
    setMessage("");
  }

  function choosePendingEntryDarts(darts: number) {
    if (!pendingEntryCheckout || !getCheckoutEntryOptions(pendingEntryCheckout.score).includes(darts)) return;
    const inferredAttempts = inferCheckoutAttempts(pendingEntryCheckout.score, darts);
    setCheckoutEntryDarts(darts);
    if (inferredAttempts !== null) {
      completeSuccessfulCheckout(pendingEntryCheckout.score, darts, inferredAttempts);
      setPendingEntryCheckout(null);
      return;
    }
    setPendingCheckout({ score: pendingEntryCheckout.score, remaining: 0, entryDarts: darts, possibleAttempts: getPossibleCheckoutAttempts(pendingEntryCheckout.score, darts) });
    setPendingEntryCheckout(null);
    setCheckoutDarts("");
    setMessage("");
  }

  function startBustMiss() {
    if (!showBustMiss) return;
    setHistory((items) => [...items, { players: players.map((player) => ({ ...player })), currentPlayer }]);
    setPendingMiss(true);
    setCheckoutDarts("");
    setMessage("");
  }

  function finishVisit(score: number, nextRemaining: number, checkoutAttemptsToAdd = 0, dartsForVisit = 3) {
    const nextPlayers = players.map((player, index) => index === currentPlayer ? {
      ...player,
      remaining: nextRemaining,
      totalScored: player.totalScored + score,
      entries: player.entries + 1,
      checkoutAttempts: player.checkoutAttempts + checkoutAttemptsToAdd,
      oneEighties: player.oneEighties + (score === 180 ? 1 : 0),
      lastInput: score,
      legDarts: player.legDarts + dartsForVisit,
      legEntries: player.legEntries + 1,
      recentScores: appendRecentScore(player.recentScores, score),
    } : player);
    setPlayers(nextPlayers);
    resetInputState();
    if (nextPlayers.every((player) => player.legEntries >= MAX_LEG_ENTRIES)) {
      setPendingBull(true);
    } else {
      setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
    }
    setMessage("");
  }

  function completeSuccessfulCheckout(score: number, entryDarts: number, darts: number) {
    const matchIsFinished = current.legs + 1 >= neededLegs;
    setPlayers((items) => items.map((player, index) => {
      if (index !== currentPlayer) {
        return {
          ...player,
          remaining: matchIsFinished ? player.remaining : 501,
          legDarts: matchIsFinished ? player.legDarts : 0,
          legEntries: matchIsFinished ? player.legEntries : 0,
          recentScores: matchIsFinished ? player.recentScores : [],
        };
      }
      const completedLegDarts = player.legDarts + entryDarts;
      const fastestLegDarts = player.fastestLegDarts === null ? completedLegDarts : Math.min(player.fastestLegDarts, completedLegDarts);
      return {
        ...player,
        remaining: matchIsFinished ? 0 : 501,
        legs: player.legs + 1,
        totalScored: player.totalScored + score,
        entries: player.entries + 1,
        checkouts: player.checkouts + 1,
        checkoutAttempts: player.checkoutAttempts + darts,
        highestCheckout: Math.max(player.highestCheckout, score),
        oneEighties: player.oneEighties + (score === 180 ? 1 : 0),
        lastInput: score,
        legDarts: 0,
        legEntries: matchIsFinished ? player.legEntries + 1 : 0,
        recentScores: matchIsFinished ? appendRecentScore(player.recentScores, score) : [],
        fastestLegDarts,
      };
    }));

    setPendingCheckout(null);
    setPendingEntryCheckout(null);
    setPendingMiss(false);
    setPendingBull(false);
    setCheckoutDarts("");
    setCheckoutEntryDarts(null);
    setInput("");
    setDartThrows([]);
    if (!matchIsFinished) {
      setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
    }
    setMessage("");
  }

  function awardBullLeg(winnerIndex: 0 | 1) {
    const matchIsFinished = players[winnerIndex].legs + 1 >= neededLegs;
    setPlayers((items) => items.map((player, index) => ({
      ...player,
      remaining: matchIsFinished ? player.remaining : 501,
      legs: index === winnerIndex ? player.legs + 1 : player.legs,
      legDarts: matchIsFinished ? player.legDarts : 0,
      legEntries: matchIsFinished ? player.legEntries : 0,
      recentScores: matchIsFinished ? player.recentScores : [],
    })));
    setPendingBull(false);
    resetInputState();
    if (!matchIsFinished) {
      setCurrentPlayer(winnerIndex === 0 ? 1 : 0);
    }
    setMessage("");
  }

  function enterScore() {
    if (matchWinner || hasPendingCheckoutPrompt) return;
    if (inputMode === "score" && !input) return;
    if (inputMode === "darts" && dartThrows.length !== 3) {
      setMessage("Registrer tre pile før ENTER.");
      return;
    }

    const score = inputMode === "darts" ? dartScore : Number(input);
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return;
    const nextRemaining = current.remaining - score;
    const entryDarts = checkoutEntryDarts ?? (inputMode === "darts" ? dartThrows.length : 3);
    setHistory((items) => [...items, { players: players.map((player) => ({ ...player })), currentPlayer }]);

    if (nextRemaining < 0 || nextRemaining === 1) {
      resetInputState();
      setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
      setMessage("Bust — ingen score.");
      return;
    }

    if (nextRemaining === 0) {
      if (!isValidCheckout(score)) {
        resetInputState();
        setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
        setMessage("Bust — double out.");
        return;
      }
      if (inputMode === "score" && checkoutEntryDarts === null) {
        setPendingEntryCheckout({ score });
        setCheckoutDarts("");
        setInput("");
        setDartThrows([]);
        return;
      }
      setPendingCheckout({ score, remaining: 0, entryDarts: checkoutEntryDarts ?? (inputMode === "darts" ? dartThrows.length : 0), possibleAttempts: getPossibleCheckoutAttempts(score, checkoutEntryDarts ?? (inputMode === "darts" ? dartThrows.length : 0)) });
      setCheckoutDarts("");
      setInput("");
      setDartThrows([]);
      return;
    }

    if (checkoutEntryDarts !== null || nextRemaining < 50) {
      setPendingCheckout({ score, remaining: nextRemaining, entryDarts });
      setCheckoutDarts("");
      setInput("");
      setDartThrows([]);
      return;
    }

    finishVisit(score, nextRemaining, 0, entryDarts);
  }

  function saveCheckoutDarts() {
    const darts = Number(checkoutDarts);
    if (!Number.isInteger(darts) || darts < 0 || darts > 3 || !pendingCheckout) return;
    const { score, remaining, entryDarts } = pendingCheckout;

    if (remaining === 0) {
      if (darts < 1) return;
      if (pendingCheckout.possibleAttempts && !pendingCheckout.possibleAttempts.includes(darts)) return;
      completeSuccessfulCheckout(score, entryDarts, darts);
    } else {
      finishVisit(score, remaining, darts, entryDarts + darts);
      setPendingCheckout(null);
      setCheckoutDarts("");
      return;
    }
  }

  function saveBustMissDarts() {
    const darts = Number(checkoutDarts);
    if (!Number.isInteger(darts) || darts < 0 || darts > 3 || !pendingMiss) return;
    finishVisit(0, current.remaining, darts, 3);
    setPendingMiss(false);
    setCheckoutDarts("");
  }

  function undo() {
    if (hasPendingCheckoutPrompt) return;
    const previous = history.at(-1);
    if (!previous) return;
    setPlayers(previous.players.map((player) => ({ ...player })));
    setCurrentPlayer(previous.currentPlayer);
    setHistory((items) => items.slice(0, -1));
    resetInputState();
    setMessage("");
    setSaved(false);
  }

  const stats = players.map((player) => ({
    avg: player.entries ? player.totalScored / player.entries : 0,
    closePercent: player.checkoutAttempts ? Math.round((player.checkouts / player.checkoutAttempts) * 100) : 0,
  }));

  const playerCard = (player: PlayerScore, index: 0 | 1) => (
    <div className={`rounded-2xl border-2 ${index === 0 ? "border-blue-600" : "border-red-600"} bg-gray-900 p-5`}>
      <div className={`text-sm font-semibold ${index === 0 ? "text-blue-400" : "text-red-400"}`}>SPILLER {index + 1}</div>
      <div className="mt-1 text-2xl font-bold">{player.name}</div>
      <div className="text-xs text-gray-500">Sidste indtastning: {player.lastInput ?? "—"}</div>
      <div className="mt-2 flex items-center justify-between gap-4">
        <div className="text-7xl font-bold tabular-nums">{player.remaining}</div>
        <div className={`min-w-28 rounded-xl px-4 py-3 ${index === 0 ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"}`}>
          <div className="text-center text-xs font-bold">SENESTE 5</div>
          <div className="mt-2 space-y-1 text-center text-sm font-bold tabular-nums text-white">
            {player.recentScores.length ? player.recentScores.map((score, scoreIndex) => (
              <div key={`${player.name}-${scoreIndex}-${score}`}>{score}</div>
            )) : (
              <div className="text-gray-600">—</div>
            )}
          </div>
          <div className="mt-3 border-t border-gray-700 pt-2 text-center text-xs text-gray-400">INDGANGE <b className="text-white">{player.legEntries}</b></div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-5 border-t border-gray-800 pt-3 text-center text-xs text-gray-400">
        <div>SNIT / LEG<br /><b className={index === 0 ? "text-blue-400" : "text-red-400"}>{stats[index].avg.toFixed(2)}</b></div>
        <div>SNIT / KAMP<br /><b className={index === 0 ? "text-blue-400" : "text-red-400"}>{stats[index].avg.toFixed(2)}</b></div>
        <div>LUKKET / FORSØGT<br /><b>{player.checkouts} / {player.checkoutAttempts}</b></div>
        <div>LUKKE %<br /><b className={index === 0 ? "text-blue-400" : "text-red-400"}>{stats[index].closePercent}%</b></div>
        <div>180&apos;ERE<br /><b className={index === 0 ? "text-blue-400" : "text-red-400"}>{player.oneEighties}</b></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)]">
        {playerCard(players[0], 0)}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 text-center">
          <div className="text-sm text-gray-400">LEGS · BEDST AF {bestOfLegs}</div>
          <div className="mt-4 text-4xl font-bold tabular-nums"><span className="text-blue-400">{players[0].legs}</span><span className="text-gray-600"> – </span><span className="text-red-400">{players[1].legs}</span></div>
          <div className="mt-8 text-sm text-gray-500">NÆSTE SPILLER</div>
          <div className={`mt-1 text-xl font-bold ${currentPlayer === 0 ? "text-blue-400" : "text-red-400"}`}>{current.name}</div>
        </div>
        {playerCard(players[1], 1)}
      </div>

      {pendingBull && !matchWinner && (
        <div className="rounded-2xl border border-yellow-600 bg-gray-900 p-5 text-center">
          <div className="text-sm font-semibold text-yellow-400">TÆTTEST PÅ BULL</div>
          <div className="mt-1 text-2xl font-bold">Vælg hvem der vinder leget</div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {players.map((player, index) => (
              <button key={player.name} onClick={() => awardBullLeg(index as 0 | 1)} className={`rounded-2xl border py-5 text-xl font-bold ${index === 0 ? "border-blue-600 bg-blue-500/10 text-blue-400" : "border-red-600 bg-red-500/10 text-red-400"}`}>
                {player.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {pendingEntryCheckout && (
        <div className="rounded-2xl border border-blue-600 bg-gray-900 p-5 text-center">
          <div className="text-sm text-blue-400">INDGANG</div>
          <div className="mt-1 text-2xl font-bold">Hvor mange pile brugte du på indgangen?</div>
          <div className="mt-1 text-gray-400">Checkout: {pendingEntryCheckout.score}</div>
          <div className={`mt-4 grid gap-2 ${getCheckoutEntryOptions(pendingEntryCheckout.score).length === 1 ? "grid-cols-1" : getCheckoutEntryOptions(pendingEntryCheckout.score).length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {getCheckoutEntryOptions(pendingEntryCheckout.score).map((darts) => (
              <button key={darts} onClick={() => choosePendingEntryDarts(darts)} className={`rounded-xl border py-5 text-3xl font-bold ${darts === 3 ? "border-green-600 bg-green-500 text-black" : darts === 2 ? "border-yellow-500 bg-yellow-400 text-black" : "border-red-600 bg-red-500 text-white"}`}>{darts}</button>
            ))}
          </div>
        </div>
      )}

      {pendingMiss && (
        <div className="rounded-2xl border border-blue-600 bg-gray-900 p-5 text-center">
          <div className="text-sm text-blue-400">BUST / MISS</div>
          <div className="mt-1 text-2xl font-bold">Hvor mange pile brugt på double?</div>
          <div className="mt-1 text-gray-400">Rest: {current.remaining}</div>
          <div className="mt-4 grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((darts) => <button key={darts} onClick={() => setCheckoutDarts(darts.toString())} className={`rounded-xl border py-5 text-2xl font-bold ${checkoutDarts === darts.toString() ? "border-blue-500 bg-blue-500/20" : "border-gray-800 bg-gray-900"}`}>{darts}</button>)}</div>
          <button onClick={saveBustMissDarts} disabled={!checkoutDarts} className="mt-3 w-full rounded-xl bg-green-500 py-5 text-xl font-bold text-black disabled:opacity-40">GEM BUST / MISS</button>
        </div>
      )}

      {pendingCheckout && (
        <div className="rounded-2xl border border-blue-600 bg-gray-900 p-5 text-center">
          <div className="text-sm text-blue-400">LUKNING</div>
          <div className="mt-1 text-2xl font-bold">Hvor mange pile brugt på double?</div>
          <div className="mt-1 text-gray-400">Rest: {pendingCheckout.remaining}</div>
          <div className="mt-1 text-xs text-gray-500">Indgangspile: {pendingCheckout.entryDarts}</div>
          <div className="mt-4 grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((darts) => {
            const isAllowed = pendingCheckout.remaining !== 0 || !pendingCheckout.possibleAttempts || pendingCheckout.possibleAttempts.includes(darts);
            return <button key={darts} onClick={() => setCheckoutDarts(darts.toString())} disabled={!isAllowed} className={`rounded-xl border py-5 text-2xl font-bold disabled:opacity-30 ${checkoutDarts === darts.toString() ? "border-blue-500 bg-blue-500/20" : "border-gray-800 bg-gray-900"}`}>{darts}</button>;
          })}</div>
          <button onClick={saveCheckoutDarts} disabled={!checkoutDarts || (pendingCheckout.remaining === 0 && checkoutDarts === "0")} className="mt-3 w-full rounded-xl bg-green-500 py-5 text-xl font-bold text-black disabled:opacity-40">GEM LUKNING</button>
        </div>
      )}

      <div className="grid grid-cols-[minmax(180px,0.34fr)_96px_minmax(0,1fr)] gap-2">
        <div className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900 px-6">
          {inputMode === "darts" ? (
            <>
              <div className="text-2xl font-bold tabular-nums text-white">{dartScore}</div>
              <div className="text-sm text-gray-400">{dartThrows.length ? dartThrows.map(dartLabel).join(" + ") : "VÆLG PILE"}</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold tabular-nums text-white">{input}</div>
              {!input && <div className="text-gray-500">INDTASTET TAL</div>}
            </>
          )}
        </div>
        <button onClick={clearInput} disabled={hasPendingCheckoutPrompt} className="rounded-2xl border border-gray-800 bg-gray-900 text-xl font-bold disabled:opacity-40">CLR</button>
        <div className={`grid gap-2 ${checkoutEntryOptions.length === 1 ? "grid-cols-1" : checkoutEntryOptions.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {[...checkoutEntryOptions].sort((a, b) => b - a).map((darts) => (
            <button key={darts} onClick={() => chooseCheckoutEntryDarts(darts)} disabled={!canUseCheckoutEntry && checkoutEntryDarts !== darts} title="Antal pile brugt på indgangen" className={`min-h-[76px] rounded-2xl border text-4xl font-bold ${checkoutEntryDarts === darts ? "border-white/80 ring-4 ring-white/30" : "border-transparent disabled:opacity-40"} ${darts === 3 ? "bg-green-500 text-black" : darts === 2 ? "bg-yellow-400 text-black" : "bg-red-500 text-white"}`}>{darts}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => chooseInputMode("score")} disabled={hasPendingCheckoutPrompt} className={`rounded-xl border py-3 text-sm font-bold disabled:opacity-40 ${inputMode === "score" ? "border-blue-500 bg-blue-500/20 text-blue-300" : "border-gray-800 bg-gray-900 text-gray-300"}`}>SCORE</button>
        <button onClick={() => chooseInputMode("darts")} disabled={hasPendingCheckoutPrompt} className={`rounded-xl border py-3 text-sm font-bold disabled:opacity-40 ${inputMode === "darts" ? "border-blue-500 bg-blue-500/20 text-blue-300" : "border-gray-800 bg-gray-900 text-gray-300"}`}>PIL FOR PIL</button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <div className="grid gap-2">{QUICK_LEFT.map((score) => <button key={score} onClick={() => chooseScore(score)} disabled={hasPendingCheckoutPrompt} className="rounded-xl border border-green-800 bg-green-500/10 py-5 text-2xl font-bold text-green-400 disabled:opacity-40">{score}</button>)}</div>
        <div className="col-span-3 grid gap-2">{NUMBER_ROWS.map((row) => <div key={row[0]} className="grid grid-cols-3 gap-2">{row.map((score) => <button key={score} onClick={() => addDigit(score)} disabled={hasPendingCheckoutPrompt} className="rounded-xl border border-gray-800 bg-gray-900 py-5 text-3xl font-bold disabled:opacity-40">{score}</button>)}</div>)}</div>
        <div className="grid gap-2">{QUICK_RIGHT.map((score) => <button key={score} onClick={() => chooseScore(score)} disabled={hasPendingCheckoutPrompt} className="rounded-xl border border-green-800 bg-green-500/10 py-5 text-2xl font-bold text-green-400 disabled:opacity-40">{score}</button>)}</div>
      </div>

      {inputMode === "darts" && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3">
          <div className="grid grid-cols-3 gap-2">
            {MULTIPLIERS.map((multiplier) => (
              <button key={multiplier} onClick={() => setDartMultiplier(multiplier)} disabled={hasPendingCheckoutPrompt || dartThrows.length >= 3} className={`rounded-xl border py-3 text-lg font-bold disabled:opacity-40 ${dartMultiplier === multiplier ? "border-blue-500 bg-blue-500/20 text-blue-300" : "border-gray-800 bg-gray-950 text-gray-300"}`}>{multiplier}</button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            <button onClick={() => addDart(0)} disabled={hasPendingCheckoutPrompt || dartThrows.length >= 3} className="rounded-xl border border-gray-800 bg-gray-950 py-4 text-xl font-bold disabled:opacity-40">0</button>
            {DART_TARGET_ROWS.flat().map((target) => (
              <button key={target} onClick={() => addDart(target)} disabled={hasPendingCheckoutPrompt || dartThrows.length >= 3 || (target === 25 && dartMultiplier === "T")} className="rounded-xl border border-gray-800 bg-gray-950 py-4 text-xl font-bold disabled:opacity-40">{target}</button>
            ))}
          </div>
          <button onClick={removeLastDart} disabled={hasPendingCheckoutPrompt || dartThrows.length === 0} className="mt-2 w-full rounded-xl border border-red-900 bg-red-500/10 py-3 text-sm font-bold text-red-400 disabled:opacity-40">SLET SIDSTE PIL</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button onClick={undo} disabled={hasPendingCheckoutPrompt} className="rounded-xl border border-red-900 bg-red-500/10 py-5 text-xl font-bold text-red-400 disabled:opacity-40">↶ UNDO</button>
        <button onClick={() => (input ? addDigit(0) : chooseScore(180))} disabled={hasPendingCheckoutPrompt} className="rounded-xl border border-blue-600 bg-blue-600 py-5 text-2xl font-bold text-white disabled:opacity-40">{input ? "0" : "180"}</button>
        <button onClick={showBustMiss ? startBustMiss : enterScore} disabled={hasPendingCheckoutPrompt} className="rounded-xl bg-green-500 py-5 text-xl font-bold text-black disabled:opacity-40">{showBustMiss ? "BUST / MISS" : "ENTER →"}</button>
      </div>

      <div className="text-center text-sm text-gray-500">Hver indgang registreres som én samlet score.</div>
      {message && <div className="text-center text-sm text-gray-400">{message}</div>}
      {matchWinner && (
        <div className="rounded-2xl border border-green-800 bg-green-500/10 p-5">
          <div className="text-center"><div className="text-sm uppercase tracking-wide text-green-400">Kamp færdig</div><div className="mt-1 text-3xl font-bold">{matchWinner.name} vinder</div><div className="mt-1 text-gray-400">{players[0].legs} – {players[1].legs}</div></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{players.map((player, index) => <div key={player.name} className="rounded-xl border border-gray-800 bg-gray-900 p-4"><div className={`font-bold ${index === 0 ? "text-blue-400" : "text-red-400"}`}>{player.name}</div><div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-400"><div>Snit / kamp<br /><b className="text-white">{stats[index].avg.toFixed(2)}</b></div><div>Lukket / forsøgt<br /><b className="text-white">{player.checkouts} / {player.checkoutAttempts}</b></div><div>Lukke %<br /><b className="text-white">{stats[index].closePercent}%</b></div><div>180&apos;ere<br /><b className="text-white">{player.oneEighties}</b></div><div className="col-span-2">Hurtigste leg<br /><b className="text-white">{player.fastestLegDarts ?? "—"} pile</b></div></div></div>)}</div>
          <div className="mt-4 text-center text-sm font-semibold text-green-400">{saved ? "Kampen er gemt." : "Gemmer kamp…"}</div>
        </div>
      )}
    </div>
  );
}
