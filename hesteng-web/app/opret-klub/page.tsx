import Link from "next/link";

export default function OpretKlubPage() {
  return (
    <PublicAuthShell
      eyebrow="Opret klub"
      title="Start din klub på HESTENG"
      description="Opret klub-flowet er klar til at blive koblet på organisation, admin-bruger og rigtig auth."
      footer={(
        <>
          Har du allerede adgang?{" "}
          <Link href="/login" className="font-bold text-orange-400 hover:text-orange-300">
            Log ind
          </Link>
        </>
      )}
    >
      <form className="space-y-4">
        <Field label="Klubnavn" type="text" autoComplete="organization" />
        <Field label="Administrator e-mail" type="email" autoComplete="email" />
        <Field label="Adgangskode" type="password" autoComplete="new-password" />
        <Field label="Bekræft adgangskode" type="password" autoComplete="new-password" />
        <button
          type="button"
          disabled
          className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 opacity-60"
        >
          Opret klub
        </button>
        <p className="text-center text-xs leading-5 text-gray-500">
          Oprettelse kræver rigtig auth og database. Formularen gemmer ikke oplysninger endnu.
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
