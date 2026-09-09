"use client";

import { useEffect, useMemo, useState } from "react";

import type { ClubNight } from "@/context/KlubaftenContext";
import type { CompletedMatch } from "@/lib/matchStore";
import {
  getPublicClubNightAccess,
  publishGuestClubNight,
  syncPublicClubNight,
  type PublicClubNightAccess,
} from "@/lib/publicClubNightClient";

type Props = {
  clubNight: ClubNight;
  completedMatches: CompletedMatch[];
};

export default function GuestAccessControl({ clubNight, completedMatches }: Props) {
  const [access, setAccess] = useState<PublicClubNightAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const publicUrl = useMemo(() => {
    if (!access || typeof window === "undefined") return "";
    return `${window.location.origin}/g/${access.publicToken}`;
  }, [access]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const existing = await getPublicClubNightAccess(clubNight.id);
        if (!cancelled) setAccess(existing);
      } catch {
        // Guest access is optional; the rest of the club-night dashboard stays usable.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [clubNight.id]);

  useEffect(() => {
    if (!access || !clubNight.clubId) return;

    const timer = window.setTimeout(() => {
      void syncPublicClubNight({
        clubNightId: clubNight.id,
        clubId: clubNight.clubId as string,
        status: clubNight.status,
        clubNight,
        completedMatches,
      }).catch(() => undefined);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [access, clubNight, completedMatches]);

  async function enableGuestAccess() {
    if (!clubNight.clubId) {
      setError("Klubaftenen mangler klubtilknytning.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const next = await publishGuestClubNight({
        clubNightId: clubNight.id,
        clubId: clubNight.clubId,
        status: clubNight.status,
        clubNight,
        completedMatches,
      });
      setAccess(next);
    } catch {
      setError("Gæsteadgang kunne ikke aktiveres.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Linket kunne ikke kopieres.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!access ? (
        <button
          type="button"
          onClick={() => void enableGuestAccess()}
          disabled={busy || clubNight.status !== "active"}
          className="rounded-xl border border-cyan-500/60 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          title={error || "Opret offentligt link til denne klubaften"}
        >
          {busy ? "Opretter gæsteadgang..." : "Aktivér gæsteadgang"}
        </button>
      ) : (
        <>
          <a
            href={`/g/${access.publicToken}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-cyan-500/60 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/20"
          >
            Åbn gæsteside
          </a>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-xl border border-gray-700 px-4 py-3 text-sm font-black text-gray-300 transition hover:border-cyan-500/70 hover:text-cyan-200"
            title={publicUrl}
          >
            {copied ? "Link kopieret" : "Kopiér gæstelink"}
          </button>
        </>
      )}
      {error && <span className="text-sm font-semibold text-red-300">{error}</span>}
    </div>
  );
}
