"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";
import { getTrainingExercise, trainingExercises } from "@/data/trainingExercises";
import { syncTrainingResultsFromSharedStore } from "@/lib/trainingResultStore";
import type { TrainingExercise, TrainingMetricDefinition, TrainingResult } from "@/lib/trainingTypes";

type HistoricalEntry = Pick<TrainingResult, "exerciseId" | "completedAt" | "metrics"> & {
  id?: string;
  variant?: string;
};
type ChartPoint = { date: string; value: number };

function numberFrom(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatNumber(value: number | null, digits = 1) {
  return value === null ? "–" : value.toLocaleString("da-DK", { maximumFractionDigits: digits });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

function getMetricValue(result: TrainingResult, key: string) {
  const direct = numberFrom(result.metrics[key]);
  if (direct !== null) return direct;
  if (key === "checkoutPercent") {
    const hits = numberFrom(result.metrics.checkouts);
    const attempts = numberFrom(result.metrics.checkoutAttempts);
    if (hits !== null && attempts !== null && attempts > 0) return 100 * hits / attempts;
  }
  if (key === "hitPercent") {
    const hits = numberFrom(result.metrics.hits);
    const attempts = numberFrom(result.metrics.attempts);
    if (hits !== null && attempts !== null && attempts > 0) return 100 * hits / attempts;
  }
  return null;
}

function primaryMetric(exercise: TrainingExercise) {
  return exercise.metrics.find((metric) => metric.key === "threeDartAverage")
    ?? exercise.metrics.find((metric) => metric.key === "score")
    ?? exercise.metrics.find((metric) => metric.personalBest)
    ?? exercise.metrics[0];
}

function uniqueMetrics(exercise: TrainingExercise) {
  return exercise.metrics.filter((metric, index, all) =>
    all.findIndex((item) => item.key === metric.key) === index
  );
}

function isValidMetric(value: number, metric: TrainingMetricDefinition) {
  if (!Number.isFinite(value)) return false;
  if (metric.valueType === "percent" && (value < 0 || value > 100)) return false;
  if (metric.valueType === "count" && (value < 0 || !Number.isInteger(value))) return false;
  if (metric.valueType === "duration" && value < 0) return false;
  return true;
}

function validateEntry(entry: unknown): HistoricalEntry | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const row = entry as Record<string, unknown>;
  const exercise = typeof row.exerciseId === "string" ? getTrainingExercise(row.exerciseId) : null;
  if (!exercise || typeof row.completedAt !== "string") return null;
  const time = new Date(row.completedAt).getTime();
  if (!Number.isFinite(time) || time > Date.now() + 86_400_000) return null;
  if (!row.metrics || typeof row.metrics !== "object" || Array.isArray(row.metrics)) return null;
  const input = row.metrics as Record<string, unknown>;
  const metrics: TrainingResult["metrics"] = {};
  for (const [key, value] of Object.entries(input)) {
    const metric = exercise.metrics.find((item) => item.key === key);
    if (!metric || typeof value !== "number" || !isValidMetric(value, metric)) return null;
    metrics[key] = value;
  }
  if (Object.keys(metrics).length === 0) return null;
  if (row.variant !== undefined && (typeof row.variant !== "string" || row.variant.length > 100)) return null;
  return {
    exerciseId: exercise.id,
    completedAt: new Date(time).toISOString(),
    variant: typeof row.variant === "string" && row.variant.trim() ? row.variant.trim() : undefined,
    metrics,
  };
}

function fingerprint(entry: HistoricalEntry) {
  const canonical = JSON.stringify({
    exerciseId: entry.exerciseId,
    completedAt: entry.completedAt,
    variant: entry.variant ?? "",
    metrics: Object.entries(entry.metrics).sort(([a], [b]) => a.localeCompare(b)),
  });
  // Two independent hashes make repeated imports idempotent without storing personal data in code.
  let a = 2166136261;
  let b = 5381;
  for (let i = 0; i < canonical.length; i += 1) {
    const char = canonical.charCodeAt(i);
    a = Math.imul(a ^ char, 16777619);
    b = Math.imul(b, 33) ^ char;
  }
  return `hesteng-historical-${(a >>> 0).toString(16)}-${(b >>> 0).toString(16)}`;
}

function MiniChart({ points, label }: { points: ChartPoint[]; label: string }) {
  if (!points.length) {
    return <p className="py-8 text-sm font-semibold text-gray-400">Ingen registrerede tal for denne måling endnu.</p>;
  }
  const width = 640;
  const height = 190;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || Math.max(1, Math.abs(max) * 0.15);
  const chartMin = Math.max(0, min - spread * 0.2);
  const chartMax = max + spread * 0.2;
  const coordinates = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : 24 + index / (points.length - 1) * (width - 48);
    const y = height - 20 - (point.value - chartMin) / Math.max(1e-8, chartMax - chartMin) * (height - 40);
    return { x, y, ...point };
  });
  return (
    <div>
      <svg role="img" aria-label={`Udvikling i ${label} over ${points.length} målinger`}
        viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line key={fraction} x1="12" y1={height * fraction} x2={width - 12} y2={height * fraction}
            stroke="#374151" strokeDasharray="4 5" strokeWidth="1" />
        ))}
        {points.length > 1 && <polyline fill="none" stroke="#fb923c" strokeWidth="4"
          strokeLinecap="round" strokeLinejoin="round"
          points={coordinates.map(({ x, y }) => `${x},${y}`).join(" ")} />}
        {coordinates.map(({ x, y, date, value }, i) => (
          <circle key={`${date}-${i}`} cx={x} cy={y} r="5" fill="#fb923c"
            stroke="#111827" strokeWidth="2">
            <title>{`${formatDate(date)}: ${formatNumber(value, 2)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between gap-3 text-xs font-semibold text-gray-400">
        <span>{formatDate(points[0].date)}</span>
        <span>{formatDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

async function writeTrainingResult(result: TrainingResult) {
  const response = await fetch(`/api/training-results?playerId=${encodeURIComponent(result.playerId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hesteng-player-id": result.playerId },
    body: JSON.stringify({ type: "result", result }),
  });
  if (!response.ok) throw new Error("Databasen kunne ikke gemme resultatet.");
}

export default function TrainingProgressPage() {
  const user = useOptionalCurrentUser();
  if (!user) {
    return <main className="min-h-screen bg-gray-950 text-white"><Header />
      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="text-3xl font-black">Log ind for at se din træningsstatistik</h1>
        <Link href="/traening" className="mt-6 inline-block text-orange-400 underline">Til træning</Link>
      </section>
    </main>;
  }
  return <ProgressContent playerId={user.currentPlayerId} clubId={user.currentUser.memberships[0]?.clubId}
    playerName={user.currentPlayer.name} />;
}

function ProgressContent({ playerId, clubId, playerName }: { playerId: string; clubId?: string; playerName: string }) {
  const [results, setResults] = useState<TrainingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [exerciseId, setExerciseId] = useState("jdc-challenge");
  const [metricKey, setMetricKey] = useState("score");
  const [variant, setVariant] = useState("");
  const [day, setDay] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [importRows, setImportRows] = useState<HistoricalEntry[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const exercise = getTrainingExercise(exerciseId) ?? trainingExercises[0];
  const metric = uniqueMetrics(exercise).find((m) => m.key === metricKey) ?? primaryMetric(exercise);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void syncTrainingResultsFromSharedStore(playerId)
      .then((data) => { if (!cancelled) setResults(data.filter((row) => row.playerId === playerId)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [playerId]);

  const selectedResults = useMemo(() => results
    .filter((row) => row.exerciseId === exerciseId && (variant === "" || row.variant === variant))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt)), [results, exerciseId, variant]);
  const variants = useMemo(() => [...new Set(results
    .filter((row) => row.exerciseId === exerciseId && row.variant)
    .map((row) => row.variant as string))].sort(), [results, exerciseId]);
  const chartPoints = selectedResults
    .map((row) => ({ date: row.completedAt, value: getMetricValue(row, metric.key) }))
    .filter((row): row is ChartPoint => row.value !== null);
  const last = chartPoints.at(-1)?.value ?? null;
  const first = chartPoints[0]?.value ?? null;
  const direction = metric.personalBest === "lowerIsBetter" ? -1 : 1;
  const improvement = first === null || last === null || chartPoints.length < 2
    ? null : direction * (last - first);
  const averages = chartPoints.length > 0
    ? chartPoints.reduce((sum, row) => sum + row.value, 0) / chartPoints.length : null;
  const countLast30Days = results.filter((row) => new Date(row.completedAt).getTime() >= Date.now() - 30 * 86400000).length;
  const latestDate = [...results].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0]?.completedAt;
  const importedKnown = importRows.filter((row) => results.some((existing) => existing.id === fingerprint(row))).length;

  async function reload() {
    const data = await syncTrainingResultsFromSharedStore(playerId);
    setResults(data.filter((row) => row.playerId === playerId));
  }

  function chooseExercise(id: string) {
    const nextExercise = getTrainingExercise(id);
    if (!nextExercise) return;
    setExerciseId(id);
    setMetricKey(primaryMetric(nextExercise).key);
    setVariant("");
    setInputs({});
    setError("");
    setNotice("");
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    const metrics: TrainingResult["metrics"] = {};
    for (const definition of uniqueMetrics(exercise)) {
      const raw = inputs[definition.key]?.trim();
      if (!raw) continue;
      const value = Number(raw.replace(",", "."));
      if (!isValidMetric(value, definition)) {
        setError(`Kontrollér ${definition.label}: tallet er ugyldigt.`);
        return;
      }
      metrics[definition.key] = value;
    }
    if (!Object.keys(metrics).length) { setError("Indtast mindst ét måleresultat."); return; }
    const completedAt = new Date(`${day}T12:00:00`);
    if (!day || !Number.isFinite(completedAt.getTime()) || completedAt.getTime() > Date.now() + 86400000) {
      setError("Vælg en gyldig træningsdato."); return;
    }
    const record: TrainingResult = {
      id: `hesteng-manual-${crypto.randomUUID()}`,
      playerId, clubId, exerciseId, variant: variant || undefined,
      completedAt: completedAt.toISOString(),
      metrics,
      details: { source: "historical-manual-entry" },
    };
    setSaving(true);
    try {
      await writeTrainingResult(record);
      await reload();
      setInputs({});
      setNotice("Resultatet er gemt på din spillerprofil.");
    } catch {
      setError("Kunne ikke gemme resultatet. Intet er markeret som gemt.");
    } finally { setSaving(false); }
  }

  async function handleImportFile(file: File | undefined) {
    setError(""); setNotice(""); setImportRows([]); setImportFileName("");
    if (!file) return;
    if (file.size > 100_000) { setError("Filen er for stor. Maks. 100 KB."); return; }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed) || parsed.length > 100 || parsed.length === 0) {
        throw new Error("Brug en JSON-liste med 1-100 træningsresultater.");
      }
      const normalized = parsed.map(validateEntry);
      if (normalized.some((row) => !row)) {
        throw new Error("Et eller flere resultater indeholder ugyldig øvelse, dato eller tal.");
      }
      setImportRows(normalized as HistoricalEntry[]);
      setImportFileName(file.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kunne ikke læse filen.");
    }
  }

  async function confirmImport() {
    setError(""); setNotice(""); setSaving(true);
    let saved = 0;
    try {
      for (const row of importRows) {
        const id = fingerprint(row);
        if (results.some((existing) => existing.id === id)) continue;
        await writeTrainingResult({
          ...row, id, playerId, clubId,
          details: { source: "historical-file-import" },
        });
        saved += 1;
      }
      await reload();
      setImportRows([]);
      setImportFileName("");
      setNotice(`${saved} tidligere resultater er gemt. Dubletter er sprunget over.`);
    } catch {
      await reload().catch(() => undefined);
      setError(`Import afbrudt efter ${saved} gemte resultater. Prøv igen for resten.`);
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">HESTENG Training</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Mine træningstal</h1>
            <p className="mt-2 text-sm text-gray-400">{playerName} · Tal fra dine gemte træningsresultater</p>
          </div>
          <Link href="/traening" className="rounded-xl border border-gray-700 px-4 py-3 text-sm font-bold text-gray-200 hover:border-orange-500">
            Til træningen
          </Link>
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-700 bg-red-950/60 p-3 text-sm font-semibold text-red-200">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-sm font-semibold text-emerald-200">{notice}</p>}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Alle resultater", loading ? "…" : results.length],
            ["Sidste 30 dage", loading ? "…" : countLast30Days],
            ["Øvelser med data", new Set(results.map((row) => row.exerciseId)).size],
            ["Seneste træning", latestDate ? formatDate(latestDate) : "–"],
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
          </div>)}
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
          <h2 className="text-2xl font-black">Min udvikling</h2>
          <p className="mt-1 text-sm font-semibold text-gray-400">Se hvordan hver øvelse udvikler sig. Varianter kan ses hver for sig.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-bold text-gray-300">Øvelse
              <select value={exerciseId} onChange={(e) => chooseExercise(e.target.value)}
                className="mt-1 min-h-12 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 text-white">
                {trainingExercises.filter((item) => item.isActive).map((item) =>
                  <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-gray-300">Måling
              <select value={metric.key} onChange={(e) => setMetricKey(e.target.value)}
                className="mt-1 min-h-12 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 text-white">
                {uniqueMetrics(exercise).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-gray-300">Variant
              <select value={variant} onChange={(e) => setVariant(e.target.value)}
                className="mt-1 min-h-12 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 text-white">
                <option value="">Alle varianter</option>
                {variants.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              ["Seneste", formatNumber(last, 2)],
              ["Snit", formatNumber(averages, 2)],
              ["Udvikling", improvement === null ? "–" : `${improvement >= 0 ? "+" : ""}${formatNumber(improvement, 2)}`],
            ].map(([label, value]) => <div key={label} className="rounded-xl bg-gray-950 p-3">
              <p className="text-xs font-bold text-gray-400">{label}</p>
              <p className="mt-1 text-xl font-black tabular-nums sm:text-2xl">{value}</p>
            </div>)}
          </div>
          <div className="mt-5 rounded-xl bg-gray-950 p-3">
            <MiniChart points={chartPoints.slice(-16)} label={metric.label} />
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-300">
            {chartPoints.length < 2
              ? "Fokus: Registrér mindst to træninger i samme øvelse for at måle udviklingen."
              : improvement !== null && improvement > 0
                ? `Fokus: Du er gået frem i ${metric.label.toLowerCase()}. Prøv at holde niveauet i de næste tre træninger.`
                : improvement !== null && improvement < 0
                  ? `Fokus: ${metric.label} er faldet siden første registrering. Gentag øvelsen og mål, om det vender.`
                  : "Fokus: Niveauet er uændret. Gentag øvelsen og sigt efter et lille fremskridt."}
          </p>
          <div className="mt-4 space-y-2">
            {selectedResults.slice(-5).reverse().map((row) => (
              <div key={row.id} className="flex justify-between gap-3 border-t border-gray-800 py-2 text-sm">
                <span className="text-gray-400">{formatDate(row.completedAt)}</span>
                <span className="font-black">{formatNumber(getMetricValue(row, metric.key), 2)} {metric.valueType === "percent" ? "%" : ""}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={handleSave} className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
            <h2 className="text-xl font-black">Før et tidligere resultat ind</h2>
            <p className="mt-1 text-sm text-gray-400">Vælg øvelse ovenfor, og udfyld kun de tal, du kender. Øvelserne ændres ikke.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-gray-300">Dato
                <input type="date" required value={day} max={new Date().toLocaleDateString("sv-SE")}
                  onChange={(e) => setDay(e.target.value)}
                  className="mt-1 min-h-12 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 text-white" />
              </label>
              <label className="text-sm font-bold text-gray-300">Variant (valgfri)
                <input type="text" maxLength={100} value={variant} onChange={(e) => setVariant(e.target.value)}
                  placeholder="Fx CPU niveau 9"
                  className="mt-1 min-h-12 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 text-white" />
              </label>
              {uniqueMetrics(exercise).map((definition) => (
                <label key={definition.key} className="text-sm font-bold text-gray-300">
                  {definition.label}
                  <input type="text" inputMode="decimal" value={inputs[definition.key] ?? ""}
                    onChange={(e) => setInputs((previous) => ({ ...previous, [definition.key]: e.target.value }))}
                    placeholder={definition.valueType === "percent" ? "0–100" : "Tal"}
                    className="mt-1 min-h-12 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 text-white" />
                </label>
              ))}
            </div>
            <button type="submit" disabled={saving}
              className="mt-5 min-h-12 w-full rounded-xl bg-orange-500 px-5 py-3 font-black text-gray-950 hover:bg-orange-400 disabled:opacity-50">
              {saving ? "Gemmer..." : "Gem på min spillerprofil"}
            </button>
          </form>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
            <h2 className="text-xl font-black">Indlæs flere gamle resultater</h2>
            <p className="mt-2 text-sm text-gray-400">
              Har du tidligere træningstal samlet i en JSON-fil, kan du indlæse dem. Du ser dem, før noget gemmes.
              Dine tal knyttes kun til den spiller, du er logget ind som.
            </p>
            <label className="mt-4 block text-sm font-bold text-gray-300">Vælg resultatfil
              <input type="file" accept=".json,application/json"
                onChange={(e) => void handleImportFile(e.target.files?.[0])}
                className="mt-2 block w-full rounded-xl border border-gray-700 bg-gray-950 p-3 text-sm text-gray-300" />
            </label>
            {importRows.length > 0 && <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-gray-200">
                {importFileName}: {importRows.length} resultater · {importedKnown} er allerede indlæst
              </p>
              <ul className="max-h-56 space-y-1 overflow-auto text-sm text-gray-300">
                {importRows.map((row, i) => <li key={i} className="border-b border-gray-800 pb-1">
                  {formatDate(row.completedAt)} · {getTrainingExercise(row.exerciseId)?.name} · {Object.entries(row.metrics).map(([k, v]) => `${k}: ${v}`).join(", ")}
                </li>)}
              </ul>
              <button type="button" onClick={() => void confirmImport()} disabled={saving || importedKnown === importRows.length}
                className="min-h-12 w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-gray-950 disabled:opacity-50">
                {saving ? "Indlæser..." : `Gem ${importRows.length - importedKnown} resultater`}
              </button>
            </div>}
            <p className="mt-5 text-xs font-semibold text-gray-500">
              Eksisterende resultater overskrives ikke. Fejl ved gemning bliver vist, så du ikke tror, noget er gemt, når det ikke er.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
