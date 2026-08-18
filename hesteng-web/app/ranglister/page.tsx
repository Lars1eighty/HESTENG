"use client";

import { useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import { useClub } from "@/context/ClubContext";
import { calculateRankings, type RankingRow } from "@/lib/rankingEngine";

type RankingKey = "elo" | "oneEighties" | "highestCheckouts" | "fastestLegs" | "clubNightPoints";

type RankingConfig = {
  key: RankingKey;
  title: string;
  valueLabel: string;
};

type RankingGroupKey = "club" | "records" | "legs";

type RankingGroup = {
  key: RankingGroupKey;
  tab: string;
  rankings: RankingConfig[];
};

const rankingGroups: RankingGroup[] = [
  {
    key: "club",
    tab: "Klub",
    rankings: [
      { key: "elo", title: "ELO", valueLabel: "ELO" },
      { key: "clubNightPoints", title: "Klubaften-point", valueLabel: "Point" },
    ],
  },
  {
    key: "records",
    tab: "Scoring",
    rankings: [
      { key: "oneEighties", title: "180'ere", valueLabel: "180'ere" },
      { key: "highestCheckouts", title: "Checkout", valueLabel: "Højeste luk" },
    ],
  },
  {
    key: "legs",
    tab: "Legs",
    rankings: [{ key: "fastestLegs", title: "Hurtigste leg", valueLabel: "Pile" }],
  },
];

export default function RanglisterPage() {
  const [activeGroupKey, setActiveGroupKey] = useState<RankingGroupKey>("club");
  const { currentClubId, currentClub } = useClub();
  const rankings = calculateRankings(undefined, currentClubId);
  const activeGroup = rankingGroups.find((group) => group.key === activeGroupKey) ?? rankingGroups[0];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <BackButton />

        <div className="mb-4">
          <h1 className="text-3xl font-black sm:text-4xl">Ranglister</h1>
          <p className="mt-2 text-base text-gray-400">{currentClub.name} · aktuelle ranglister</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-gray-800 bg-gray-900 p-1.5">
          {rankingGroups.map((group) => {
            const isActive = group.key === activeGroup.key;
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => setActiveGroupKey(group.key)}
                className={`min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-black transition sm:min-w-36 ${
                  isActive
                    ? "bg-orange-500 text-gray-950 shadow-md shadow-orange-950/30"
                    : "bg-gray-950 text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {group.tab}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {activeGroup.rankings.map((ranking) => (
            <RankingTable
              key={ranking.key}
              title={ranking.title}
              rows={getVisibleRows(ranking.key, rankings[ranking.key])}
              valueLabel={ranking.valueLabel}
            />
          ))}
          {activeGroup.rankings.length === 1 ? <ComingSoonPanel /> : null}
        </div>
      </section>
    </main>
  );
}

function RankingTable({
  title,
  rows,
  valueLabel,
}: {
  title: string;
  rows: RankingRow[];
  valueLabel: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between gap-3 border-b border-gray-800 px-4 py-3">
        <h2 className="text-xl font-black">{title}</h2>
        <span className="rounded-full bg-gray-950 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-gray-500">{rows.length}</span>
      </div>

      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] gap-3 border-b border-gray-800 bg-gray-950/60 px-4 py-2 text-[0.68rem] font-black uppercase tracking-wide text-gray-500 sm:grid-cols-[4rem_minmax(0,1fr)_8rem]">
        <div>Placering</div>
        <div>Navn</div>
        <div className="text-right">{valueLabel}</div>
      </div>

      {rows.length ? (
        <div className="divide-y divide-gray-800">
          {rows.map((row, index) => (
            <RankingListRow key={`${title}-${row.player}`} row={row} place={index + 1} />
          ))}
        </div>
      ) : (
        <div className="px-4 py-8">
          <EmptyState />
        </div>
      )}
    </section>
  );
}

function ComingSoonPanel() {
  return (
    <section className="rounded-xl border border-dashed border-gray-800 bg-gray-900/50 p-4">
      <div className="flex h-full min-h-40 items-center justify-center rounded-lg bg-gray-950/50 text-center text-sm font-semibold text-gray-600">
        Plads til næste rangliste
      </div>
    </section>
  );
}

function RankingListRow({ row, place }: { row: RankingRow; place: number }) {
  const topStyle = getTopStyle(place);

  return (
    <div className={`grid min-h-11 grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 sm:grid-cols-[4rem_minmax(0,1fr)_8rem] ${topStyle.row}`}>
      <div>
        <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-sm font-black ${topStyle.place}`}>
          {place}
        </span>
      </div>
      <div className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">{row.player}</div>
      <div className="text-right text-lg font-black tabular-nums text-orange-400">{formatValue(row.value)}</div>
    </div>
  );
}

function getTopStyle(place: number) {
  if (place === 1) {
    return {
      row: "bg-yellow-500/10",
      place: "bg-yellow-400 text-gray-950",
    };
  }

  if (place === 2) {
    return {
      row: "bg-slate-300/10",
      place: "bg-slate-300 text-gray-950",
    };
  }

  if (place === 3) {
    return {
      row: "bg-amber-700/20",
      place: "bg-amber-700 text-white",
    };
  }

  return {
    row: "",
    place: "bg-gray-800 text-gray-400",
  };
}

function EmptyState() {
  return <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950 p-6 text-center text-gray-500">Ingen data endnu.</div>;
}

function formatValue(value: RankingRow["value"]) {
  return value === null ? "-" : value;
}

function getVisibleRows(key: RankingKey, rows: RankingRow[]) {
  if (key === "elo") return rows;

  return rows.filter((row) => (row.value ?? 0) > 0);
}
