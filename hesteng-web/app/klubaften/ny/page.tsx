import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";

export default function NyKlubaftenPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-3xl p-10">
        <BackButton />

        <h1 className="mb-8 text-4xl font-bold">
          Ny klubaften
        </h1>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Navn
            </label>

            <input
              type="text"
              placeholder="F.eks. Torsdag d. 6. august"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Dato
            </label>

            <input
              type="date"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Antal baner
            </label>

            <select className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-orange-500">
              <option>2</option>
              <option>3</option>
              <option>4</option>
              <option>5</option>
              <option>6</option>
              <option>7</option>
              <option>8</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Spilleform
            </label>

            <select className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-orange-500">
              <option>501 Double Out</option>
              <option>501 Single Out</option>
            </select>
          </div>

          <Link
            href="/klubaften/spillere"
            className="block w-full rounded-xl bg-orange-500 py-3 text-center text-lg font-semibold hover:bg-orange-600"
          >
            Opret klubaften
          </Link>
        </div>
      </section>
    </main>
  );
}