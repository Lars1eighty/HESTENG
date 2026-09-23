"use client";

import { FormEvent, useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";

type CompetitionFormat = "pools" | "roundRobin" | "knockout";
type StartingScore = 301 | 501;
type BestOfLegs = 1 | 3 | 5 | 7 | 9;

export default function PrivateCompetitionPage() {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState(["", ""]);
  const [created, setCreated] = useState(false);
  const [format, setFormat] = useState<CompetitionFormat | null>(null);
  const [matchSetupOpen, setMatchSetupOpen] = useState(false);
  const [startingScore, setStartingScore] = useState<StartingScore>(501);
  const [bestOfLegs, setBestOfLegs] = useState<BestOfLegs>(3);

  const activePlayers = players.map((player) => player.trim()).filter(Boolean);

  function updatePlayer(index: number, value: string) {
    setPlayers((current) => current.map((player, i) => (i === index ? value : player)));
  }

  function addPlayer() {
    setPlayers((current) => [...current, ""]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || activePlayers.length < 2) return;
    setCreated(true);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <BackButton />
        <p className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-orange-400">Privat Competition</p>
        <h1 className="mt-2 text-4xl font-black">Ny privat turnering</h1>
        <p className="mt-3 text-gray-400">Ingen klub nødvendig. Start med navn og deltagere.</p>

        {created ? (
          <div className="mt-8 rounded-2xl border border-orange-500/40 bg-gray-900 p-6">
            <div className="text-sm font-black uppercase tracking-widest text-orange-400">Grundlag klar</div>
            <h2 className="mt-2 text-2xl font-black">{name.trim()}</h2>
            <p className="mt-2 text-gray-400">{activePlayers.length} deltagere</p>

            <div className="mt-6">
              <div className="mb-3 text-sm font-bold text-gray-300">Vælg turneringsformat</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { id: "pools" as const, title: "Puljer", text: "Fordel spillerne i puljer." },
                  { id: "roundRobin" as const, title: "Alle mod alle", text: "Alle møder alle." },
                  { id: "knockout" as const, title: "Knockout", text: "Taberen er ude." },
                ].map((option) => (
                  <button key={option.id} type="button" onClick={() => { setFormat(option.id); setMatchSetupOpen(false); }} className={`rounded-xl border p-4 text-left transition ${format === option.id ? "border-orange-500 bg-orange-500/10" : "border-gray-700 bg-gray-950 hover:border-orange-500"}`}>
                    <div className="font-black">{option.title}</div>
                    <div className="mt-1 text-xs leading-5 text-gray-400">{option.text}</div>
                  </button>
                ))}
              </div>

              <button type="button" disabled={!format} onClick={() => setMatchSetupOpen(true)} className="mt-5 w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 disabled:cursor-not-allowed disabled:opacity-40">
                Fortsæt
              </button>

              {matchSetupOpen && (
                <div className="mt-6 border-t border-gray-800 pt-6">
                  <div className="text-sm font-bold text-gray-300">Kampformat</div>
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">Spil</div>
                    <div className="flex gap-2">
                      {([301, 501] as StartingScore[]).map((score) => (
                        <button key={score} type="button" onClick={() => setStartingScore(score)} className={`rounded-xl border px-5 py-3 font-black ${startingScore === score ? "border-orange-500 bg-orange-500/10 text-orange-300" : "border-gray-700 text-gray-300"}`}>{score}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">Legs</div>
                    <div className="flex flex-wrap gap-2">
                      {([1, 3, 5, 7, 9] as BestOfLegs[]).map((legs) => (
                        <button key={legs} type="button" onClick={() => setBestOfLegs(legs)} className={`rounded-xl border px-4 py-3 font-black ${bestOfLegs === legs ? "border-orange-500 bg-orange-500/10 text-orange-300" : "border-gray-700 text-gray-300"}`}>Best of {legs}</button>
                      ))}
                    </div>
                  </div>
                  <button type="button" className="mt-6 w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950">
                    Opret turnering
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-gray-300">Turneringsnavn</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Fx Fredagsdart" className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-base outline-none focus:border-orange-500" />
            </label>
            <div>
              <div className="mb-3 text-sm font-bold text-gray-300">Deltagere</div>
              <div className="space-y-3">
                {players.map((player, index) => (
                  <input key={index} value={player} onChange={(event) => updatePlayer(index, event.target.value)} placeholder={`Spiller ${index + 1}`} className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-base outline-none focus:border-orange-500" />
                ))}
              </div>
              <button type="button" onClick={addPlayer} className="mt-3 rounded-xl border border-gray-700 px-4 py-3 font-bold text-gray-300 hover:border-orange-500">+ Tilføj spiller</button>
            </div>
            <button type="submit" disabled={!name.trim() || activePlayers.length < 2} className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 disabled:cursor-not-allowed disabled:opacity-40">Fortsæt</button>
          </form>
        )}
      </section>
    </main>
  );
}
