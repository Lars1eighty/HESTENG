# HESTENG Legacy – verificeret kildeaudit

**Dato:** 27. oktober 2026  
**Kilde:** Fuld read-only JSON-eksport af det aktive Apps Script-projekt **Dart Torsdagsturnering** via Google Drive. Projektet er sidst ændret 22. oktober 2026. Den eksporterede kildekode **ligger ikke i GitHub**.

**Vigtigt:** Ingen filer, ark, Gmail-labels, triggere eller deployments i den aktive Legacy-løsning er ændret. Denne rapport indeholder ingen rå klubdata eller private kildefiler.

## Kildegrundlaget

- Eksporten indeholder **16 filer**: 13 Apps Script-kodefiler, 2 HTML-filer og 1 manifest.
- Alle 13 scriptfiler er gennemgået med en JavaScript-parser. **Ingen syntaksfejl** i den hentede version.
- Den eksisterende GitHub-mappe `apps-script/` er **ikke** et komplet spejl af det aktive projekt.
- Kode fra arkiverede chattråde er historisk materiale; vurderingerne nedenfor bygger på den **aktive eksport**.
- `Index.html` og `Leaderboard.html` findes i det aktuelle projekt. V9.1 og V42 er endnu ikke installeret dér.

## Konkrete fund, rangordnet

| Niveau | Verificeret fund | Risiko / konsekvens | Sikker løsning |
|---|---|---|---|
| **Kritisk** | **To globale `buildDCMatches()`**: `dartconnectLegacyImport.` linje 236 og `123` linje 52. Sidstnævnte rydder `DC_Matches` A:G og skriver `ELO_Processed` blankt. | Tidligere behandlede kampe kan miste ELO-flag og ende i en ny ELO-beregning. Hvilken version runtime vælger, må ikke gættes. | Bevar den version der opdaterer ud fra kolonneoverskrifter og bevarer eksisterende data; isolér/omdøb først den destruktive variant på en **testkopi**. Regressionstest mod historik med ELO-flag. |
| **Høj** | Den data-bevarende `buildDCMatches()` fra `dartconnectLegacyImport.` genkender ikke DartConnects **`W`** i `Win`-kolonnen. | Nye kampe kan få tomme legresultater, selv om vinderen findes. | `isTruthyWin_()` skal tillade `w` (case-insensitive); test 3-1 med realistisk 20-kolonners DC_Raw-layout samt genkørsel uden tab af `ELO_Processed`. **Minimal rettelse lagt i GitHub-kladden.** |
| **Høj** | `Ny Torsdag` → `importRecapStats()` markerer en Gmail-tråd `elo-processed` **før** alle `DC_Raw`-rækker skrives. | Hvis `setValues` fejler, kan mailen være markeret uden at være importeret. | Sæt først label efter succesfuld skrivning og verificeret MatchID. Test fejl, dubletter og genkørsel på kopi. |
| **Høj** | **To globale `onOpen()`**: `Live` linje 472 og `Menu` linje 1. | Kun én menu kan få lov at definere åbningen; risiko for at en af menuerne forsvinder. | Én samlet `onOpen` med begge menuer. Afprøv i kopien. |
| **Høj** | Projektets eneste `doGet()` i `PuljePrintWeb` returnerer en statisk **testside** og bruger ikke `Index.html` eller `e.parameter`. | Browserindgangen viser ikke den beregnede klubbrugerflade. | Et autentificeret entrypoint som indlæser den godkendte HTML. Ingen ekstra `doGet`. |
| **Mellem** | `Leaderboard.html` kalder `google.script.run.getELOData()`, men ingen serverfunktion med navnet `getELOData` findes i eksporten. | Ranglisten kan ikke hente sine tal gennem denne fil. | Knyt en read-only serverfunktion til `Players`/`Live Aktiv`, eller tilslut den nye V42-datalæser. |
| **Mellem** | `Menu.chooseImportSource()` kalder `importRecapStats("DartConnect")` / `importRecapStats("Hjem")`, men `importRecapStats()` tager ingen parametre. | Den valgte importkilde bliver tilsyneladende ignoreret. | Test og afklar den tiltænkte funktion; fjern ikke en knap uden at bevare korrekt import. |
| **Mellem** | Både `opdaterKlubaften()` og `opdaterEloKlubaften()` findes og kalder import/ELO. | To timede opdateringer kan køre parallelt eller gentage arbejde. | **Læs de faktiske Apps Script-triggere**, før en af dem deaktiveres; triggere er ikke med i kildeeksporten. |
| **Afventer** | Manifestet beskriver webadgang `MYSELF`; deployment-indstillinger kan være anderledes. | Ukendt hvem der kan se det aktive endpoint. | Afprøv faktiske deployed permissions. Del ikke spiller-/tilmeldingsdata offentligt uden beslutning. |

