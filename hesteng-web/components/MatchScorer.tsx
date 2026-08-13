"use client";

import { useMemo, useState } from "react";

type PlayerScore = {
  name: string;
  remaining: number;
  legs: number;
  totalScored: number;
  entries: number;
  checkouts: number;
  checkoutAttempts: number;
  legDarts: number;
  fastestLegDarts: number | null;
};

type Props = {
  player1: string;
  player2: string;
  bestOfLegs?: number;
};

const NUMBER_ROWS = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
const QUICK_LEFT = [26, 41, 45, 100];
const QUICK_RIGHT = [60, 81, 85, 140];
const MAX_SCORE = 180;

function isValidCheckout(score: number) {
  return score >= 2 && score <= 170;
}

export default function MatchScorer({ player1, player2, bestOfLegs = 3 }: Props) {
  const [players, setPlayers] = useState<PlayerScore[]>([
    { name: player1, remaining: 501, legs: 0, totalScored: 0, entries: 0, checkouts: 0, checkoutAttempts: 0, legDarts: 0, fastestLegDarts: null },
    { name: player2, remaining: 501, legs: 0, totalScored: 0, entries: 0, checkouts: 0, checkoutAttempts: 0, legDarts: 0, fastestLegDarts: null },
  ]);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<PlayerScore[][]>([]);
  const [message, setMessage] = useState("");
  const [pendingCheckout, setPendingCheckout] = useState<{ score: number; remaining: number } | null>(null);
  const [checkoutDarts, setCheckoutDarts] = useState("");

  const current = players[currentPlayer];
  const neededLegs = Math.ceil(bestOfLegs / 2);
  const matchWinner = useMemo(() => players.find((player) => player.legs >= neededLegs), [players, neededLegs]);

  function addDigit(digit: number) {
    if (matchWinner || pendingCheckout || input.length >= 3) return;
    const nextInput = input + digit.toString();
    const nextScore = Number(nextInput);
    if (nextScore > MAX_SCORE) return;
    setInput(nextInput);
    setMessage("");
  }

  function chooseScore(score: number) {
    if (matchWinner || pendingCheckout || score > MAX_SCORE) return;
    setInput(score.toString());
    setMessage("");
  }

  function clearInput() {
    if (pendingCheckout) return;
    setInput("");
    setMessage("");
  }

  function finishVisit(score: number, nextRemaining: number) {
    setPlayers((items) => items.map((player, index) => index === currentPlayer
      ? {
          ...player,
          remaining: nextRemaining,
          totalScored: player.totalScored + score,
          entries: player.entries + 1,
          checkoutAttempts: player.checkoutAttempts + (current.remaining <= 170 ? 1 : 0),
          legDarts: player.legDarts + 3,
        }
      : player
    ));
    setInput("");
    setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
    setMessage("");
  }

  function enterScore() {
    if (!input || matchWinner || pendingCheckout) return;
    const score = Number(input);
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return;

    const nextRemaining = current.remaining - score;
    setHistory((items) => [...items, players.map((player) => ({ ...player }))]);

    if (nextRemaining < 0 || nextRemaining === 1) {
      setInput("");
      setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
      setMessage("Bust — ingen score.");
      return;
    }

    if (nextRemaining === 0) {
      if (!isValidCheckout(score)) {
        setInput("");
        setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
        setMessage("Bust — double out.");
        return;
      }
      setPendingCheckout({ score, remaining: 0 });
      setCheckoutDarts("");
      setInput("");
      return;
    }

    // From 49 downwards, ask how many darts were used on the checkout attempt.
    if (nextRemaining < 50) {
      setPendingCheckout({ score, remaining: nextRemaining });
      setCheckoutDarts("");
      setInput("");
      return;
    }

    finishVisit(score, nextRemaining);
  }

  function saveCheckoutDarts() {
    const darts = Number(checkoutDarts);
    if (!Number.isInteger(darts) || darts < 0 || darts > 3 || !pendingCheckout) return;

    const { score, remaining } = pendingCheckout;

    if (remaining === 0) {
      if (darts < 1) return;
      setPlayers((items) => items.map((player, index) => {
        if (index !== currentPlayer) return { ...player, remaining: 501 };
        const completedLegDarts = player.legDarts + darts;
        const fastestLegDarts = player.fastestLegDarts === null
          ? completedLegDarts
          : Math.min(player.fastestLegDarts, completedLegDarts);
        return {
          ...player,
          remaining: 501,
          legs: player.legs + 1,
          totalScored: player.totalScored + score,
          entries: player.entries + 1,
          checkouts: player.checkouts + 1,
          checkoutAttempts: player.checkoutAttempts + 1,
          legDarts: 0,
          fastestLegDarts,
        };
      }));
    } else {
      setPlayers((items) => items.map((player, index) => index === currentPlayer
        ? {
            ...player,
            remaining,
            totalScored: player.totalScored + score,
            entries: player.entries + 1,
            checkoutAttempts: player.checkoutAttempts + 1,
            legDarts: player.legDarts + 3,
          }
        : player
      ));
    }

    setPendingCheckout(null);
    setCheckoutDarts("");
    setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
    setMessage("");
  }

  function undo() {
    if (pendingCheckout) return;
    const previous = history.at(-1);
    if (!previous) return;
    setPlayers(previous.map((player) => ({ ...player })));
    setHistory((items) => items.slice(0, -1));
    setInput("");
    setMessage("");
  }

  const stats = players.map((player) => {
    const avg = player.entries ? player.totalScored / player.entries : 0;
    const closePercent = player.checkoutAttempts ? Math.round((player.checkouts / player.checkoutAttempts) * 100) : 0;
    return { avg, closePercent };
  });

  const playerCard = (player: PlayerScore, index: 0 | 1) => (
    <div className={`rounded-2xl border-2 ${index === 0 ? "border-blue-600" : "border-red-600"} bg-gray-900 p-5`}>
      <div className={`text-sm font-semibold ${index === 0 ? "text-blue-400" : "text-red-400"}`}>SPILLER {index + 1}</div>
      <div className="mt-1 text-2xl font-bold">{player.name}</div>
      <div className="mt-2 flex items-center justify-between gap-4">
        <div className="text-7xl font-bold tabular-nums">{player.remaining}</div>
        <div className={`rounded-xl px-5 py-3 text-center ${index === 0 ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"}`}>
          <div className="text-xs">LEGS</div>
          <div className="text-3xl font-bold">{player.legs}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 border-t border-gray-800 pt-3 text-center text-xs text-gray-400">
        <div>SNIT / LEG<br /><b className={index === 0 ? "text-blue-400" : "text-red-400"}>{stats[index].avg.toFixed(2)}</b></div>
        <div>SNIT / KAMP<br /><b className={index === 0 ? "text-blue-400" : "text-red-400"}>{stats[index].avg.toFixed(2)}</b></div>
        <div>LUKKET / FORSØGT<br /><b>{player.checkouts} / {player.checkoutAttempts}</b></div>
        <div>LUKKE %<br /><b className={index === 0 ? "text-blue-400" : "text-red-400"}>{stats[index].closePercent}%</b></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)]">
        {playerCard(players[0], 0)}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 text-center">
          <div className="text-sm text-gray-400">LEGS · BEDST AF {bestOfLegs}</div>
          <div className="mt-4 text-4xl font-bold tabular-nums">
            <span className="text-blue-400">{players[0].legs}</span>
            <span className="text-gray-600"> – </span>
            <span className="text-red-400">{players[1].legs}</span>
          </div>
          <div className="mt-8 text-sm text-gray-500">NÆSTE SPILLER</div>
          <div className={`mt-1 text-xl font-bold ${currentPlayer === 0 ? "text-blue-400" : "text-red-400"}`}>{current.name}</div>
        </div>
        {playerCard(players[1], 1)}
      </div>

      {pendingCheckout && (
        <div className="rounded-2xl border border-blue-600 bg-gray-900 p-5 text-center">
          <div className="text-sm text-blue-400">LUKNING</div>
          <div className="mt-1 text-2xl font-bold">Hvor mange pile brugte du på lukningen?</div>
          <div className="mt-1 text-gray-400">Rest: {pendingCheckout.remaining}</div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((darts) => (
              <button key={darts} onClick={() => setCheckoutDarts(darts.toString())} className={`rounded-xl border py-5 text-2xl font-bold ${checkoutDarts === darts.toString() ? "border-blue-500 bg-blue-500/20" : "border-gray-800 bg-gray-900"}`}>
                {darts}
              </button>
            ))}
          </div>
          <button onClick={saveCheckoutDarts} disabled={!checkoutDarts || (pendingCheckout.remaining === 0 && checkoutDarts === "0")} className="mt-3 w-full rounded-xl bg-green-500 py-5 text-xl font-bold text-black disabled:opacity-40">GEM LUKNING</button>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
        <div className="flex min-h-[76px] items-center rounded-2xl border border-gray-800 bg-gray-900 px-6">
          <div className="text-2xl font-bold tabular-nums text-white">{input}</div>
          {!input && <div className="text-gray-500">INDTASTET TAL</div>}
        </div>
        <button onClick={clearInput} disabled={!!pendingCheckout} className="rounded-2xl border border-gray-800 bg-gray-900 text-xl font-bold disabled:opacity-40">CLR</button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <div className="grid gap-2">
          {QUICK_LEFT.map((score) => <button key={score} onClick={() => chooseScore(score)} disabled={!!pendingCheckout} className="rounded-xl border border-green-800 bg-green-500/10 py-5 text-2xl font-bold text-green-400 disabled:opacity-40">{score}</button>)}
        </div>
        <div className="col-span-3 grid gap-2">
          {NUMBER_ROWS.map((row) => (
            <div key={row[0]} className="grid grid-cols-3 gap-2">
              {row.map((score) => <button key={score} onClick={() => addDigit(score)} disabled={!!pendingCheckout} className="rounded-xl border border-gray-800 bg-gray-900 py-5 text-3xl font-bold disabled:opacity-40">{score}</button>)}
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          {QUICK_RIGHT.map((score) => <button key={score} onClick={() => chooseScore(score)} disabled={!!pendingCheckout} className="rounded-xl border border-green-800 bg-green-500/10 py-5 text-2xl font-bold text-green-400 disabled:opacity-40">{score}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={undo} disabled={!!pendingCheckout} className="rounded-xl border border-red-900 bg-red-500/10 py-5 text-xl font-bold text-red-400 disabled:opacity-40">↶ UNDO</button>
        <button onClick={() => (input ? addDigit(0) : chooseScore(180))} disabled={!!pendingCheckout} className="rounded-xl border border-blue-600 bg-blue-600 py-5 text-2xl font-bold text-white disabled:opacity-40">{input ? "0" : "180"}</button>
        <button onClick={enterScore} disabled={!!pendingCheckout} className="rounded-xl bg-green-500 py-5 text-xl font-bold text-black disabled:opacity-40">ENTER →</button>
      </div>

      <div className="text-center text-sm text-gray-500">Hver indgang registreres som én samlet score.</div>
      {message && <div className="text-center text-sm text-gray-400">{message}</div>}
      {matchWinner && (
        <div className="rounded-2xl border border-green-800 bg-green-500/10 p-5 text-center">
          <div className="text-sm uppercase tracking-wide text-green-400">Kamp færdig</div>
          <div className="mt-1 text-3xl font-bold">{matchWinner.name} vinder</div>
          <div className="mt-1 text-gray-400">{players[0].legs} – {players[1].legs}</div>
          <div className="mt-3 text-sm text-gray-400">
            Hurtigste leg: {players[0].fastestLegDarts ?? "—"} / {players[1].fastestLegDarts ?? "—"} pile
          </div>
        </div>
      )}
    </div>
  );
}
