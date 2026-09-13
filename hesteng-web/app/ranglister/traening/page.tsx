"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import { trainingExercises } from "@/data/trainingExercises";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";

type Scope = "global" | "club";
type Row = { place: number; playerName: string; value: number; isCurrentPlayer: boolean };
type Payload = { exerciseName: string; valueLabel: string; rows: Row[] };

export default function TrainingRankingsPage() {
  const current = useOptionalCurrentUser();
  const [exerciseId, setExerciseId] = useState(trainingExercises[0]?.id ?? "jdc-challenge");
  const [scope, setScope] = useState<Scope>("global");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const hasClub = Boolean(current?.currentUser.memberships[0]?.clubId);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/training-rankings?exerciseId=${encodeURIComponent(exerciseId)}&scope=${scope}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Ranking request failed");
        return response.json() as Promise<Payload>;
      })
      .then((payload) => { if (active) setData(payload); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [exerciseId, scope]);

  return <main className="min-h-screen bg-gray-950 text-white"><Header/><section className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8"><BackButton/><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[.22em] text-orange-400">HESTENG Training</div><h1 className="mt-1 text-3xl font-black sm:text-4xl">Træningsrangliste</h1><p className="mt-2 text-gray-400">Bedste registrerede resultat pr. spiller.</p></div><Link href="/traening" className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-bold">Til træning</Link></div>
  <div className="mb-4 grid gap-3 rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:grid-cols-[1fr_auto]"><label className="text-sm font-bold text-gray-300">Øvelse<select value={exerciseId} onChange={e=>setExerciseId(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-3 text-white">{trainingExercises.filter(x=>x.isActive).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><div className="flex items-end gap-2"><button onClick={()=>setScope("global")} className={`rounded-xl px-4 py-3 text-sm font-black ${scope==="global"?"bg-orange-500 text-gray-950":"bg-gray-950 text-gray-300"}`}>Alle</button><button disabled={!hasClub} onClick={()=>setScope("club")} className={`rounded-xl px-4 py-3 text-sm font-black disabled:opacity-40 ${scope==="club"?"bg-orange-500 text-gray-950":"bg-gray-950 text-gray-300"}`}>Min klub</button></div></div>
  <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900"><div className="flex items-center justify-between border-b border-gray-800 px-4 py-4"><div><h2 className="text-xl font-black">{data?.exerciseName ?? "Rangliste"}</h2><p className="text-sm text-gray-500">{scope==="global"?"Alle HESTENG-spillere":"Din klub"}</p></div><span className="text-sm font-bold text-gray-400">{data?.valueLabel ?? "Score"}</span></div>{loading?<div className="p-8 text-center text-gray-500">Henter rangliste…</div>:data?.rows.length?<div className="divide-y divide-gray-800">{data.rows.map(row=><div key={`${row.place}-${row.playerName}`} className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 px-4 py-3 ${row.isCurrentPlayer?"bg-orange-500/10":""}`}><div className={`flex h-8 w-8 items-center justify-center rounded-lg font-black ${row.place===1?"bg-yellow-400 text-gray-950":row.place===2?"bg-slate-300 text-gray-950":row.place===3?"bg-amber-700":"bg-gray-800 text-gray-400"}`}>{row.place}</div><div className="truncate font-bold">{row.playerName}{row.isCurrentPlayer?<span className="ml-2 text-xs text-orange-400">DIG</span>:null}</div><div className="text-xl font-black tabular-nums text-orange-400">{format(row.value)}</div></div>)}</div>:<div className="p-8 text-center text-gray-500">Ingen resultater endnu.</div>}</section></section></main>;
}

function format(value:number){return Number.isInteger(value)?String(value):value.toFixed(1)}
