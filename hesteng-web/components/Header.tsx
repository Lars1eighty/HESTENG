"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useClub } from "@/context/ClubContext";

export default function Header() {
  const router = useRouter();
  const { status } = useSession();
  const { clubs, currentClubId, setCurrentClubId } = useClub();
  const isAuthenticated = status === "authenticated";

  function changeClub(clubId: string) {
    setCurrentClubId(clubId);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-800 px-8 py-6">
      <Link href="/">
        <h1 className="text-3xl font-bold text-orange-500">
          HESTENG
        </h1>
        <p className="text-sm text-gray-400">
          Measure. Improve. Compete.
        </p>
      </Link>

      <div className="flex items-center gap-4 text-sm font-semibold text-gray-300">
        {isAuthenticated && clubs.length > 1 ? (
          <select
            value={currentClubId}
            onChange={(event) => changeClub(event.target.value)}
            aria-label="Vælg klub"
            className="max-w-44 rounded-full border border-gray-800 bg-gray-950 px-3 py-1.5 text-xs font-bold text-gray-300 outline-none transition focus:border-orange-500"
          >
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        ) : null}

        <nav className="flex items-center gap-2 rounded-full border border-gray-800 bg-gray-950/60 p-1">
          <Link href="/player" className="rounded-full px-3 py-1.5 text-orange-300 transition hover:bg-orange-500/10 hover:text-orange-200">
            Player
          </Link>
          <Link href="/dashboard" className="rounded-full px-3 py-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white">
            Club
          </Link>
        </nav>
        <nav className="hidden items-center gap-3 text-xs font-semibold text-gray-600 sm:flex">
          <Link href="/privatliv" className="transition hover:text-orange-300">
            Privatliv
          </Link>
          <Link href="/vilkaar" className="transition hover:text-orange-300">
            Vilkår
          </Link>
        </nav>
        <div className="hidden text-gray-300 sm:block">
          👤 Lars
        </div>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-full border border-gray-800 px-3 py-1.5 text-xs font-bold text-gray-400 transition hover:border-orange-500 hover:text-orange-300"
          >
            Log ud
          </button>
        ) : null}
      </div>
    </header>
  );
}
