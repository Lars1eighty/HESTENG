# HESTENG Legacy – kodeoprydning, status 27. oktober 2026

**Afgrænsning:** Dette er et resultat af statisk gennemgang af gemte kildekopier
fra 16. oktober og filoversigten fra det aktive Apps Script-projekt
`Dart Torsdagsturnering`. Google Drive giver adgang til projektets metadata,
men **ikke** kildefilerne via denne forbindelse. Der er **ingen ændringer
i produktion**, ingen deployment, ingen oprydning i triggers eller regneark.

## Hvor koden faktisk ligger

- Google Apps Script er den aktive Legacy-server. Screenshot viser bl.a.
  `appsscript.json`, `//Arkiv.gs`, `Config.gs`, `Elo.gs.gs`,
  `Index.html`, `Leaderboard.html`, `Leaderboard.gs.gs`,
  `Leaderbord 2,0.gs`, `Live.gs`, `Menu.gs`, `Ny Torsdag.gs`.
  Listen kan fortsætte neden for billedet.
- Det **offentlige** GitHub-repo indeholder i `main` kun
  `apps-script/dartconnectLegacyImport.gs` for Legacy. Det er altså
  **ikke** en fuld kopi af aktivt Apps Script.
- De seks gemte tekstudtræk er kodeblokke, ikke navngivne eksportfiler.
  Man kan derfor ikke antage, at en bestemt blok er en bestemt live-fil.
- Prototyperne **V9.1** og **V42** ligger i ChatGPT's HESTENG-filer, men er
  ikke installeret i Apps Script. V42 indeholder historiske spillerdata:
  **lad være med at lægge den rå fil i det offentlige repository**.

## Faglige fund i tidligere kode – prioriteret

| Prioritet | Observation | Betydning | Sikker handling |
|---|---|---|---|
| **Høj** | Der er to forskellige **top-level** `buildDCMatches()` i arkiverne `Indsat tekst(3).txt` og `Indsat tekst(4).txt`. | Den ene bevarer `ELO_Processed` og eksisterende kampfelter. Den anden **ryder A:G** i `DC_Matches` og skriver `ELO_Processed` blankt. Hvis den sidste kører på aktive data, kan ELO-behandlingsstatus gå tabt. | Undersøg hvad der faktisk er deployeret; fjern/omdøb ikke noget, før der findes backup og der er valgt én kilde til kampopbygning. |
| **Høj** | `Indsat tekst(5).txt` har en `doGet()`, som alene viser “Puljeudskrivning – Webappen er klar”. | Hvis den fungerer som webapp-entrypoint, får man ikke `Index.html` vist. | Find aktiv `doGet` og eventuelle HTML-navigationer, og lav én bevidst indgang på en testdeployment. |
| **Mellem** | Både `opdaterKlubaften()` og `opdaterEloKlubaften()` forekommer i snapshots. | To automatiske kæder kan give dobbelte importer eller samtidige skrivninger. | Læs aktive triggers og funktionskald **før** oprydning. |
| **Mellem** | `backfillInbox183()` markerer også status `skipped` som `elo-processed` i en tidligere kopi. | Kan skjule en mail fra senere importsøgninger. | Isolér historisk backfill fra den løbende torsdagsimport og test genkørsel uden dubletter. |
| **Lav** | `shuffle()` optræder to gange i ét gammelt udtræk. | Begge ser ud til at være **lokale hjælpefunktioner inde i hver sin puljefunktion** – det er **ikke** i sig selv en global navnekollision. | Bevar dem indtil puljealgoritmerne er verificeret. |
| **Mellem** | ELO fra `Players` skal være autoritativ for både `Tilmelding` og `Live Aktiv`. | Ellers kan sortering og visning være inkonsistent. | Læs kun via den nye skemavaliderede adapter, før skriverutiner berøres. |

## Bevis fra Google Sheets

Aktivt kandidatark: `ELO - Torsdagslisten`, senest ændret
22. oktober 2026. Verificeret læseadgang til `Players`, `Tilmelding`,
`Øvrige spillere`, `Live Aktiv` og `DC_Matches`.
På gennemgangsdagen: 53 spillere, 27 med flueben, 38 på Live Aktiv-ranglisten;
ELO-værdier var konsistente på tværs af de læste lister.

## Oprydningens rækkefølge

1. **Uden risiko:** Kør kun den automatiske statiske `auditLegacySource.cjs`
   på en *eksporteret* kopi af alle aktuelle Apps Script-kildefiler. Værktøjet
   læser kode og checker syntax og top-level navnekollisioner; det kalder ikke
   Apps Script eller Google Sheets.
2. **Kortlæg driften:** Match de **aktuelle** filer og triggere til
   `doGet`, `onOpen`, imports, ELO, puljer og Live. Kend status for
   `buildDCMatches` og mail-etiketter.
3. **Risikofri prøvekørsel:** Lav en isoleret testkopi af script **og data**;
   brug ikke den aktive torsdagsturnerings Gmail/Sheets til syntetiske tests.
4. **Én ændring ad gangen:** Et entrypoint, én dataansvarlig importvej og
   ensartet Players-ELO. Kør regression efter hver ændring.
5. **UI:** Tilknyt V9.1 og V42 via autentificeret serveradgang; udelad
   hardcodede spillerdata i repoet. Gennemfør derefter mobil-, Live TV-,
   pulje- og kampresultattest.

## Kommandolinje, hvis man har en kildekopie

```bash
node apps-script/tools/auditLegacySource.cjs /sti/til/AppsScript-eksport/
```

JSON-resultatet viser undersøgt antal filer, konflikter, indgangsfunktioner og
syntaksfejl. **Ingen filer redigeres eller slettes.** Den enkle funktion-scanner
er en heuristik og erstatter ikke manuel kodegennemgang.

**Status:** Scanner og tests er forberedt på separat GitHub-branch.
Den aktive Apps Script-kode kan først ryddes sikkert op, når den fulde,
nuværende kildekode kan læses. Undgå at kopiere rå Live TV-statistik eller
private klubdata til det offentlige GitHub-repo.
