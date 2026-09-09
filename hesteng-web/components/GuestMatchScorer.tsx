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
  average: number;
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
  oneEighties: number;
  checkouts: number;
  checkoutAttempts: number;
  highestCheckout: number;
  highCheckouts: number[];
};

type Snapshot = {
  players: [PlayerState, PlayerState];
  currentPlayer: 0 | 1;
};

function initialPlayerState(): PlayerState {
  return { remaining: 501, legs: 0, totalScored: 0, entries: 0, darts: 0, legDarts: 0, fastestLegDarts: null, oneEighties: 0, checkouts: 0, checkoutAttempts: 0, highestCheckout: 0, highCheckouts: [] };
}

function copyPlayers(players: [PlayerState, PlayerState]): [PlayerState, PlayerState] {
  return players.map((player) => ({ ...player, highCheckouts: [...player.highCheckouts] })) as [PlayerState, PlayerState];
}

function toStats(state: PlayerState, name: string, playerId?: string): GuestPlayerStats {
  const average = state.darts > 0 ? state.totalScored / state.darts * 3 : 0;
  return {
    playerId, name, legs: state.legs, totalScored: state.totalScored, entries: state.entries,
    average: Number(average.toFixed(2)), checkouts: state.checkouts, checkoutAttempts: state.checkoutAttempts,
    checkoutPercent: state.checkoutAttempts > 0 ? Number((state.checkouts / state.checkoutAttempts * 100).toFixed(1)) : 0,
    highestCheckout: state.highestCheckout || undefined, highCheckouts: state.highCheckouts.length ? state.highCheckouts : undefined,
    oneEighties: state.oneEighties, fastestLegDarts: state.fastestLegDarts,
  };
}

