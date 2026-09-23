"use client";

import { FormEvent, useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import MatchScorer from "@/components/MatchScorer";
import type { CompletedMatch } from "@/lib/matchStore";

type CompetitionFormat = "pools" | "roundRobin" | "knockout";
type StartingScore = 301 | 501;
type BestOfLegs = 1 | 3 | 5 | 7 | 9;

type GeneratedMatch = { id: string; player1: string; player2: string; round?: string };
type GeneratedPool = { name: string; players: string[] };

export default function PrivateCompetitionPage() {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState(["", ""]);
  const [created, setCreated] = useState(false);
  const [format, setFormat] = useState<CompetitionFormat | null>(null);
  const [matchSetupOpen, setMatchSetupOpen] = useState(false);
  const [startingScore, setStartingScore] = useState<StartingScore>(501);
  const [bestOfLegs, setBestOfLegs] = useState<BestOfLegs>(3);
  const [generatedMatches, setGeneratedMatches] = useState<GeneratedMatch[] | null>(null);
  const [generatedPools, setGeneratedPools] = useState<GeneratedPool[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [completedMatches, setCompletedMatches] = useState<Record<string, CompletedMatch>>({});

  const activePlayers = players.map((player) => player.trim()).filter(Boolean);

  function getPoolStandings(pool: GeneratedPool) {
    return pool.players
      .map((player) => {
        let played = 0, wins = 0, losses = 0, legsFor = 0, legsAgainst = 0;
        generatedMatches?.filter((match) => match.round === pool.name && (match.player1 === player || match.player2 === player)).forEach((match) => {
          const result = completedMatches[match.id];
          if (!result) return;
          played += 1;
          const isPlayer1 = match.player1 === player;
          legsFor += isPlayer1 ? result.score1 : result.score2;
          legsAgainst += isPlayer1 ? result.score2 : result.score1;
          if (result.winner === player) wins += 1;
          else losses += 1;
        });
        return { player, played, wins, losses, legsFor, legsAgainst, legDiff: legsFor - legsAgainst };
      })
      .sort((a, b) => b.wins - a.wins || b.legDiff - a.legDiff || b.legsFor - a.legsFor || a.player.localeCompare(b.player));
  }

  function updatePlayer(index: number, value: string) {
    setPlayers((current) => current.map((player, i) => (i === index ? value : player)));
  }

  function addPlayer() {
    setPlayers((current) => [...current, ""]);
  }

  function generateCompetition() {
    if (!format) return;
    const matches: GeneratedMatch[] = [];
    const pools: GeneratedPool[] = [];

    if (format === "pools") {
      const poolCount = Math.max(1, Math.ceil(activePlayers.length / 5));
      for (let i = 0; i < poolCount; i += 1) {
        pools.push({ name: `Pulje ${String.fromCharCode(65 + i)}`, players: [] });
      }
      activePlayers.forEach((player, index) => pools[index % poolCount].players.push(player));
      pools.forEach((pool, poolIndex) => {
        for (let i = 0; i < pool.players.length; i += 1) {
          for (let j = i + 1; j < pool.players.length; j += 1) {
            matches.push({ id: `pool-${poolIndex}-match-${i}-${j}`, player1: pool.players[i], player2: pool.players[j], round: pool.name });
          }
        }
      });
    } else if (format === "roundRobin") {
      for (let i = 0; i < activePlayers.length; i += 1) {
        for (let j = i + 1; j < activePlayers.length; j += 1) {
          matches.push({ id: `match-${i}-${j}`, player1: activePlayers[i], player2: activePlayers[j] });
        }
      }
    } else {
      for (let i = 0; i < activePlayers.length; i += 2) {
        matches.push({ id: `match-${i}`, player1: activePlayers[i], player2: activePlayers[i + 1] ?? "BYE", round: "1. runde" });
      }
    }
    setGeneratedPools(pools);
    setGeneratedMatches(matches);
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

        {generatedMatches && activeMatchId ? (() => {
          const match = generatedMatches.find((item) => item.id === activeMatchId);
          if (!match || match.player2 === "BYE") return null;
          return (
            <div className="mt-8">
              <button type="button" onClick={() => setActiveMatchId(null)} className="mb-4 rounded-xl border border-gray-700 px-4 py-2 font-bold text-gray-300">
                ← Tilbage til turnering
              </button>
              <MatchScorer
                matchId={match.id}
                player1={match.player1}
                player2={match.player2}
                bestOfLegs={bestOfLegs}
                onMatchComplete={(completedMatch) => {
                  setCompletedMatches((current) => ({ ...current, [match.id]: completedMatch }));
                  setActiveMatchId(null);
                }}
              />
            </div>
          );
        })() : generatedMatches ? (
          <div className="mt-8 rounded-2xl border border-orange-500/40 bg-gray-900 p-6">
            <div className="text-sm font-black uppercase tracking-widest text-orange-400">Turnering oprettet</div>
            <h2 className="mt-2 text-3xl font-black">{name.trim()}</h2>
            <p className="mt-2 text-gray-400">{activePlayers.length} deltagere · {startingScore} · Best of {bestOfLegs}</p>
            {generatedPools.length > 0 && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {generatedPools.map((pool) => (
                  <div key={pool.name} className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                    <div className="font-black text-orange-400">{pool.name}</div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-gray-500">
                          <tr><th className="pb-2">#</th><th className="pb-2">Spiller</th><th className="pb-2 text-center">K</th><th className="pb-2 text-center">V</th><th className="pb-2 text-center">T</th><th className="pb-2 text-center">Legs</th><th className="pb-2 text-center">+/-</th></tr>
                        </thead>
                        <tbody>
                          {getPoolStandings(pool).map((row, index) => (
                            <tr key={row.player} className="border-t border-gray-900">
                              <td className="py-2 font-black text-gray-500">{index + 1}</td>
                              <td className="py-2 font-bold text-gray-200">{row.player}</td>
                              <td className="py-2 text-center">{row.played}</td>
                              <td className="py-2 text-center">{row.wins}</td>
                              <td className="py-2 text-center">{row.losses}</td>
                              <td className="py-2 text-center">{row.legsFor}–{row.legsAgainst}</td>
                              <td className="py-2 text-center font-bold">{row.legDiff > 0 ? "+" : ""}{row.legDiff}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 space-y-2">
              {generatedMatches.map((match, index) => (
                <div key={match.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-950 px-4 py-3">
                  <div><span className="mr-3 text-xs font-black text-gray-600">{index + 1}</span><span className="font-bold">{match.player1}</span><span className="mx-2 text-gray-600">vs</span><span className="font-bold">{match.player2}</span></div>
                  <div className="flex items-center gap-2">
                    {match.round && <span className="text-xs font-bold text-gray-500">{match.round}</span>}
                    {match.player2 === "BYE" ? (
                      <span className="text-xs font-black text-gray-500">BYE</span>
                    ) : completedMatches[match.id] ? (
                      <div className="text-right">
                        <div className="font-black text-green-400">{completedMatches[match.id].score1}–{completedMatches[match.id].score2}</div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">{completedMatches[match.id].winner} vandt</div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setActiveMatchId(match.id)} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-black text-gray-950">Spil</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : created ? (
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
