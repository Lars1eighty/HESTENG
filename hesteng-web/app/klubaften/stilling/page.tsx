"use client";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useClub } from "@/context/ClubContext";
import { useKlubaften } from "@/context/KlubaftenContext";
import { calculatePoolStandings } from "@/lib/standingsEngine";
import { createPlacementPools } from "@/lib/placementPoolEngine";
import { createClubNightMatches } from "@/lib/matchEngine";
import { normalizeName } from "@/lib/playerIdentity";

export default function StillingPage() {
  const params = useParams<{ clubNightId?: string }>();
  const routeClubNightId = typeof params.clubNightId === "string" ? params.clubNightId : null;
  const { currentClub } = useClub();
  const { currentClubId, pools, matches, setPools, setMatches, currentClubNightId, currentClubNight, setCurrentClubNightId } = useKlubaften();
  const clubNightId = routeClubNightId ?? currentClubNightId;
  const [placementPreview, setPlacementPreview] = useState(false);
  const isTjoerring = normalizeName(currentClub.name) === normalizeName("Tjørring Dart");
  const placementStage = useMemo(() => createPlacementPools(pools, matches), [pools, matches]);

  useEffect(() => { if (routeClubNightId) setCurrentClubNightId(routeClubNightId); }, [routeClubNightId, setCurrentClubNightId]);

  function startPlacementPools() {
    if (!placementStage.complete || !clubNightId || !currentClubNight) return;
    const bestOfLegs = matches[0]?.bestOfLegs ?? (isTjoerring ? 1 : 5);
    const roundTwoMatches = createClubNightMatches(placementStage.pools, currentClubNight.boardCount, clubNightId, currentClubId, bestOfLegs, currentClubNight.handicapBoards, "stage-2");
    setPools(placementStage.pools);
    setMatches(roundTwoMatches);
    setPlacementPreview(false);
  }

  if (pools.length === 0) return <main className="min-h-screen bg-gray-950 text-white"><Header /><section className="mx-auto max-w-5xl p-10"><BackButton /><h1 className="mb-8 text-4xl font-bold">🏆 Puljestilling</h1><div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">Opret først puljerne.</div></section></main>;

  return (
    <main className="min-h-screen bg-gray-950 text-white"><Header /><section className="mx-auto max-w-6xl p-10"><BackButton />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-bold">🏆 Puljestilling</h1><p className="mt-2 text-gray-400">Live rangering baseret på afsluttede kampe.</p></div><Link href={clubNightId ? `/klubaften/${clubNightId}/live` : "/klubaften/live"} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold hover:bg-orange-600">🔴 Live scoring</Link></div>

      {isTjoerring ? <section className="mb-8 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-black">Runde 2 · nye puljer efter placering</h2><p className="mt-1 text-sm text-gray-400">1&apos;erne går i Pulje A, 2&apos;erne i B, 3&apos;erne i C og 4&apos;erne i D.</p></div>{placementStage.complete ? <button type="button" onClick={() => setPlacementPreview((value) => !value)} className="rounded-xl bg-orange-500 px-5 py-3 font-bold hover:bg-orange-600">{placementPreview ? "Skjul forslag" : "Lav runde 2"}</button> : <div className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-gray-400">{placementStage.missingMatches} kampe mangler</div>}</div>
        {placementPreview && placementStage.complete ? <div className="mt-6"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{placementStage.pools.map((pool) => <div key={pool.name} className="rounded-xl border border-gray-800 bg-gray-950 p-4"><div className="font-black text-orange-400">{pool.name}</div><div className="mt-3 space-y-2">{pool.players.map((player) => <div key={player} className="font-semibold">{player}</div>)}</div></div>)}</div><button type="button" onClick={startPlacementPools} className="mt-5 w-full rounded-xl bg-green-600 py-3 text-lg font-black hover:bg-green-700">Start runde 2 med disse puljer</button><p className="mt-2 text-center text-xs text-gray-500">Runde 2-kampene oprettes med det samme og får egne kamp-ID&apos;er.</p></div> : null}
      </section> : null}

      <div className="space-y-8">{pools.map((pool) => { const standings = calculatePoolStandings(pool.name, pool.players, matches); return <section key={pool.name} className="rounded-2xl border border-gray-800 bg-gray-900 p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold">{pool.name}</h2><span className="text-sm text-gray-500">{pool.players.length} spillere</span></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-gray-500"><tr><th className="pb-3 pr-4">#</th><th className="pb-3 pr-4">Spiller</th><th className="pb-3 pr-4 text-center">K</th><th className="pb-3 pr-4 text-center">V</th><th className="pb-3 pr-4 text-center">T</th><th className="pb-3 pr-4 text-center">LF</th><th className="pb-3 pr-4 text-center">LI</th><th className="pb-3 pr-4 text-center">+/-</th><th className="pb-3 text-center">Point</th></tr></thead><tbody>{standings.map((standing, index) => <tr key={standing.player} className="border-t border-gray-800"><td className="py-3 pr-4 font-bold">{index + 1}</td><td className="py-3 pr-4 font-semibold">{standing.player}</td><td className="py-3 pr-4 text-center">{standing.played}</td><td className="py-3 pr-4 text-center text-green-400">{standing.wins}</td><td className="py-3 pr-4 text-center text-red-400">{standing.losses}</td><td className="py-3 pr-4 text-center">{standing.legsFor}</td><td className="py-3 pr-4 text-center">{standing.legsAgainst}</td><td className="py-3 pr-4 text-center">{standing.legsFor - standing.legsAgainst}</td><td className="py-3 text-center font-bold">{standing.points}</td></tr>)}</tbody></table></div></section>; })}</div>
    </section></main>
  );
}