export default function GuestMatchScorer({ matchId, player1, player1Id, player2, player2Id, bestOfLegs = 1, disabled = false, onComplete, onCancel }: Props) {
  const [players, setPlayers] = useState<[PlayerState, PlayerState]>([initialPlayerState(), initialPlayerState()]);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [score, setScore] = useState("");
  const [dartsUsed, setDartsUsed] = useState("3");
  const [checkoutAttempt, setCheckoutAttempt] = useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const legsToWin = useMemo(() => Math.floor(bestOfLegs / 2) + 1, [bestOfLegs]);
  const names = [player1, player2] as const;

  async function submitScore() {
    if (disabled || saving) return;
    const value = Number(score); const darts = Number(dartsUsed);
    if (!Number.isInteger(value) || value < 0 || value > 180) { setMessage("Skriv en score fra 0 til 180."); return; }
    if (![1, 2, 3].includes(darts)) { setMessage("Vælg 1, 2 eller 3 pile."); return; }

    const before: Snapshot = { players: copyPlayers(players), currentPlayer };
    const next = copyPlayers(players); const active = next[currentPlayer];
    active.entries += 1; active.darts += darts; active.legDarts += darts;
    if (checkoutAttempt) active.checkoutAttempts += 1;
    const after = active.remaining - value;
    const bust = value > active.remaining || after === 1 || after < 0;

    if (!bust) { active.remaining = after; active.totalScored += value; if (value === 180) active.oneEighties += 1; }
    if (!bust && after === 0) {
      active.legs += 1; active.checkouts += 1;
      if (!checkoutAttempt) active.checkoutAttempts += 1;
      active.highestCheckout = Math.max(active.highestCheckout, value);
      if (value >= 100) active.highCheckouts.push(value);
      active.fastestLegDarts = active.fastestLegDarts === null ? active.legDarts : Math.min(active.fastestLegDarts, active.legDarts);
      if (active.legs >= legsToWin) {
        setHistory((current) => [...current, before]); setPlayers(next); setScore(""); setCheckoutAttempt(false); setMessage(""); setSaving(true);
        const result: GuestMatchScorerResult = { id: matchId, player1, player1Id, player2, player2Id, winner: names[currentPlayer], score1: next[0].legs, score2: next[1].legs, bestOfLegs, status: "finished", finishedAt: new Date().toISOString(), timingSource: "hesteng-scorer", players: [toStats(next[0], player1, player1Id), toStats(next[1], player2, player2Id)] };
        try { await onComplete(result); } finally { setSaving(false); }
        return;
      }
      next[0].remaining = 501; next[1].remaining = 501; next[0].legDarts = 0; next[1].legDarts = 0;
    }
    setHistory((current) => [...current, before]); setPlayers(next); setCurrentPlayer(currentPlayer === 0 ? 1 : 0); setScore(""); setDartsUsed("3"); setCheckoutAttempt(false); setMessage(bust ? "Bust" : "");
  }

  function undo() {
    const previous = history.at(-1); if (!previous || saving) return;
    setPlayers(copyPlayers(previous.players)); setCurrentPlayer(previous.currentPlayer); setHistory((current) => current.slice(0, -1)); setScore(""); setDartsUsed("3"); setCheckoutAttempt(false); setMessage("");
  }

  return <div className="rounded-2xl border border-orange-500/40 bg-gray-900 p-4">
    <div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-widest text-orange-400">Scoreboard</div><div className="mt-1 text-sm font-semibold text-gray-400">Først til {legsToWin} leg{legsToWin === 1 ? "" : "s"}</div></div>{onCancel && <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-bold text-gray-300 disabled:opacity-50">Luk</button>}</div>
    <div className="grid grid-cols-2 gap-3">{[0, 1].map((index) => <div key={names[index]} className={`rounded-xl border p-4 ${currentPlayer === index ? "border-orange-500 bg-orange-500/10" : "border-gray-800 bg-gray-950"}`}><div className="truncate text-sm font-black">{names[index]}</div><div className="mt-2 text-4xl font-black tabular-nums">{players[index].remaining}</div><div className="mt-2 text-xs font-bold text-gray-500">Legs {players[index].legs} · Avg {players[index].darts ? (players[index].totalScored / players[index].darts * 3).toFixed(1) : "0.0"}</div></div>)}</div>
    <div className="mt-4 text-center text-sm font-black text-orange-300">{names[currentPlayer]} kaster</div>
    <div className="mt-3 flex gap-2"><input inputMode="numeric" pattern="[0-9]*" value={score} onChange={(event) => setScore(event.target.value.replace(/\D/g, "").slice(0, 3))} onKeyDown={(event) => { if (event.key === "Enter") void submitScore(); }} disabled={disabled || saving} autoFocus placeholder="Score" className="min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-950 px-4 py-4 text-center text-2xl font-black outline-none focus:border-orange-500 disabled:opacity-50"/><button type="button" onClick={() => void submitScore()} disabled={disabled || saving} className="rounded-xl bg-orange-500 px-5 py-4 font-black text-black disabled:opacity-50">ENTER</button></div>
    <div className="mt-3 grid grid-cols-2 gap-2"><div><div className="mb-1 text-xs font-bold text-gray-500">Pile brugt</div><div className="grid grid-cols-3 gap-1">{[1,2,3].map((darts) => <button key={darts} type="button" onClick={() => setDartsUsed(String(darts))} className={`rounded-lg border py-2 font-black ${dartsUsed === String(darts) ? "border-orange-500 bg-orange-500/10 text-orange-300" : "border-gray-700 text-gray-400"}`}>{darts}</button>)}</div></div><label className="flex cursor-pointer items-end"><span className={`w-full rounded-lg border px-3 py-2 text-center text-sm font-black ${checkoutAttempt ? "border-cyan-500 bg-cyan-500/10 text-cyan-300" : "border-gray-700 text-gray-400"}`}><input type="checkbox" checked={checkoutAttempt} onChange={(event) => setCheckoutAttempt(event.target.checked)} className="sr-only"/>Checkout-forsøg</span></label></div>
    <div className="mt-3 flex items-center justify-between gap-3"><button type="button" onClick={undo} disabled={!history.length || saving} className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-bold text-gray-300 disabled:opacity-40">UNDO</button><div className={`text-sm font-black ${message === "Bust" ? "text-red-300" : "text-gray-400"}`}>{saving ? "Gemmer..." : message}</div></div>
  </div>;
}
