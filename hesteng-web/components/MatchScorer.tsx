"use client";

import { useMemo, useState } from "react";

type PlayerScore = {
  name: string;
  remaining: number;
  legs: number;
};

type Props = {
  player1: string;
  player2: string;
  bestOfLegs?: number;
};

const QUICK_SCORES = [60, 57, 54, 51, 48, 45, 42, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

function isValidCheckout(score: number) {
  return score >= 2 && score <= 170;
}

export default function MatchScorer({ player1, player2, bestOfLegs = 3 }: Props) {
  const [players, setPlayers] = useState<PlayerScore[]>([
    { name: player1, remaining: 501, legs: 0 },
    { name: player2, remaining: 501, legs: 0 },
  ]);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [turnDarts, setTurnDarts] = useState<number[]>([]);
  const [history, setHistory] = useState<PlayerScore[][]>([]);
  const [message, setMessage] = useState("Indtast første dart");

  const current = players[currentPlayer];
  const turnTotal = turnDarts.reduce((sum, value) => sum + value, 0);
  const neededLegs = Math.ceil(bestOfLegs / 2);
  const matchWinner = useMemo(
    () => players.find((player) => player.legs >= neededLegs),
    [players, neededLegs]
  );

  function registerScore(value: number) {
    if (matchWinner || turnDarts.length >= 3) return;

    const nextDarts = [...turnDarts, value];
    const total = nextDarts.reduce((sum, dart) => sum + dart, 0);
    const remaining = current.remaining - total;

    if (remaining < 0 || remaining === 1 || (remaining === 0 && !isValidCheckout(total))) {
      setHistory((items) => [...items, players]);
      setTurnDarts([]);
      setMessage("Bust — scoren går tilbage");
      setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
      return;
    }

    setTurnDarts(nextDarts);
    setMessage(remaining === 0 ? "Checkout!" : `${remaining} tilbage`);

    if (remaining === 0) {
      setHistory((items) => [...items, players]);
      const updated = players.map((player, index) =>
        index === currentPlayer
          ? { ...player, remaining: 501, legs: player.legs + 1 }
          : { ...player, remaining: 501 }
      );
      setPlayers(updated);
      setTurnDarts([]);
      setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
      return;
    }

    setPlayers((items) =>
      items.map((player, index) =>
        index === currentPlayer ? { ...player, remaining } : player
      )
    );

    if (nextDarts.length === 3) {
      setTurnDarts([]);
      setCurrentPlayer(currentPlayer === 0 ? 1 : 0);
      setMessage("Næste spiller");
    }
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setPlayers(previous);
    setHistory((items) => items.slice(0, -1));
    setTurnDarts([]);
    setMessage("Sidste tur fortrudt");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {players.map((player, index) => (
          <div
            key={player.name}
            className={`rounded-2xl border p-6 ${index === currentPlayer ? "border-orange-500 bg-orange-500/10" : "border-gray-800 bg-gray-900"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">{index === currentPlayer ? "DIN TUR" : "NÆSTE"}</div>
                <div className="mt-1 text-xl font-bold">{player.name}</div>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold tabular-nums">{player.remaining}</div>
                <div className="mt-1 text-sm text-gray-500">{player.legs} leg{player.legs === 1 ? "" : "s"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500">Tur</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{turnDarts.length ? turnDarts.join(" + ") : "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Turens score</div>
            <div className="text-2xl font-bold">{turnTotal}</div>
          </div>
        </div>
        <div aria-live="polite" className="mt-3 text-sm text-orange-400">{message}</div>
      </div>

      {!matchWinner ? (
        <>
          <div className="grid grid-cols-5 gap-2">
            {QUICK_SCORES.map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => registerScore(score)}
                className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-4 text-lg font-semibold hover:bg-gray-800 active:bg-orange-500"
              >
                {score}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={undo} className="rounded-xl border border-gray-700 px-4 py-3 font-semibold hover:bg-gray-800">Fortryd sidste tur</button>
            <button type="button" onClick={() => registerScore(0)} className="rounded-xl border border-gray-700 px-4 py-3 font-semibold hover:bg-gray-800">0 / miss</button>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-green-800 bg-green-500/10 p-6 text-center">
          <div className="text-sm uppercase tracking-wide text-green-400">Kamp færdig</div>
          <div className="mt-2 text-3xl font-bold">{matchWinner.name} vinder</div>
          <div className="mt-1 text-gray-400">{players[0].legs} – {players[1].legs}</div>
        </div>
      )}
    </div>
  );
}
