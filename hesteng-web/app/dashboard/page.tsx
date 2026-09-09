"use client";

import DashboardCard from "@/components/DashboardCard";
import Header from "@/components/Header";
import { useClub } from "@/context/ClubContext";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";
import { dashboardCards } from "@/data/dashboard";

export default function DashboardPage() {
  const currentUserContext = useOptionalCurrentUser();
  const currentUser = currentUserContext?.currentUser;
  const { clubs, currentClub, currentClubId, setCurrentClubId } = useClub();
  const currentMembership = currentUser?.memberships.find(
    (membership) => membership.clubId === currentClubId
  );
  const isAdmin = currentMembership?.role === "ADMIN";

  const visibleCards = dashboardCards.filter((card) => {
    if (card.label === "KLUBAFTEN" || card.label === "SPILLERE") {
      return isAdmin;
    }

    return card.label === "TRÆNING" || card.label === "RANGLISTER";
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-7xl p-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-4xl font-bold">
              {currentUser?.name ?? "HESTENG"}
            </h2>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">
              {currentClub.name}
            </p>
          </div>

          {clubs.length > 1 ? (
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Vælg klub
              <select
                value={currentClubId}
                onChange={(event) => setCurrentClubId(event.target.value)}
                className="min-w-56 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition focus:border-orange-500"
              >
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {visibleCards.map((card) => (
            <DashboardCard
              key={card.label}
              label={card.label}
              title={card.title}
              description={card.description}
              icon={card.icon}
              buttonText={card.buttonText}
              href={card.href}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
