import Link from "next/link";

const sections = [
  {
    title: "1. Anvendelse",
    body: [
      "Disse brugervilkår gælder for brug af HESTENG-platformen, herunder personlig træning, klubfunktioner, statistik, ranglister og konkurrencer.",
    ],
  },
  {
    title: "2. Konto og adgang",
    body: [
      "Brugeren er ansvarlig for, at loginoplysninger og adgang til kontoen behandles forsvarligt.",
      "HESTENG må ikke bruges til at skaffe sig uberettiget adgang til andre brugeres eller klubbers data.",
    ],
  },
  {
    title: "3. Klubdata",
    body: [
      "Klubdata tilhører den relevante klub eller organisation og må kun administreres af brugere med den nødvendige rolle eller adgang.",
      "En bruger må kun oprette, ændre eller slette data, hvor brugeren har legitim adgang.",
    ],
  },
  {
    title: "4. Sportsdata og statistik",
    body: [
      "HESTENG beregner statistik, ranglister og udvikling på baggrund af registrerede resultater.",
      "Brugeren og klubben er ansvarlige for, at indtastede resultater er korrekte.",
    ],
  },
  {
    title: "5. Acceptabel brug",
    body: [
      "Platformen må ikke bruges til ulovlige formål, chikane, manipulation af data, forsøg på omgåelse af sikkerhed eller handlinger, der kan skade drift og stabilitet.",
    ],
  },
  {
    title: "6. Drift og ændringer",
    body: [
      "HESTENG kan løbende forbedres, ændres eller midlertidigt være utilgængelig som led i drift, vedligeholdelse eller videreudvikling.",
    ],
  },
  {
    title: "7. Ansvar",
    body: [
      "HESTENG leveres som en sports- og statistikplatform. Platformen kan indeholde fejl eller midlertidige afbrydelser.",
      "HESTENG er ikke ansvarlig for indirekte tab, tabte data som følge af brugerfejl eller beslutninger truffet alene på baggrund af statistik i systemet.",
    ],
  },
  {
    title: "8. Ophør",
    body: [
      "Adgang kan lukkes eller begrænses ved misbrug, sikkerhedsrisiko eller brud på disse vilkår.",
    ],
  },
  {
    title: "9. Kontakt",
    body: [
      "Spørgsmål om brugervilkår kan sendes til kontakt@hesteng.com.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <article className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="mb-8">
          <Link href="/" className="text-3xl font-black text-orange-500">
            HESTENG
          </Link>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-orange-400">Brugervilkår</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">HESTENG - Brugervilkår v1</h1>
          <p className="mt-4 text-base leading-7 text-gray-400">
            Disse vilkår beskriver de grundlæggende regler for brug af HESTENG.
          </p>
        </header>

        <div className="grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="text-xl font-black text-white">{section.title}</h2>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
