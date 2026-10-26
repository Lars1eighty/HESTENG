# HESTENG Legacy UI – første sikre datakobling

Status: **Forberedt, ikke installeret, ikke deployeret og ikke verificeret mod det aktive regneark**.

## Valgt system
- **Legacy** er fortsat klubløsningen til Jyden. DartConnect scorer kampe og udsender fortsat DartConnect-kampmails.
- HESTENG Club (egen scorer) er et **andet** system. Dette arbejde må ikke blandes ind i Club.
- V9.1 (`HESTENG_Legacy_Blaa_V9_1_Tilmelding_Uden_Baner.html`) og V42 (`HESTENG_Legacy_V42_Spillerprofil_Alle_Skaerme.html`) er **lokale HTML-prototyper**, ikke online-apps.
- V9.1 har eksempelspillere og lokale JavaScript-variabler. V42 har et fast dataudtræk fra 15. oktober 2026. Ingen af dem henter fra Google Sheets.

## Læseadapter
`apps-script/legacyUiReadOnlyData.gs` indeholder:
- `hestengLegacyReadOnlyDiagnosis()`: kun arknavne, rækkeantal og kolonneoverskrifter.
- `hestengLegacyReadOnlySnapshot()`: kun læsning af Players, Tilmelding, Øvrige spillere og DC_Matches.
- **Ingen** `doGet`, Gmail-appkald, triggere, `setValues`, ændring af ELO eller importer.
- Den læser højst 500 af de **sidste rækker** fra DC_Matches, og advarer når de ikke dækker hele historikken.
- Kun **Players** bestemmer spillernavn og ELO; deltagere i Tilmelding uden Players-post bliver udeladt fra svar (men ikke slettet i arket).

Snapshot-eksempel (fiktive navne):
```json
{
  "version": 1,
  "readOnly": true,
  "players": [
    { "name": "Spiller A", "elo": 1400, "registered": true },
    { "name": "Spiller B", "elo": 1200, "registered": false }
  ],
  "matches": [{
    "id": "example-match",
    "date": "2026-10-15T19:05:00",
    "winner": "Spiller A",
    "loser": "Spiller B",
    "winnerLegs": 3,
    "loserLegs": 1,
    "eloProcessed": "true"
  }],
  "warnings": []
}
```

## Næste faktiske UI-tilkobling
1. Kontrollér aktive kolonneoverskrifter via `hestengLegacyReadOnlyDiagnosis` og afklar, hvilke eksisterende `doGet()` / HtmlService-filer den aktive webapp anvender. Må ikke lave en ekstra `doGet()`.
2. Få V9.1's spillerliste fra `snapshot.players`. Hver UI-spiller skal have `elo`; V9.1's eksisterende demo-registreringer mangler denne værdi, så dens nuværende ELO-sortering virker ikke korrekt.
3. Brug kun read-only kampdata fra `snapshot.matches` til kampoversigt; resultater lagres stadig kun via eksisterende DartConnect-flow.
4. Verificér de **faktiske** puljeark og Live-/AVG-kilder. De er endnu ikke forbundet i adapteren. Der må ikke laves kunstig puljeplacering eller opfundet gennemsnit.
5. Når skema og adgangskontrol er bekræftet: Forbind V42 med de korrekte live- og statistikdata, og test anonym/gæsteadgang særskilt.

## Sikkerhedsbarrierer
- Funktionen må **ikke** udstilles som offentligt anonymt API. Den viser navne, deltagelse og kampdata.
- Verificér adgang og deployment på det aktive Apps Script-projekt før UI-integrationen.
- Tag backup af aktive scripts og kontrolark før nogen ændring i produktionen.
- Lad `buildDCMatches`, `opdaterKlubaften`, importer, triggere og `elo-processed` være urørte.
- Gamle kilder har konkurrerende `buildDCMatches`-definitioner; hvilken der er aktiv, vides ikke.

## Test
Ny mock-baseret test: `node --test apps-script/tests/legacyUiReadOnlyData.test.cjs` fra repository-roden.
Dækker ELO, fremmed navn, kampfelter, manglende kolonner, diagnostik og begrænset historik.
Den tester **ikke** aktiv Google Sheets, Apps Script-webapp eller DartConnect-mails.
