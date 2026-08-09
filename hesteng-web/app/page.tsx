import Header from "@/components/Header";
import DashboardCard from "@/components/DashboardCard";
import { dashboardCards } from "@/data/dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-7xl p-10">
        <h2 className="mb-8 text-4xl font-bold">
          God formiddag 👋
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {dashboardCards.map((card) => (
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