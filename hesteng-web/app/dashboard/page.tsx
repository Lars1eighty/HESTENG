"use client";

import DashboardCard from "@/components/DashboardCard";
import Header from "@/components/Header";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";
import { dashboardCards } from "@/data/dashboard";

export default function DashboardPage() {
  const currentUserContext = useOptionalCurrentUser();
  const currentUser = currentUserContext?.currentUser;
  const primaryMembership = currentUser?.memberships[0];
  const isAdmin = primaryMembership?.role === "ADMIN";
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
        <div className="mb-8">
          <h2 className="text-4xl font-bold">
            {currentUser?.name ?? "HESTENG"}
          </h2>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">
            {primaryMembership?.clubName ?? "Ingen klub tilknyttet"}
          </p>
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
