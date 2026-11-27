# DART Training

Fælles udviklingskilde for den eksisterende app:
https://dart-training-hesteng.normalporcupine2.chatgpt.site

Koden er importeret fra den udgivne Sites-kilde ved commit
`3cb7ac93406c5c53a13e81316949796dc42831e7` (sikker afslutning, papirkurv og 501-layout).
Kildeimporten ændrer ikke den kørende app, appadressen, logins, databasen eller træningshistorikken.

## Kom i gang

Arbejd i `apps/dart-training/` med Node 24 eller nyere:

```sh
npm test
npm run build
```

Der er ingen npm-afhængigheder og intet installationstrin. Bygningen producerer
`dist/server/index.js`, en Cloudflare Worker med de eksisterende statiske assets.
De to PNG-ikoner ligger som `.png.base64` og dekodes af browseren gennem den
byggede Worker til nøjagtig de samme billedbytes. Dette gør også kildekoden
redigerbar gennem GitHubs tekstbaserede integration.

## Filer

- `app/`: den eksisterende HTML, scoring, statistik, Mine mål, synkronisering og sikkerhedskontroller.
- `worker/index.js`: API, brugerafgrænsning, lagring og papirkurv.
- `drizzle/`: eksisterende databaseskema. Kør ikke migrationer som del af en kildeimport.
- `.openai/hosting.json`: identiteten på det eksisterende Site og dets DB-binding. Opret ikke et nyt Site.
- `tests/`: 64 eksisterende tests og faste regressionstal, så testene virker uden Sites-repositoryets Git-historik.
- `source-baseline.json`: hashes af den oprindeligt importerede Sites-kilde til konfliktkontrol.

## Arbejdsform på tværs af samtaler

Hent nyeste `main`. Læs `AGENTS.md`, og undersøg aktive branches/PR'er, før du
ændrer koden. Brug afgrænsede branches og beskriv tests i PR'en. GitHub er den
fælles udviklingskilde; alle samtaler med repository-adgang kan hente den.
GitHub opretter ikke automatisk adgang for en samtale uden tilsluttet integration.

GitHub Actions tester og bygger ved ændringer i denne mappe. Det udgiver ikke
appen. Der tilføjes ingen adgangsnøgler til Actions.

## Udgiv til den eksisterende app

Brug den aktuelt tilgængelige Sites-vejledning og Sites-værktøjer; bibliotekets
lokale installationssti kan variere fra samtale til samtale.

1. Hent og test det godkendte GitHub-commit med `npm test` og `npm run build`.
2. Hent det eksisterende Site `appgprj_6afb528b597c8191a9592c30e60c71cf`
   med `get_site`, og hent en ny kildeadgang. Åbn dets nuværende kilde med
   Sites' `site-workflow.mjs` i et separat checkout. Gem åbningsresultatet.
3. Fra denne mappe: `npm run prepare-site -- /absolut/sti/til/site-checkout`.
   Scriptet kontrollerer Site-ID, Git-status og ændringer siden sidste overførsel
   før nogen kopiering. Ved konflikt: sammenlign begge kilder og løs i GitHub.
   Overskriv aldrig automatisk ændringer fra en anden samtale.
4. Kør `npm test` og `npm run build` i Site-checkoutet, og kontrollér berørt UI.
5. Brug Sites-kildehjælperen til commit/push og pakning fra det samme checkout,
   med det gemte åbningsresultat. Send præcis den returnerede SHA og pakke til
   udgivelsesværktøjet, og bevar appens adgangsindstillinger.
6. Kontrollér udgivelsesresultatet, og rapportér versionen. Kildehjælperen
   opdaterer Sites-repositoryet; der er ingen automatisk GitHub-udgivelse.

`prepare-site` tilføjer `.openai/github-source.json` i det lokale Site-checkout
med det anvendte GitHub-commit og filhashes. Næste overførsel kan dermed opdage
ændringer foretaget direkte i Sites siden sidste overførsel.

## Databeskyttelse

Repositoryet indeholder kode og syntetiske testdata, ikke personlige træninger.
Ingen data flyttes ved denne import. Gendannelse findes i appen under
Backup → Administration; ældre sletninger fra før papirkurven kan ikke altid gendannes.
