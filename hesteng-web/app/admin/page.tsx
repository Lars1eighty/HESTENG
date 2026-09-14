"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useClub } from "@/context/ClubContext";
import { resetTestDataToBaseline, type ResetTestDataResult } from "@/lib/testDataReset";

type AdminUserOverview = {
  totalUsers: number;
  recentUsers: Array<{
    id: string;
    username: string | null;
    createdAt: string;
  }>;
};

export default function AdminPage() {
  const { currentClub } = useClub();
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ResetTestDataResult | null>(null);
  const [userOverview, setUserOverview] = useState<AdminUserOverview | null>(null);
  const [userOverviewError, setUserOverviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUserOverview() {
      try {
        const response = await fetch("/api/admin/users", { cache: "no-store" });
        const body = await response.json().catch(() => null) as AdminUserOverview | { error?: string } | null;

        if (!response.ok) {
          throw new Error(body && "error" in body && body.error ? body.error : "Kunne ikke hente brugere.");
        }

        if (!cancelled) {
          setUserOverview(body as AdminUserOverview);
          setUserOverviewError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setUserOverviewError(error instanceof Error ? error.message : "Kunne ikke hente brugere.");
        }
      }
    }

    void loadUserOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleResetTestData() {
    setMessage(null);
    setLastResult(null);

    if (!window.confirm("Reset testdata?")) return;
    if (!window.confirm("Er du sikker? Alle HESTENG-testkampe og testresultater slettes.")) return;

    setIsResetting(true);
    try {
      const result = await resetTestDataToBaseline(currentClub.id);
      setLastResult(result);
      setMessage("Testdata nulstillet til baseline.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset testdata fejlede.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-8 text-neutral-100 sm:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300">Dev / admin</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">Administration</h1>
            <p className="mt-2 text-sm text-neutral-400">{currentClub.name}</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-neutral-200 transition hover:border-orange-300 hover:text-orange-200"
          >
            Til forsiden
          </Link>
        </header>

        <section className="rounded-2xl border border-orange-500/25 bg-neutral-900/70 p-5 shadow-2xl shadow-black/30">
          <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">HESTENG brugere</p>
              <h2 className="mt-2 text-xl font-black uppercase">Nye tilmeldinger</h2>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">I alt</p>
              <p className="mt-1 text-3xl font-black text-white">{userOverview?.totalUsers ?? "–"}</p>
            </div>
          </div>

          {userOverviewError ? (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm font-bold text-red-200">
              {userOverviewError}
            </p>
          ) : !userOverview ? (
            <p className="mt-4 text-sm font-semibold text-neutral-500">Henter brugere…</p>
          ) : userOverview.recentUsers.length === 0 ? (
            <p className="mt-4 text-sm font-semibold text-neutral-500">Ingen registrerede brugere endnu.</p>
          ) : (
            <div className="mt-4 divide-y divide-white/10">
              {userOverview.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-black text-neutral-100">{user.username ? `@${user.username}` : "Ny spiller"}</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-500">{user.username ? "Offentligt brugernavn" : "Intet offentligt brugernavn endnu"}</p>
                  </div>
                  <time className="shrink-0 text-sm font-bold text-neutral-400" dateTime={user.createdAt}>
                    {formatCreatedAt(user.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">Destruktiv handling</p>
              <h2 className="mt-2 text-xl font-black uppercase">Reset testdata</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">
                Fjerner HESTENG-testklubaftner, kampresultater, ELO-events fra testkampe og Live Aktiv-snapshots efter baseline.
                Seed-data, officielle spillere og historiske ranglister bevares.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetTestData}
              disabled={isResetting}
              className="min-h-12 rounded-full bg-red-500 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResetting ? "Nulstiller..." : "Reset testdata"}
            </button>
          </div>

          {message && (
            <p className="mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-neutral-100">
              {message}
            </p>
          )}

          {lastResult && (
            <dl className="mt-4 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">Shared klubaftner</dt>
                <dd className="mt-1 text-xl font-black text-neutral-100">{lastResult.removedSharedClubNights}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">Shared resultater</dt>
                <dd className="mt-1 text-xl font-black text-neutral-100">{lastResult.removedSharedCompletedMatches}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">ELO seed-ratings</dt>
                <dd className="mt-1 text-xl font-black text-neutral-100">{lastResult.restoredEloRatings}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">Live Aktiv baseline</dt>
                <dd className="mt-1 text-xl font-black text-neutral-100">{lastResult.restoredLiveActiveSnapshot ? "OK" : "-"}</dd>
              </div>
            </dl>
          )}
        </section>
      </div>
    </main>
  );
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