**Afkræftet mistanke:** To `shuffle()` i `Elo.gs` er begge **lokale** funktioner og giver ikke en global navnekollision.

## Systemgrænser

- **HESTENG Legacy:** Jyden + DartConnect-kampmails + Google Sheets + eksisterende ELO.
- **HESTENG Club:** Andet system med egen scorer. Ingen ændringer hertil.
- **HESTENG Training:** Separat spor.
- `Players` forbliver autoritativ for navn/ELO. `Tilmelding` afkrydser deltagere.
- **Ingen historiske eller live persondata er lagt i det offentlige GitHub-repo.**

## Testværktøj og status

`apps-script/tools/auditLegacySource.cjs` er en **offline kontrol** for globale navnekollisioner og syntaks. Den kan læse både eksporterede `.gs`-filer og Google Apps Scripts originale JSON-eksport:

```bash
node apps-script/tools/auditLegacySource.cjs /privat/backup/AppsScript-eksport.json
```

Eksportfilen skal opbevares privat. Audit-værktøjet **eksekverer aldrig Apps Script-koden** og ændrer ingen filer. Scannerens top-level-afgrænsning er heuristisk, så rapporten kræver faglig efterkontrol.

Ved separat komplet AST-gennemgang af den aktuelle JSON-eksport blev de **to** globale kollisioner ovenfor bekræftet: `buildDCMatches` og `onOpen`. Det er fund i **produktionskilden**, ikke bevis for at en bestemt funktion er blevet kørt eller data er beskadiget.

## Isoleret reproduktion af kampdatafejl

Testet uden Gmail, internet eller adgang til det aktive Google Sheet ved at
køre hver af de to **aktuelle** `buildDCMatches()`-implementeringer separat
mod kunstige kampdata med **de samme 20 og 16 kolonneoverskrifter** som
`DC_Raw` og `DC_Matches`:

- Historisk kamp med `ELO_Processed="X"` og udfyldte ELO- og tidsfelter.
- Ny kamp med resultat 3-1, hvor hvert vundet leg har `Win="W"`.
- Data-bevarende variant uden rettelse: bevarede `X`, men nye vundne legs
  blev **tomme**.
- Data-bevarende variant med **kun `"w"` tilføjet i `isTruthyWin_()`**:
  bevarede `X`/ELO/tid **og** gav ny kamp korrekte 3-1.
- Den gamle destruktive variant: 3-1 blev registreret, men historisk `X`
  blev **nulstillet**.

Den isolerede test er ikke bevis for en succesfuld klubaften. Den viser at
den minimale ændring virker i en mock, og præcist hvorfor den farlige version
ikke må aktiveres.

## Næste sikre implementering

1. Lav testkopi af **script og regneark**. Pas på, at den **ikke** bruger aktive Gmail-labels, produktions-DC-import eller timede triggere.
2. På testkopien: giv `buildDCMatches` én data-bevarende implementation med understøttelse af `Win="W"`. Test at `ELO_Processed` og tidligere kampdata er identiske ved genkørsel, og at nye kampe importeres korrekt.
3. Flyt `elo-processed`-mærkning efter dataskrivning. Test indsat fejl, dubletter og genkørsel.
4. Saml `onOpen`; derefter forbind HTML `doGet` og manglende ELO-provider. Test sikkerhed på pc og mobil.
5. Forbind V9.1 og V42 med **read-only** visning først. Skema/tilmelding og kampimport må ikke ændres af visningsdelen.
6. Kun efter reelle tests og særskilt kontrol af triggere og backup: beslut om den aktive Apps Script-løsning skal opdateres.

