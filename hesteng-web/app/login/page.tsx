"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("E-mail eller adgangskode er forkert.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (result?.ok) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setError("E-mail eller adgangskode er forkert.");
    setIsSubmitting(false);
  }

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
          <span className="mx-2 text-gray-700">·</span>
          <Link href="/opret-konto" className="font-bold text-orange-400 hover:text-orange-300">
            Opret konto
          </Link>
        </>
      )}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <Field label="Adgangskode" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
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
          <Link href="/glemt-adgangskode" className="text-sm font-semibold text-gray-500 hover:text-orange-300">
            Glemt adgangskode?
          </Link>
        </div>
        {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-gray-100 px-5 py-4 font-black text-gray-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Logger ind..." : "Log ind"}
        </button>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 transition hover:bg-orange-400"
        >
          Log ind med Google
        </button>
        <p className="text-center text-xs leading-5 text-gray-500">
          &quot;Husk mig&quot; bruger auth-providerens sikre session/cookie og gemmer aldrig adgangskoden lokalt.
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
            <div className="mt-4 flex justify-center gap-4 text-xs font-semibold text-gray-600">
              <Link href="/privatliv" className="transition hover:text-orange-300">
                Privatliv
              </Link>
              <Link href="/vilkaar" className="transition hover:text-orange-300">
                Vilkår
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
