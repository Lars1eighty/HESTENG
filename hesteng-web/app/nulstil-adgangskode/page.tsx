"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, FormEvent, useState } from "react";

const RESET_ERROR_MESSAGE = "Linket er ugyldigt eller udløbet. Bed om et nyt nulstillingslink.";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordShell />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  return <ResetPasswordShell token={token} />;
}

function ResetPasswordShell({ token = "" }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(token ? null : RESET_ERROR_MESSAGE);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError(RESET_ERROR_MESSAGE);
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

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, password }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(typeof result.error === "string" ? result.error : RESET_ERROR_MESSAGE);
      setIsSubmitting(false);
      return;
    }

    setSuccess("Din adgangskode er ændret.");
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
            <div className="text-sm font-black uppercase tracking-[0.32em] text-orange-400">Adgangskode</div>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Nulstil adgangskode</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Vælg en ny adgangskode til din HESTENG-konto.
            </p>

            {success ? (
              <div className="mt-7 space-y-5">
                <div className="rounded-2xl border border-emerald-900 bg-emerald-950/40 p-5 text-sm font-semibold leading-6 text-emerald-200">
                  {success}
                </div>
                <Link
                  href="/login"
                  className="inline-flex w-full justify-center rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 transition hover:bg-orange-400"
                >
                  Log ind
                </Link>
              </div>
            ) : (
              <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                <PasswordField label="Ny adgangskode" value={password} onChange={setPassword} />
                <PasswordField label="Gentag adgangskode" value={confirmPassword} onChange={setConfirmPassword} />

                {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting || !token}
                  className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Gemmer..." : "Gem ny adgangskode"}
                </button>
              </form>
            )}

            <div className="mt-6 border-t border-gray-800 pt-5 text-center text-sm text-gray-500">
              <Link href="/glemt-adgangskode" className="font-bold text-orange-400 hover:text-orange-300">
                Bed om et nyt link
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-300">{label}</span>
      <input
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-700 focus:border-orange-500"
      />
    </label>
  );
}
