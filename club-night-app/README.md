# HESTENG Klubaften

Klublederen indsætter en spillerliste, laver puljer og vælger to eller tre
baner i hver pulje. Det gemte program får et fast spillerlink, og begge
visninger bygger på samme kampfordeling. Udskrift bruger én A4-side pr. pulje.

```sh
npm test
npm run dev
```

Den lokale test bruger en midlertidig SQLite-database. En hostet udgave
bruger D1-bindingen `DB` med migreringen i `drizzle/`. Apps Script og
regnearksadgang er ikke en del af opsætningen.

Klublederens adgang kommer fra værtsplatformens godkendte bruger-id.
Spillersiden henter det gemte program via klubbens tilfældige link.
