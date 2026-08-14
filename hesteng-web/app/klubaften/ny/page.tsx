"use client";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useKlubaften } from "@/context/KlubaftenContext";

export default function NyKlubaftenPage() {
  const { boardCount, setBoardCount, handicapBoards, setHandicapBoards } = useKlubaften();

  const toggleHandicap = (board: number) => {
    setHandicapBoards(
      handicapBoards.includes(board)
        ? handicapBoards.filter((item) => item !== board)
        : [...handicapBoards, board].sort((a, b) => a - b)
    );
  };

  const availableHandicapBoards = [4, 13].filter((board) => board <= boardCount);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-3xl p-10">
        <BackButton />

        <h1 className="mb-8 text-4xl font-bold">
          Ny klubaften
        </h1>

        <div className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Navn
            </label>

            <input
              type="text"
              placeholder="F.eks. Klubaften d. 6. august"
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

            <select
              value={boardCount}
              onChange={(event) => {
                const count = Number(event.target.value);
                setBoardCount(count);
                setHandicapBoards(handicapBoards.filter((board) => board <= count));
              }}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-orange-500"
            >
              {Array.from({ length: 12 }, (_, index) => index + 2).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
              <option value={13}>13</option>
            </select>
          </div>

          {availableHandicapBoards.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Handicapbaner
              </label>
              <p className="mb-3 text-sm text-gray-500">
                Bane 4 og 13 kan bruges normalt. Slå kun handicap til, hvis banen skal have handicap.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {availableHandicapBoards.map((board) => (
                  <label
                    key={board}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-700 bg-gray-800 px-4 py-4"
                  >
                    <input
                      type="checkbox"
                      checked={handicapBoards.includes(board)}
                      onChange={() => toggleHandicap(board)}
                      className="h-5 w-5 accent-orange-500"
                    />
                    <span className="font-semibold">Bane {board} — handicap</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
