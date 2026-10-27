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
