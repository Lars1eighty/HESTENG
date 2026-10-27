# HESTENG Legacy UI – første sikre datakobling

Status: **Dataskema verificeret via læseadgang til aktivt regneark 26-10-2026; adapter endnu ikke installeret, deployeret eller afprøvet i Apps Script.**

## Valgt system
- **Legacy** er fortsat klubløsningen til Jyden. DartConnect scorer kampe og udsender fortsat DartConnect-kampmails.
- HESTENG Club (egen scorer) er et **andet** system. Dette arbejde må ikke blandes ind i Club.
- V9.1 (`HESTENG_Legacy_Blaa_V9_1_Tilmelding_Uden_Baner.html`) og V42 (`HESTENG_Legacy_V42_Spillerprofil_Alle_Skaerme.html`) er **lokale HTML-prototyper**, ikke online-apps.
- V9.1 har eksempelspillere og lokale JavaScript-variabler. V42 har et fast dataudtræk fra 15. oktober 2026. Ingen af dem henter fra Google Sheets.

## Læseadapter
`apps-script/legacyUiReadOnlyData.gs` indeholder:
- `hestengLegacyReadOnlyDiagnosis()`: kun arknavne, rækkeantal og kolonneoverskrifter.
- `hestengLegacyReadOnlySnapshot()`: kun læsning af Players, Tilmelding, Øvrige spillere, Live Aktiv og DC_Matches.
- **Ingen** `doGet`, Gmail-appkald, triggere, `setValues`, ændring af ELO eller importer.
- Den læser højst 500 af de **sidste rækker** fra DC_Matches, og advarer når de ikke dækker hele historikken.
- Kun **Players** bestemmer spillernavn og ELO; deltagere i Tilmelding uden Players-post bliver udeladt fra svar (men ikke slettet i arket).
- `Live Aktiv` bidrager med **rank**, **Rank Δ** og **ELO Δ**, men ELO hentes stadig fra Players og forskelle advares om.
- Eksisterende `Leaderboard.html` kalder `getELOData()`. Den nye adapter har nu denne read-only funktion med de fem felter `rank`, `name`, `elo`, `rankDelta` og `eloDelta`. Det er **kun staged kode**, ikke en funktion installeret i produktion. Tomme deltafelter forbliver tomme – aldrig opfundne null/0-værdier.
- Navne og nøgleværdier læses med verificerede **kolonneoverskrifter**, ikke bare kolonnepositioner. Ændres skemaet, springes den usikre kilde over med advarsel.
- Matchfeltet `ELO_Processed` kan indeholde teksten `X` (ikke blot boolean `true`). Der beregnes ikke ELO i adapteren.

Snapshot-eksempel (fiktive navne):
```json
{
  "version": 1,
  "readOnly": true,
  "players": [
    { "name": "Spiller A", "elo": 1400, "registered": true },
    { "name": "Spiller B", "elo": 1200, "registered": false }
  ],
  "liveElo": [{ "rank": 1, "name": "Spiller A", "elo": 1400 }],
  "matches": [{
    "id": "example-match",
    "date": "2026-10-15T19:05:00",
    "winner": "Spiller A",
    "loser": "Spiller B",
    "winnerLegs": 3,
    "loserLegs": 1,
    "eloProcessed": "X"
  }],
  "warnings": []
}
```

## Verificeret mod det aktive Google Sheet – 26. oktober 2026

| Ark | Kolonner bekræftet | Funktion |
| --- | --- | --- |
| Players | Navn, ELO, Sidst Spillet, Aktiv | Autoritativ spillerliste og ELO |
| Tilmelding | Med, Navn, ELO | Afkrydsning/tilmelding |
| Øvrige spillere | Med, Navn, ELO | Supplerende spillerliste |
| DC_Matches | MatchID, Dato, Vinder, Taber, VinderLegs, TaberLegs, ELO_Processed m.fl. | Kampresultater |
| Live Aktiv | Rank, Name, ELO, Rank Δ, ELO Δ | Aktiv ELO-ranking |

Observationer ved læsning: 53 Players, 38 i Tilmelding, 15 i Øvrige spillere,
27 tilmeldte og 38 i Live Aktiv. De 53 spillere optrådte alle præcis én gang
på tværs af tilmeldingslisterne, med ELO der svarede til Players.

Den offentlige statistikfane Public_Avg har data i kolonne C, men **ingen
kolonneoverskrift i C**. Derfor integrerer vi ikke gennemsnit fra den endnu.
Live puljer/TV skal også knyttes til kontrollerede kilder.

## Næste faktiske UI-tilkobling
1. Kontrollér stadig scriptprojektet og `hestengLegacyReadOnlyDiagnosis` **inden installation**, og afklar hvilke eksisterende `doGet()`/HtmlService-filer den aktive webapp anvender. Må ikke lave en ekstra `doGet()`.
2. Få V9.1's model fra `snapshot.players.map((p, i) => ({id:i, name:p.name, elo:p.elo, checked:p.registered}))` ved første indlæsning. **Dette er en UI-kontrakt, ikke en aktuel forbindelse**, og tilmelding må ikke skrives til Google Sheets, før skriveflowet er særskilt godkendt.
3. Brug kun read-only kampdata fra `snapshot.matches` til kampoversigt; resultater lagres stadig kun via eksisterende DartConnect-flow.
4. V42 kan bruge `snapshot.liveElo` til ELO-skærmen. Den gamle `Leaderboard.html` kan bruge staged `getELOData()`, **når** korrekt `doGet` og adgang er testet. Verificér stadig de **faktiske** puljestillinger, 180'ere, lukninger og AVG-kilder. Der må ikke laves kunstige puljer eller opdigtede gennemsnit.
5. Når Apps Script-projekt og adgangskontrol er bekræftet: Forbind de to HTML-prototyper via eksisterende, autentificeret servervej (ikke offentlig JSON) og test anonym/gæsteadgang særskilt.

## Sikkerhedsbarrierer
- Funktionen må **ikke** udstilles som offentligt anonymt API. Den viser navne, deltagelse og kampdata.
- Verificér adgang og deployment på det aktive Apps Script-projekt før UI-integrationen.
- Tag backup af aktive scripts og kontrolark før nogen ændring i produktionen.
- Lad `buildDCMatches`, `opdaterKlubaften`, importer, triggere og `elo-processed` være urørte.
- Gamle kilder har konkurrerende `buildDCMatches`-definitioner; hvilken der er aktiv, vides ikke.

## Test
Ny mock-baseret test: `node --test apps-script/tests/legacyUiReadOnlyData.test.cjs` fra repository-roden.
Dækker ELO, fremmede navne, kampfelter, manglende kolonner, diagnostik, historikgrænse samt UI-kontrakter til V9.1 og V42.
Google Sheets er **læst direkte** og kolonner/antal kontrolleret, men automatiske tests anvender stadig mockdata.
De tester **ikke** kørsel i aktivt Apps Script, autentificering, opdatering af brugerflader eller DartConnect-mails.