**Status:** Kildeadgang og rodårsager er nu verificeret. Ændringerne er kun forberedt på en separat **draft-PR**, og produktionssystemet er urørt.

## Integreret lokal afprøvning – 27. oktober 2026

**Ny test:** En privat, lokalt lagret JSON-eksport af det aktive Apps Script-projekt er kørt i et **Node.js VM-testmiljø** med kunstige Google Sheets. Der er ikke foretaget kald til Google Sheets, Gmail eller DartConnect. Modellen anvendte rigtige kildefiler fra eksporten: `Config`, `Ny Torsdag`, `123` og `dartconnectLegacyImport.`. Den staged `W`-rettelse blev anvendt i hukommelsen på den sidste fil.

Fire scenarier blev udført:

1. **`123` indlæses sidst:** `buildDCMatches()` nulstiller historisk `ELO_Processed="X"`. Testen bekræftede den uønskede virkning.
2. **Den data-bevarende importer indlæses sidst:** Den tidligere `X`, ELO-felter og kamptid bevares, og ny 3-1-kamp bliver korrekt opbygget. Gentaget import ændrer ikke resultatet.
3. **Efterfølgende ELO med den data-bevarende import:** `updateEloFromDCMatches()` lader allerede behandlede kampe være og behandler kun ny kamp. Test bestået.
4. **Efterfølgende ELO med den destruktive import:** Da gammel `X` blev slettet, bliver den gamle kamp behandlet igen, og dens lagrede ELO-eftertal ændres. Testen bekræftede risikoen.

**Vigtig konklusion:** At rette `isTruthyWin_()` alene er **ikke nok** til sikker drift. Begge globale `buildDCMatches()` skal afklares; det er ikke sikkert at stole på Apps Scripts filindlæsningsrækkefølge. Testerne er **lokale integrationstests med mockark**, ikke test af produktions-Gmail, faktiske Apps Script-triggere eller live deployments. Den komplette private JSON-eksport er ikke lagt på GitHub.

**Næste ændring:** På en isoleret testkopi skal der kun være én global `buildDCMatches()` (den data-bevarende), og mailimporten skal testes for fejl før `elo-processed` sættes. Ingen ændringer på aktivt system endnu.


## Isoleret testkopi: konflikt i buildDCMatches fjernet (27. oktober)

Værktøjet `apps-script/tools/prepareLegacyTestCopy.cjs` fremstiller nu en
**privat JSON-testkopi** fra den verificerede 16-filers Apps Script-eksport.
Det gør præcis to ændringer i kopien: fjerner den destruktive
`buildDCMatches()` i `123` og tilføjer forståelse for `Win="W"` i den
data-bevarende `dartconnectLegacyImport.`-implementering. Kildens oprindelige
JSON-fil ændres ikke; andre filer kopieres uændret. Den farlige funktion fjernes
kun, når dens SHA-256 matcher den undersøgte kildeversion – ellers stopper
værktøjet uden output. Det nægter også at skrive i et Git-repository eller
overskrive eksisterende output.

**Privat afprøvning udført:** Begge kildeindlæsningsrækkefølger blev kørt på
kunstige 20-kolonners `DC_Raw`- og 16-kolonners `DC_Matches`-data:
- Historisk `ELO_Processed="X"`, gammel ELO og kamptid forblev uændret.
- Ny kamp med `Win="W"` gav korrekt 3-1 og blev ELO-behandlet én gang.
- Gentagen `buildDCMatches()` ændrede ikke data (idempotens).
- Alle 13 JS-filer kunne parses, og en separat AST-kontrol fandt **kun én**
  global `buildDCMatches()` i testkopien; den øvrige `onOpen()`-dublet
  afventer en særskilt oprydning.

Lokal kommando, hvis en *privat* kildeeksport er tilgængelig:

