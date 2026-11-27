# DART Training — fælles udviklingskilde

Denne mappe er den fælles kildekode for den eksisterende selvstændige DART Training-app.
Læs README.md før arbejde. Hold den adskilt fra HESTENG Club, Legacy og hesteng-web.

- Hent nyeste main og undersøg kode, Git-status og ændringer før arbejde. Brug en separat branch til større eller risikable ændringer.
- Brugerens godkendelse styrer kodeændringer og udgivelse. Spørg ikke igen om allerede godkendt arbejde.
- Bevar øvelsesregler, scoring, statistik, historik, lokal storage-nøgler, appadresse, Site-ID og databasen, medmindre en konkret ændring er godkendt.
- Ingen backups med brugerdata, databasedumps, tokens, adgangskoder eller runtime-hemmeligheder i GitHub.
- Node 24 eller nyere. Kør npm test og npm run build fra denne mappe. Test også berørt brugerflade; simulering er ikke fysisk Android-test.
- Regressionstest bruger tests/scoring-baseline.json; opdatér ikke forventninger blot for at få en fejlende test grøn.
- Den fælles GitHub-kode er udgangspunktet for nye ændringer. Undgå isolerede permanente rettelser kun i Sites-kilden.
- GitHub-merge udgiver ikke appen. Brug udgivelsesforløbet i README.md og den tilgængelige Sites-vejledning. Bevar det eksisterende Site og dets publikum.
- scripts/prepare-site.mjs kontrollerer kildekonflikter før kopiering til et åbnet Site-checkout. Stop og sammenlign ved konflikt; bypass ikke kontrollen.
- Efter udgivelse: rapportér GitHub-commit, Site-version, tests og manuel kontrol. Samtaler deler koden, ikke automatisk samtalehistorik.
