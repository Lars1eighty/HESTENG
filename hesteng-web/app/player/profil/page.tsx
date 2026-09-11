"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";

type PlayerProfileResponse = {
  profile: {
    id: string;
    displayName: string;
    birthDate: string | null;
    city: string | null;
    country: string | null;
    bio: string | null;
    image: string | null;
  };
};

type ProfileForm = {
  displayName: string;
  birthDate: string;
  city: string;
  country: string;
  bio: string;
};

const emptyForm: ProfileForm = {
  displayName: "",
  birthDate: "",
  city: "",
  country: "",
  bio: "",
};

export default function PlayerProfilePage() {
  const currentUserContext = useOptionalCurrentUser();
  const [profile, setProfile] = useState<PlayerProfileResponse["profile"] | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserContext) {
      return;
    }

    let cancelled = false;

    void fetch("/api/player-profile", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? "Kunne ikke hente profilen.");
        }
        return data as PlayerProfileResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setProfile(data.profile);
        setForm(toForm(data.profile));
      })
      .catch((fetchError: unknown) => {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Kunne ikke hente profilen.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserContext]);

  const primaryMembership = currentUserContext?.currentUser.memberships[0];
  const age = useMemo(() => calculateAge(form.birthDate), [form.birthDate]);

  if (!currentUserContext) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-12 text-center sm:px-8">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Profil</div>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Log ind for at se din profil</h1>
          <div className="mt-6">
            <Link href="/login" className="inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400">
              Log ind
            </Link>
          </div>
        </section>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/player-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Kunne ikke gemme profilen.");
      }

      const nextProfile = (data as PlayerProfileResponse).profile;
      setProfile(nextProfile);
      setForm(toForm(nextProfile));
      setMessage("Profilen er gemt.");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Kunne ikke gemme profilen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ProfileImage image={profile?.image ?? null} name={form.displayName || currentUserContext.currentPlayer.name} />
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Player profil</div>
            <h1 className="mt-2 text-4xl font-black sm:text-5xl">{form.displayName || currentUserContext.currentPlayer.name}</h1>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              {primaryMembership?.clubName ?? "Ingen klub tilknyttet"}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-7">
          {loading ? (
            <p className="text-gray-400">Henter profil…</p>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Navn">
                  <input
                    value={form.displayName}
                    onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                    maxLength={80}
                    required
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                  />
                </Field>

                <Field label="Fødselsdato" hint={age !== null ? `${age} år` : undefined}>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                  />
                </Field>

                <Field label="By">
                  <input
                    value={form.city}
                    onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                    maxLength={80}
                    placeholder="Fx Herning"
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                  />
                </Field>

                <Field label="Land">
                  <input
                    value={form.country}
                    onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                    maxLength={80}
                    placeholder="Fx Danmark"
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                  />
                </Field>
              </div>

              <Field label="Kort bio" hint={`${form.bio.length}/500`}>
                <textarea
                  value={form.bio}
                  onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                  maxLength={500}
                  rows={5}
                  placeholder="Fortæl kort om dig selv som spiller."
                  className="w-full resize-none rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                />
              </Field>

              <div className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-gray-400">
                Klub styres automatisk via dit medlemskab og kan ikke ændres her.
              </div>

              {error ? <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-300">{error}</div> : null}
              {message ? <div className="rounded-xl border border-green-900/60 bg-green-950/30 px-4 py-3 text-sm font-semibold text-green-300">{message}</div> : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Gemmer…" : "Gem profil"}
                </button>
                <Link href="/player" className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-gray-300 transition hover:border-orange-500/70 hover:text-orange-300">
                  Tilbage til Mit HESTENG
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between gap-3 text-sm font-black uppercase tracking-wide text-gray-400">
        <span>{label}</span>
        {hint ? <span className="text-xs font-semibold normal-case tracking-normal text-gray-600">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function ProfileImage({ image, name }: { image: string | null; name: string }) {
  if (image) {
    return (
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-orange-500/60 bg-gray-900">
        <Image src={image} alt={name} fill sizes="96px" className="object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-orange-500/60 bg-gray-900 text-3xl font-black text-orange-300">
      {initials(name)}
    </div>
  );
}

function toForm(profile: PlayerProfileResponse["profile"]): ProfileForm {
  return {
    displayName: profile.displayName,
    birthDate: profile.birthDate ?? "",
    city: profile.city ?? "",
    country: profile.country ?? "",
    bio: profile.bio ?? "",
  };
}

function calculateAge(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const birthDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "H";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
