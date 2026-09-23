"use client";

import { FormEvent, useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";

export default function PrivateCompetitionPage() {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState(["", ""]);
  const [created, setCreated] = useState(false);\n  const [format, setFormat] = useState<"pools" | "roundRobin" | "knockout" | null>(null);\n  const [matchSetupOpen, setMatchSetupOpen] = useState(false);\n  const [startingScore, setStartingScore] = useState<301 | 501>(501);\n  const [bestOfLegs, setBestOfLegs] = useState<1 | 3 | 5 | 7 | 9>(3);

  function updatePlayer(index: number, value: string) {
    setPlayers((current) => current.map((player, i) => i === index ? value : player));
  }

  function addPlayer() {
    setPlayers((current) => [...current, ""]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || players.filter((player) => player.trim()).length < 2) return;
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
            <p className="mt-2 text-gray-400">{players.filter((player) => player.trim()).length} deltagere</p>
            <div className="mt-6">
              <div className="mb-3 text-sm font-bold text-gray-300">Vælg turneringsformat</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { id: "pools", title: "Puljer", text: "Fordel spillerne i puljer." },
                  { id: "roundRobin", title: "Alle mod alle", text: "Alle møder alle." },
                  { id: "knockout", title: "Knockout", text: "Taberen er ude." },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFormat(option.id as "pools" | "roundRobin" | "knockout")}
                    className={`rounded-xl border p-4 text-left transition ${format === option.id ? "border-orange-500 bg-orange-500/10" : "border-gray-700 bg-gray-950 hover:border-orange-500"}`}
                  >
                    <div className="font-black">{option.title}</div>
                    <div className="mt-1 text-xs leading-5 text-gray-400">{option.text}</div>
                  </button>
                ))}
              </div>
              <button type="button" disabled={!format} className="mt-5 w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 disabled:cursor-not-allowed disabled:opacity-40">
                Fortsæt
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-gray-300">Turneringsnavn</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Fx Fredagsdart"
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-base outline-none focus:border-orange-500"
              />
            </label>

            <div>
              <div className="mb-3 text-sm font-bold text-gray-300">Deltagere</div>
              <div className="space-y-3">
                {players.map((player, index) => (
                  <input
                    key={index}
                    value={player}
                    onChange={(event) => updatePlayer(index, event.target.value)}
                    placeholder={`Spiller ${index + 1}`}
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-base outline-none focus:border-orange-500"
                  />
                ))}
              </div>
              <button type="button" onClick={addPlayer} className="mt-3 rounded-xl border border-gray-700 px-4 py-3 font-bold text-gray-300 hover:border-orange-500">
                + Tilføj spiller
              </button>
            </div>

            <button
              type="submit"
              disabled={!name.trim() || players.filter((player) => player.trim()).length < 2}
              className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Fortsæt
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
