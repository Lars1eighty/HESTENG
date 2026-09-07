"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function CreateAccountPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Navn skal udfyldes.");
      return;
    }

    if (!normalizedEmail) {
      setError("E-mail skal udfyldes.");
      return;
    }

    if (password.length < 10) {
      setError("Adgangskoden skal være mindst 10 tegn.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Adgangskoderne skal være ens.");
      return;
    }

    if (!acceptTerms) {
      setError("Du skal acceptere Vilkår og Privatlivspolitik.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: trimmedName,
        email: normalizedEmail,
        password,
        acceptTerms,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(typeof result.error === "string" ? result.error : "Kontoen kunne ikke oprettes.");
      setIsSubmitting(false);
      return;
    }

    setSuccess(typeof result.message === "string" ? result.message : "Din konto er oprettet. Vi har sendt en bekræftelsesmail til dig.");
    setPassword("");
    setConfirmPassword("");
    setIsSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link href="/">
            <div className="text-3xl font-black text-orange-500">HESTENG</div>
            <div className="text-sm font-semibold text-gray-400">Measure. Improve. Compete.</div>
          </Link>
          <Link href="/login" className="rounded-full border border-gray-700 px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-orange-500 hover:text-orange-300">
            Log ind
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-14">
          <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl shadow-black/30 sm:p-8">
            <div className="text-sm font-black uppercase tracking-[0.32em] text-orange-400">Opret konto</div>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Kom i gang med HESTENG</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Opret din personlige HESTENG-konto. Du kan tilknyttes klub senere.
            </p>

            {success ? (
              <div className="mt-7 rounded-2xl border border-emerald-900 bg-emerald-950/40 p-5 text-sm font-semibold leading-6 text-emerald-200">
                {success}
              </div>
            ) : (
              <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                <Field label="Navn" type="text" autoComplete="name" value={name} onChange={setName} />
                <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} />
                <Field label="Adgangskode" type="password" autoComplete="new-password" value={password} onChange={setPassword} />
                <Field label="Gentag adgangskode" type="password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-800 bg-gray-950 p-3 text-sm font-semibold leading-6 text-gray-400">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-700 bg-gray-950 accent-orange-500"
                  />
                  <span>
                    Jeg accepterer{" "}
                    <Link href="/vilkaar" className="font-bold text-orange-400 hover:text-orange-300">
                      Vilkår
                    </Link>{" "}
                    og{" "}
                    <Link href="/privatliv" className="font-bold text-orange-400 hover:text-orange-300">
                      Privatlivspolitik
                    </Link>
                  </span>
                </label>

                {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Opretter..." : "Opret konto"}
                </button>
              </form>
            )}

            <div className="mt-6 border-t border-gray-800 pt-5 text-center text-sm text-gray-500">
              Har du allerede en konto?{" "}
              <Link href="/login" className="font-bold text-orange-400 hover:text-orange-300">
                Log ind
              </Link>
            </div>
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
