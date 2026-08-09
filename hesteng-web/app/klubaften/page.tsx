import Header from "@/components/Header";
import Link from "next/link";
import BackButton from "@/components/BackButton";

export default function KlubaftenPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-7xl p-10">
        <BackButton />

        <h1 className="mb-8 text-4xl font-bold">
          🏆 Klubaften
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-2xl font-bold">
              Ny klubaften
            </h2>

            <p className="mt-3 text-gray-400">
              Opret en ny klubaften.
            </p>

            <Link
              href="/klubaften/ny"
              className="mt-8 block w-full rounded-xl bg-orange-500 py-3 text-center font-semibold hover:bg-orange-600"
            >
              Opret klubaften
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-2xl font-bold">
              Aktiv klubaften
            </h2>

            <p className="mt-3 text-gray-400">
              Ingen aktiv klubaften.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}