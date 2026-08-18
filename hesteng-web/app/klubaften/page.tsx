"use client";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useKlubaften, type ClubNight } from "@/context/KlubaftenContext";

function formatDate(date: string) {
  return date || "-";
}

function statusLabel(status: ClubNight["status"]) {
  if (status === "finished") return "Afsluttet";
  if (status === "aborted") return "Afbrudt";
  return "Aktiv";
}

export default function KlubaftenPage() {
  const { activeClubNights, archivedClubNights, setCurrentClubNightId } = useKlubaften();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-7xl p-10">
        <BackButton />

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Klubaften</h1>
            <p className="mt-2 text-gray-400">Åbn en aktiv klubaften, start en ny eller find tidligere aftener i arkivet.</p>
          </div>
          <Link href="/klubaften/ny" className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-black hover:bg-orange-400">
            Start klubaften
          </Link>
        </div>

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Aktive klubaftner</h2>
            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm font-semibold text-orange-300">{activeClubNights.length} aktive</span>
          </div>
          {activeClubNights.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeClubNights.map((clubNight) => {
                const finished = clubNight.matches.filter((match) => match.status === "finished").length;
                const live = clubNight.matches.filter((match) => match.status === "live").length;
                const pending = clubNight.matches.filter((match) => match.status === "pending").length;
                return (
                  <Link
                    key={clubNight.id}
                    href={`/klubaften/${clubNight.id}`}
                    onClick={() => setCurrentClubNightId(clubNight.id)}
                    className="rounded-2xl border border-gray-800 bg-gray-900 p-6 transition hover:border-orange-500 hover:bg-gray-800"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold">{clubNight.name}</h3>
                        <p className="mt-1 text-sm text-gray-400">{formatDate(clubNight.date)} · {clubNight.selectedPlayers.length} spillere</p>
                      </div>
                      <span className="rounded-full border border-green-700 bg-green-500/10 px-3 py-1 text-xs font-bold uppercase text-green-300">
                        {statusLabel(clubNight.status)}
                      </span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl bg-gray-950 p-3"><div className="text-2xl font-black text-green-400">{finished}</div><div className="text-xs text-gray-500">Færdige</div></div>
                      <div className="rounded-xl bg-gray-950 p-3"><div className="text-2xl font-black text-orange-400">{live}</div><div className="text-xs text-gray-500">I gang</div></div>
                      <div className="rounded-xl bg-gray-950 p-3"><div className="text-2xl font-black text-gray-300">{pending}</div><div className="text-xs text-gray-500">Mangler</div></div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
              Ingen aktive klubaftner lige nu.
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Arkiv</h2>
            <span className="rounded-full bg-gray-800 px-3 py-1 text-sm font-semibold text-gray-300">{archivedClubNights.length} arkiverede</span>
          </div>
          {archivedClubNights.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {archivedClubNights.map((clubNight) => (
                <Link
                  key={clubNight.id}
                  href={`/klubaften/${clubNight.id}`}
                  onClick={() => setCurrentClubNightId(clubNight.id)}
                  className="rounded-2xl border border-gray-800 bg-gray-900 p-6 transition hover:border-gray-600 hover:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold">{clubNight.name}</h3>
                      <p className="mt-1 text-sm text-gray-400">{formatDate(clubNight.date)} · {clubNight.selectedPlayers.length} spillere</p>
                    </div>
                    <span className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs font-bold uppercase text-gray-300">
                      {statusLabel(clubNight.status)}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">{clubNight.matches.filter((match) => match.status === "finished").length} færdige kampe gemt</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
              Arkivet er tomt.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
