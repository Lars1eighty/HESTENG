# Jyden Klubaften

Spillervisning af puljer og kampprogram fra Jyden Legacy. Klublederen vælger
to eller tre baner pr. pulje. Spillere ser deres runde og modstander i
**Min aften** og hele kampprogrammet i **Alle puljer**.

## Opsætning

1. Brug et selvstændigt Apps Script-projekt med `Code.gs`, `Index.html` og
   `appsscript.json` fra denne mappe. Manifestet aktiverer den avancerede
   Google Sheets-tjeneste med læseadgang.
2. Tilføj scriptegenskaberne `JYDEN_SPREADSHEET_ID` (ID fra Torsdagslisten)
   og `JYDEN_ADMIN_EMAIL` (klublederens Google-konto).
3. Udgiv som webapp med **Execute as: User accessing the web app** og
   adgang for Google-konti. Brug en konto med eksisterende læseadgang til
   Torsdagslisten til at teste spillervisningen.

Appen læser kolonne A–D i de synlige puljefaner. Den gemmer baneantal som
scriptegenskaber i sit eget projekt. Valget gælder, så længe de indlæste
puljer og kampe har samme indhold. Spillere kan hente den nyeste plan med
**Opdatér**.

```
node --test apps-script/tests/jyden-klubaften.test.cjs
```
