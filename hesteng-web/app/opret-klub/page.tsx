"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function OpretKlubPage() {
  const router = useRouter();
  const { status } = useSession();
  const [clubName, setClubName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAuthenticated = status === "authenticated";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = clubName.trim();

    if (!name) {
      setError("Klubnavn skal udfyldes.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/clubs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "Klubben kunne ikke oprettes.");
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <PublicAuthShell
      eyebrow="Opret klub"
      title="Start din klub på HESTENG"
      description={isAuthenticated
        ? "Opret klubben og bliv automatisk administrator."
        : "Log ind med Google for at oprette en klub."}
      footer={(
        <>
          Har du allerede adgang?{" "}
          <Link href="/login" className="font-bold text-orange-400 hover:text-orange-300">
            Log ind
          </Link>
        </>
      )}
    >
      {isAuthenticated ? (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field
            label="Klubnavn"
            type="text"
            autoComplete="organization"
            value={clubName}
            onChange={setClubName}
          />
          {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Opretter..." : "Opret klub"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/opret-klub" })}
            className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 transition hover:bg-orange-400"
          >
            Log ind med Google
          </button>
          <p className="text-center text-xs leading-5 text-gray-500">
            Klubben oprettes først efter login, så administratoren knyttes sikkert til din bruger.
          </p>
        </div>
      )}
    </PublicAuthShell>
  );
}

function PublicAuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link href="/">
            <div className="text-3xl font-black text-orange-500">HESTENG</div>
            <div className="text-sm font-semibold text-gray-400">Measure. Improve. Compete.</div>
          </Link>
          <Link href="/" className="rounded-full border border-gray-700 px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-orange-500 hover:text-orange-300">
            Forside
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-14">
          <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl shadow-black/30 sm:p-8">
            <div className="text-sm font-black uppercase tracking-[0.32em] text-orange-400">{eyebrow}</div>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">{description}</p>
            <div className="mt-7">{children}</div>
            <div className="mt-6 border-t border-gray-800 pt-5 text-center text-sm text-gray-500">{footer}</div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  type,
  autoComplete,
  value,
  onChange,
}: {
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-300">{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-700 focus:border-orange-500"
      />
    </label>
  );
}
