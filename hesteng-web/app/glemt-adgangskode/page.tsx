"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const NEUTRAL_SUCCESS_MESSAGE =
  "Hvis der findes en konto med denne e-mailadresse, sender vi et link til at nulstille adgangskoden.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("E-mail skal udfyldes.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(typeof result.error === "string" ? result.error : "Nulstillingslinket kunne ikke sendes.");
      setIsSubmitting(false);
      return;
    }

    setSuccess(typeof result.message === "string" ? result.message : NEUTRAL_SUCCESS_MESSAGE);
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
            <div className="text-sm font-black uppercase tracking-[0.32em] text-orange-400">Adgangskode</div>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Glemt adgangskode</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Indtast din e-mail, så sender vi et nulstillingslink, hvis kontoen kan bruge adgangskode-login.
            </p>

            {success ? (
              <div className="mt-7 rounded-2xl border border-emerald-900 bg-emerald-950/40 p-5 text-sm font-semibold leading-6 text-emerald-200">
                {success}
              </div>
            ) : (
              <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="text-sm font-bold text-gray-300">E-mail</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-700 focus:border-orange-500"
                  />
                </label>

                {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Sender..." : "Send nulstillingslink"}
                </button>
              </form>
            )}

            <div className="mt-6 border-t border-gray-800 pt-5 text-center text-sm text-gray-500">
              <Link href="/login" className="font-bold text-orange-400 hover:text-orange-300">
                Tilbage til login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
