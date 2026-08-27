"use client";

import { useEffect } from "react";

const STORAGE_KEY = "hesteng.klubaftenState";
const STORAGE_CHANGE_EVENT = "hesteng.klubaftenChanged";
const API_URL = "/api/club-night-state";
const POLL_MS = 5000;

type SharedClubNightState = {
  clubNights?: unknown[];
  currentClubNightId?: string | null;
};

/**
 * Small server-first bootstrap for multi-device use.
 *
 * KlubaftenContext still owns the application state. This component only makes
 * sure a fresh/new browser receives the authoritative club-night snapshot from
 * the server and emits the same event KlubaftenContext already subscribes to.
 */
export default function ClubNightServerBootstrap() {
  useEffect(() => {
    let cancelled = false;

    async function pull() {
      try {
        const response = await fetch(API_URL, { cache: "no-store" });
        if (!response.ok || cancelled) return;

        const server = (await response.json()) as SharedClubNightState;
        if (cancelled || !Array.isArray(server.clubNights)) return;

        // An empty server must never wipe a browser that still has the only
        // recoverable copy of an evening. Empty-server migration is handled by
        // KlubaftenContext.
        if (server.clubNights.length === 0) return;

        const snapshot = JSON.stringify({
          clubNights: server.clubNights,
          currentClubNightId: server.currentClubNightId ?? null,
        });

        if (window.localStorage.getItem(STORAGE_KEY) === snapshot) return;

        window.localStorage.setItem(STORAGE_KEY, snapshot);
        window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
      } catch {
        // Keep the current browser usable if the shared dev server is offline.
      }
    }

    void pull();
    const interval = window.setInterval(pull, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
