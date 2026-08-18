"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <PublicAuthShell
      eyebrow="Log ind"
      title="Velkommen tilbage"
      description="Log ind for at åbne din klub og fortsætte arbejdet med træning, konkurrencer og statistik."
      footer={(
        <>
          Har du ikke en klub endnu?{" "}
          <Link href="/opret-klub" className="font-bold text-orange-400 hover:text-orange-300">
            Opret klub
          </Link>
        </>
      )}
    >
      <form className="space-y-4">
        <Field label="E-mail" type="email" autoComplete="email" />
        <Field label="Adgangskode" type="password" autoComplete="current-password" />
        <div className="flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-400">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-950 accent-orange-500"
            />
            Husk mig
          </label>
          <Link href="#" className="text-sm font-semibold text-gray-500 hover:text-orange-300">
            Glemt adgangskode?
          </Link>
        </div>
        <button
          type="button"
          disabled
          className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 opacity-60"
        >
          Log ind
        </button>
        <p className="text-center text-xs leading-5 text-gray-500">
          Login tilsluttes en rigtig auth-provider senere. &quot;Husk mig&quot; skal kobles på providerens sikre session/cookie, ikke localStorage.
        </p>
      </form>
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
}: {
  label: string;
  type: string;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-300">{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-700 focus:border-orange-500"
      />
    </label>
  );
}