```bash
node apps-script/tools/prepareLegacyTestCopy.cjs original-private.json ny-privat-testkopi.json
```

Gem **begge JSON-filer uden for GitHub-repoet**. Den nye JSON er en
**forberedt kopi**, ikke en installeret Apps Script-kopi, deployment eller
bevis for gennemført test på rigtigt klubdata. Følgende mangler fortsat:
testscript med korrekt Sheets-kopi, kontrol af triggere, Gmail-fejlscenarier
og praktisk kamp-/UI-test. Ingen produktionskode eller data er ændret.

## onOpen-oprydning i privat testkopi (27. oktober)

Kilden havde to globale `onOpen()`: `Live` og `Menu`. Det ville være
usikkert at stole på, hvilken der køres. Den private kopigenerator
`apps-script/tools/prepareLegacyTestCopy.cjs` laver nu **én** `onOpen()`
i `Menu`, som registrerer **begge** oprindelige menuer uden at ændre deres
handlinger:

- `🎯 Dart` → `Opdater turnering` → `runTournamentUpdate`
- `🎯 DartConnect` → `Importer...` → `chooseImportSource`

Den tidligere `onOpen()` i `Live` fjernes kun fra den private kopi.
Begge oprindelige kildeblokke har en fast SHA-256-kontrol; ved en afvigende
kildeversion stopper værktøjet frem for at gætte. Eksisterende `Live`- og
`Menu`-funktioner uden for de to blokke bevares.

**Efterkontrol:** Den private fulde 16-filers eksport blev opbygget med netop
fire forventede ændrede kildefiler (`123`, `dartconnectLegacyImport.`,
`Live`, `Menu`); alle 13 server-JS-filer kunne parses, og der er kun én
global `buildDCMatches()` og én global `onOpen()` tilbage. I en isoleret
JavaScript-UI-mock oprettede det nye `onOpen()` **begge** menuer med de
oprindelige handlers. GitHub CI-testen kontrollerer tilsvarende begge menuer,
forhindrer uverificerede kildeændringer og tester anden Legacy-kode.

**Ikke live-testet:** dette er ikke afprøvet i selve Google Sheets-UI, og
`chooseImportSource()`s eksisterende parameterproblem er endnu ikke løst.
Ingen produktionsprojektfiler, triggere eller deployments er ændret.


## Importmenu: klub/hjem adskilt i privat testkopi (27. oktober)

Den aktuelle `Menu.chooseImportSource()` viser “Ja = Klub” og “Nej = Hjem”.
Begge valg kalder imidlertid samme `Ny Torsdag.importRecapStats()`, som **ikke**
modtager et kildeargument og altid søger efter
`label:DartConnect from:matchrecap@email.dartconnect.com` i klubaftenens
datovindue. “Hjem”-valget blev dermed behandlet som klubimport.

I den **private** kopigenerator skiftes den checksum-kontrollerede menu
til ét entydigt spørgsmål: “Kun klubbens DartConnect-kampe importeres.
Fortsæt?”. Et **Ja** kalder `importRecapStats()` uden et ignoreret argument,
mens **Nej** ikke foretager sig noget. Hjemmeimport er **ikke implementeret**
i dette trin.

Automatiske isolerede tests kontrollerer både Ja/Nej og, at en ændret,
ikke-verificeret menukilde afvises. Dette er **ikke en ændring i den aktive
Google Sheet-menu**. På længere sigt kræver hjemmekampe en selvstændig
datastrøm og eksplicit beslutning, før menuvalget kan tilbydes igen.

**Fortat åbent:** `Ny Torsdag.importRecapStats()` sætter i den aktive kode
`elo-processed` før `DC_Raw`-rækkerne er skrevet. Det er den næste
sikkerhedsrettelse til en isoleret kopi.

## Kontrol af genoptagelse efter delvis import

