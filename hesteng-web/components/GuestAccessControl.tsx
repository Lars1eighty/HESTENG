"use client";

import { useEffect, useMemo, useState } from "react";

import { useKlubaften, type ClubNight } from "@/context/KlubaftenContext";
import { adaptGuestCompletedMatch } from "@/lib/guestCompletedMatchAdapter";
import { saveCompletedMatch, type CompletedMatch } from "@/lib/matchStore";
import {
  getGuestCompletedMatches,
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
  const { updateClubNight } = useKlubaften();
  const [access, setAccess] = useState<PublicClubNightAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");

  const publicUrl = useMemo(() => {
    if (!access || typeof window === "undefined") return "";
    return `${window.location.origin}/g/${access.publicToken}`;
  }, [access]);

  const qrUrl = useMemo(
    () => publicUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(publicUrl)}`
      : "",
    [publicUrl],
  );

  const publicClubNight = useMemo(() => {
    const activeIds = new Set(clubNight.matches.map((match) => match.id));
    const historicalMatches = completedMatches
      .filter((match) => !activeIds.has(match.id))
      .map((match) => ({
        id: match.id,
        clubId: match.clubId,
        clubNightId: match.clubNightId,
        pool: match.pool ?? "",
        round: match.round ?? 0,
        order: 0,
        scheduleSlot: 0,
        player1: match.player1,
        player1Id: match.player1Id,
        player2: match.player2,
        player2Id: match.player2Id,
        board: match.board ?? 0,
        bestOfLegs: match.bestOfLegs,
        score1: match.score1,
        score2: match.score2,
        status: "finished" as const,
        winner: match.winner,
      }));

    return {
      ...clubNight,
      matches: [...clubNight.matches, ...historicalMatches],
    };
  }, [clubNight, completedMatches]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const existing = await getPublicClubNightAccess(clubNight.id);
        if (!cancelled) setAccess(existing);
      } catch {}
    }
    void load();
    return () => { cancelled = true; };
  }, [clubNight.id]);

  useEffect(() => {
    if (!access || !clubNight.clubId) return;
    const timer = window.setTimeout(() => {
      void syncPublicClubNight({
        clubNightId: clubNight.id,
        clubId: clubNight.clubId as string,
        status: clubNight.status,
        clubNight: publicClubNight,
        completedMatches,
      }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [access, clubNight.clubId, clubNight.id, clubNight.status, completedMatches, publicClubNight]);

  async function enableGuestAccess() {
    if (!clubNight.clubId) {
      setError("Klubaftenen mangler klubtilknytning.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setAccess(await publishGuestClubNight({
        clubNightId: clubNight.id,
        clubId: clubNight.clubId,
        status: clubNight.status,
        clubNight: publicClubNight,
        completedMatches,
      }));
    } catch {
      setError("Gæsteadgang kunne ikke aktiveres.");
    } finally {
      setBusy(false);
    }
  }

  async function importGuestResults() {
    if (!access || !clubNight.clubId) return;
    setBusy(true);
    setError("");
    setImportMessage("");
    try {
      const guestResults = await getGuestCompletedMatches(access.publicToken);
      const matchesById = new Map(clubNight.matches.map((match) => [match.id, match]));
      const existingIds = new Set(completedMatches.map((match) => match.id));
      const importedMatches: CompletedMatch[] = [];

      for (const value of guestResults) {
        if (!value || typeof value !== "object") continue;
        const id = (value as { id?: unknown }).id;
        if (typeof id !== "string" || existingIds.has(id)) continue;
        const authoritativeMatch = matchesById.get(id);
        if (!authoritativeMatch) continue;
        const completed = adaptGuestCompletedMatch(value, authoritativeMatch, clubNight.clubId, clubNight.id);
        if (!completed) continue;
        saveCompletedMatch(completed);
        existingIds.add(id);
        importedMatches.push(completed);
      }

      if (importedMatches.length > 0) {
        const importedById = new Map(importedMatches.map((match) => [match.id, match]));
        updateClubNight(clubNight.id, (night) => ({
          ...night,
          matches: night.matches.map((match) => {
            const completed = importedById.get(match.id);
            if (!completed) return match;
            return {
              ...match,
              score1: completed.score1,
              score2: completed.score2,
              winner: completed.winner,
              loser: completed.winner === match.player1 ? match.player2 : match.player1,
              status: "finished" as const,
              finishedAt: completed.finishedAt,
              completedAt: completed.completedAt ?? completed.finishedAt,
              timingSource: completed.timingSource,
            };
          }),
        }));
      }

      const imported = importedMatches.length;
      setImportMessage(imported > 0 ? `${imported} gæsteresultat${imported === 1 ? "" : "er"} hentet.` : "Ingen nye gæsteresultater.");
    } catch {
      setError("Gæsteresultater kunne ikke hentes.");
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
    <div>
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
            <a href={`/g/${access.publicToken}`} target="_blank" rel="noreferrer" className="rounded-xl border border-cyan-500/60 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/20">Åbn gæsteside</a>
            <button type="button" onClick={() => void copyLink()} className="rounded-xl border border-gray-700 px-4 py-3 text-sm font-black text-gray-300 transition hover:border-cyan-500/70 hover:text-cyan-200" title={publicUrl}>{copied ? "Link kopieret" : "Kopiér gæstelink"}</button>
            <button type="button" onClick={() => void importGuestResults()} disabled={busy} className="rounded-xl border border-orange-500/60 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-200 transition hover:border-orange-400 hover:bg-orange-500/20 disabled:opacity-50">{busy ? "Henter..." : "Hent gæsteresultater"}</button>
          </>
        )}
        {error && <span className="text-sm font-semibold text-red-300">{error}</span>}
        {importMessage && <span className="text-sm font-semibold text-green-300">{importMessage}</span>}
      </div>

      {access && qrUrl ? (
        <div className="mt-5 flex flex-wrap items-center gap-5 rounded-2xl border border-gray-800 bg-gray-950 p-5">
          <img src={qrUrl} alt="QR-kode til aftenens gæsteside" width={180} height={180} className="rounded-xl bg-white p-2" />
          <div className="max-w-sm">
            <div className="text-lg font-black text-white">Scan og spil</div>
            <p className="mt-1 text-sm text-gray-400">Spillerne scanner denne kode på mobilen og kommer direkte ind på denne klubaften.</p>
            <div className="mt-3 break-all text-xs text-cyan-300">{publicUrl}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
