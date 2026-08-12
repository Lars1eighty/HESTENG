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
    { name: player1, remaining: 501, legs: 0, totalScored: 0, entries: 0, checkouts: 0, checkoutAttempts: 0 },
    { name: player2, remaining: 501, legs: 0, totalScored: 0, entries: 0, checkouts: 0, checkoutAttempts: 0 },
  ]);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<PlayerScore[][]>([]);
  const [message, setMessage] = useState("");
  const [checkoutDarts, setCheckoutDarts] = useState("");
  const [entryDarts, setEntryDarts] = useState("");
  const [pendingCheckoutScore, setPendingCheckoutScore] = useState<number | null>(null);

  const current = players[currentPlayer];
  const neededLegs = Math.ceil(bestOfLegs / 2);
  const matchWinner = useMemo(() => players.find((player) => player.legs >= neededLegs), [players, neededLegs]);

  function addDigit(digit: number) {
    if (matchWinner || pendingCheckoutScore !== null || input.length >= 3) return;

    const nextInput = input + digit.toString();
    const nextScore = Number(nextInput);
    if (nextScore > MAX_SCORE) return;

    setInput(nextInput);
    setMessage("");
  }

  function chooseScore(score: number) {
    if (matchWinner || pendingCheckoutScore !== null || score > MAX_SCORE) return;
    setInput(score.toString());
    setMessage("");
  }

  function clearInput() {
    if (pendingCheckoutScore !== null) return;
    setInput("");
    setMessage("");
  }

  function enterScore() {
    if (!input || matchWinner || pendingCheckoutScore !== null) return;

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

      setPendingCheckoutScore(score);
      setCheckoutDarts("");
      setEntryDarts("");
      setInput("");
      setMessage("");
      return;
    }

    setPlayers((items) => items.map((player, index) => index === currentPlayer
      ? {
          ...player,
          remaining: nextRemaining,
          totalScored: player.totalScored + score,
          entries: player.entries + 1,
          checkoutAttempts: player.checkoutAttempts + (current.remaining <= 170 ? 1 : 0),
        }
      : player
    ));
    setInput("");
    setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
    setMessage("");
  }

  function confirmCheckout() {
    if (pendingCheckoutScore === null) return;

    const doubleDarts = Number(checkoutDarts);
    const visitDarts = Number(entryDarts);

    if (!Number.isInteger(doubleDarts) || doubleDarts < 1 || doubleDarts > 3) return;
    if (!Number.isInteger(visitDarts) || visitDarts < doubleDarts || visitDarts > 3) return;

    setPlayers((items) => items.map((player, index) => index === currentPlayer
      ? {
          ...player,
          remaining: 501,
          legs: player.legs + 1,
          totalScored: player.totalScored + pendingCheckoutScore,
          entries: player.entries + 1,
          checkouts: player.checkouts + 1,
          checkoutAttempts: player.checkoutAttempts + 1,
        }
      : { ...player, remaining: 501 }
    ));

    setPendingCheckoutScore(null);
    setCheckoutDarts("");
    setEntryDarts("");
    setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
    setMessage("");
  }

  function undo() {
    if (pendingCheckoutScore !== null) return;
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

      <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
        <div className="flex min-h-[76px] items-center rounded-2xl border border-gray-800 bg-gray-900 px-6">
          <div className="text-2xl font-bold tabular-nums text-white">{input}</div>
          {!input && <div className="text-gray-500">INDTASTET TAL</div>}
        </div>
        <button onClick={clearInput} className="rounded-2xl border border-gray-800 bg-gray-900 text-xl font-bold">CLR</button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <div className="grid gap-2">
          {QUICK_LEFT.map((score) => (
            <button key={score} onClick={() => chooseScore(score)} className="rounded-xl border border-green-800 bg-green-500/10 py-5 text-2xl font-bold text-green-400">{score}</button>
          ))}
        </div>

        <div className="col-span-3 grid gap-2">
          {NUMBER_ROWS.map((row) => (
            <div key={row[0]} className="grid grid-cols-3 gap-2">
              {row.map((score) => (
                <button key={score} onClick={() => addDigit(score)} className="rounded-xl border border-gray-800 bg-gray-900 py-5 text-3xl font-bold">{score}</button>
              ))}
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          {QUICK_RIGHT.map((score) => (
            <button key={score} onClick={() => chooseScore(score)} className="rounded-xl border border-green-800 bg-green-500/10 py-5 text-2xl font-bold text-green-400">{score}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={undo} className="rounded-xl border border-red-900 bg-red-500/10 py-5 text-xl font-bold text-red-400">↶ UNDO</button>
        <button
          onClick={() => (input ? addDigit(0) : chooseScore(180))}
          className="rounded-xl border border-blue-600 bg-blue-600 py-5 text-2xl font-bold text-white"
        >
          {input ? "0" : "180"}
        </button>
        <button onClick={enterScore} className="rounded-xl bg-green-500 py-5 text-xl font-bold text-black">ENTER →</button>
      </div>

      <div className="text-center text-sm text-gray-500">Hver indgang registreres som én samlet score.</div>

      {message && <div className="text-center text-sm text-gray-400">{message}</div>}

      {matchWinner && (
        <div className="rounded-2xl border border-green-800 bg-green-500/10 p-5 text-center">
          <div className="text-sm uppercase tracking-wide text-green-400">Kamp færdig</div>
          <div className="mt-1 text-3xl font-bold">{matchWinner.name} vinder</div>
          <div className="mt-1 text-gray-400">{players[0].legs} – {players[1].legs}</div>
        </div>
      )}

      {pendingCheckoutScore !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="text-sm font-semibold uppercase tracking-wide text-green-400">Kamp lukket</div>
            <div className="mt-1 text-2xl font-bold">{current.name} ramte 0</div>
            <div className="mt-2 text-gray-400">Registrér pile brugt på doubler og i hele indgangen.</div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <label className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <span className="text-sm text-gray-400">Pile på double</span>
                <input
                  autoFocus
                  type="number"
                  min="1"
                  max="3"
                  value={checkoutDarts}
                  onChange={(event) => setCheckoutDarts(event.target.value)}
                  className="mt-2 w-full bg-transparent text-3xl font-bold outline-none"
                />
              </label>

              <label className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <span className="text-sm text-gray-400">Pile i indgangen</span>
                <input
                  type="number"
                  min="1"
                  max="3"
                  value={entryDarts}
                  onChange={(event) => setEntryDarts(event.target.value)}
                  className="mt-2 w-full bg-transparent text-3xl font-bold outline-none"
                />
              </label>
            </div>

            <button
              onClick={confirmCheckout}
              className="mt-5 w-full rounded-xl bg-green-500 py-4 text-lg font-bold text-black"
            >
              GEM LUKNING
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
