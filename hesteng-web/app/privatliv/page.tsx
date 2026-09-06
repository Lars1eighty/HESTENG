import Link from "next/link";

const sections = [
  {
    title: "1. Dataansvarlig",
    body: [
      "Dataansvarlig er Lars Hesteng Jensen / HESTENG, Danmark.",
      "Kontakt: kontakt@hesteng.com",
    ],
  },
  {
    title: "2. Hvilke oplysninger behandles",
    body: [
      "HESTENG kan behandle almindelige kontakt- og kontooplysninger, klubtilknytning, spillerprofil, træningsresultater, konkurrenceresultater, statistik og tekniske oplysninger, der er nødvendige for drift og sikkerhed.",
      "HESTENG behandler ikke adgangskoder i klartekst. Login håndteres via den til enhver tid tilkoblede auth-provider.",
    ],
  },
  {
    title: "3. Formål",
    body: [
      "Oplysninger bruges til at levere HESTENGs funktioner: personlig træning, statistik, klubadministration, ranglister, konkurrencer, klubaftner og forbedring af brugeroplevelsen.",
      "Tekniske oplysninger kan bruges til fejlfinding, sikkerhed og stabil drift.",
    ],
  },
  {
    title: "4. Retsgrundlag",
    body: [
      "Behandlingen sker for at kunne levere den tjeneste, brugeren eller klubben anvender, og for at HESTENG kan varetage legitime interesser i sikker drift, support og videreudvikling.",
    ],
  },
  {
    title: "5. Opbevaring",
    body: [
      "Oplysninger opbevares kun så længe, det er nødvendigt for formålene, eller så længe der er et relevant klub-, bruger- eller driftsmæssigt behov.",
      "Historiske sports- og statistikdata kan bevares som en del af klubbens historik, medmindre sletning er påkrævet eller aftalt.",
    ],
  },
  {
    title: "6. Deling",
    body: [
      "HESTENG deler ikke personoplysninger med uvedkommende tredjeparter.",
      "Nødvendige databehandlere kan anvendes til hosting, database, login, drift og support. Disse må kun behandle data efter instruks.",
    ],
  },
  {
    title: "7. Brugerens rettigheder",
    body: [
      "Brugere kan anmode om indsigt, rettelse, sletning, begrænsning eller indsigelse efter gældende databeskyttelsesregler.",
      "Henvendelser sendes til kontakt@hesteng.com.",
    ],
  },
  {
    title: "8. Cookies og lokal lagring",
    body: [
      "HESTENG kan bruge cookies eller lokal lagring til session, sikkerhed, teknisk drift og brugerpræferencer.",
      "Adgangskoder gemmes ikke i localStorage eller sessionStorage.",
    ],
  },
  {
    title: "9. Ændringer",
    body: [
      "Privatlivspolitikken kan opdateres, når HESTENG udvikles, eller når lovgivning og tekniske løsninger ændrer sig.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <article className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="mb-8">
          <Link href="/" className="text-3xl font-black text-orange-500">
            HESTENG
          </Link>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-orange-400">Privatlivspolitik</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">HESTENG - Privatlivspolitik v1</h1>
          <p className="mt-4 text-base leading-7 text-gray-400">
            Denne politik beskriver, hvordan HESTENG behandler personoplysninger i forbindelse med platformen.
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