Testkopiens `legacyRecapImportSafe.gs` kontrollerer nu eksisterende
`DC_Raw`-data pr. **MatchID + game + spiller** (kolonner A, C og D).
Et eksisterende MatchID alene betragtes ikke som bevis for en komplet
import. Hvis kun nogle spiller-/leg-rækker blev gemt før en fejl,
genindlæses recapen, og kun de manglende rækker føjes til. Gmail-mærket
sættes først efter vellykket skrivning og `SpreadsheetApp.flush()`.

Syv isolerede tests kontrollerer normal import, skrivefejl, flush-fejl,
delvis fejl i en mailtråd, delvist gemt kamp, mislykket Gmail-mærkning
og samme recap i to tråde. Der er **ikke kørt en ægte Apps Script-test i
Google Sheets eller en Gmail-test**. Al produktionskode er stadig urørt.

## Samtidig import: lås og fejlgendannelse (27. oktober)

**Nyt sikkerhedsværn i testkopien:** Den staged `importRecapStats()` tager en
`LockService.getScriptLock().tryLock(30000)` før den læser `DC_Raw` eller
søger i Gmail. Dermed kan to samtidige importer i det samme Apps Script-projekt
ikke begge basere sig på forældede eksisterende rækker. Ved låsekonflikt
afbryder importen uden at skrive eller mærke noget; ved normal afslutning
eller fejl frigives låsen i `finally`.

En tidligere importer-kontrol blev styrket: eksistens kontrolleres pr.
`MatchID + Game + Player` i `DC_Raw` i stedet for kun pr. `MatchID`.
Efter delvist persistente data bliver kun manglende spiller-/leg-rækker
tilføjet; allerede gemte rækker duplikeres ikke.

**Verificeret:** 10 isolerede recap-tests (inklusive låsekonflikt og
låsfrigivelse efter gemme-, flush- og Gmail-label-fejl) bestod i
GitHub Actions; øvrige regressionstests bestod. De SHA-256-verificerede
blokke i den private kildeeksport er stadig identiske med deres auditerede
originaler. **Ikke testet mod en faktisk Google Sheet-tilknyttet Apps
Script-kørsel**; tilsluttet Drive-integration kan redigere Sheets, men
eksekverer ikke Apps Script. Ingen merge, deploy eller produktionsændringer.


## Ret: undgå dobbelt lås under torsdagspipelinen (27. oktober)

**Fund i den originale 16-filers kildeeksport:** både
`Ny Torsdag.opdaterKlubaften()` og `123.opdaterEloKlubaften()`
kalder `LockService.getScriptLock().tryLock(1000)` **før** de kalder
`importRecapStats()`. Den staged importer havde samtidig fået sin egen
`getScriptLock().tryLock(30000)`. Dokumentationen garanterer ikke, at en
ny lock fra samme eksekvering kan genindhentes sikkert; dobbelt lås var
derfor en alvorlig potentielt blokerende fejl.

**Rettet kun i testkopien:** `importRecapStats()` tager fortsat
script-låsen ved menu-/manuel import og kalder
`importRecapStatsUnderLock_()` internt. De to allerede låsede
torsdagsrutiner kalder derimod `importRecapStatsUnderLock_()` direkte
mens de holder deres oprindelige lås og frigiver den i deres eksisterende
`finally`. `opdaterLiveDashboard()` uden en ydre lås beholder kaldet
til `importRecapStats()`.

Kopigeneratoren accepterer kun denne ændring, når de **to oprindelige
pipeline-blokkes SHA-256 er identiske** med den auditerede eksport. De
fem tidligere checksum-kontrollerede kildeblokke er også verificeret
mod samme private eksport. Enhver kildeafvigelse kræver ny audit.

Automatiske regressionstests kontrollerer direkte import, pipeline med
allerede holdt lås og frigivelse ved fejl. Apps Script-runtime og
faktiske installérbare triggere er **ikke testet**. Dette er fortsat
kun en draft PR; ingen ændringer i Jydens aktive klubsystem.

**Yderligere risiko til særskilt sprint:** Gmail søgning med
`-label:elo-processed` udelukker tidligere behandlede tråde. Hvis en
Gmail-tråd senere modtager en ny DartConnect-kamp, bør vi undersøge,
om den kan blive overset. Det er ikke rettet i denne ændring.
