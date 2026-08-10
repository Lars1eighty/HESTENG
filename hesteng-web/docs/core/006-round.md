# Round

## Formål

En Round er en samling af Matches,
der logisk hører sammen.

En Round bruges til at styre rækkefølgen af kampe.

---

# Ansvar

Round er ansvarlig for:

- Nummer
- Status
- Matchrækkefølge

Round ejer IKKE:

- Spillere
- Resultater
- Statistik

---

# Identitet

- Id
- ActivityId
- PoolId
- Number

---

# Status

Mulige værdier

- Planned
- Ready
- Running
- Finished

---

# Matches

Round består af:

- Match 1
- Match 2
- Match 3
- ...

Alle kampe behøver ikke starte samtidigt.

---

# Planlægning

Planner opretter Rounds.

Flow Engine kan senere ændre,
hvornår en Match starter.

Round ændres ikke.

---

# Boards

Rounds har ingen faste boards.

Matches får boards.

Dermed kan samme Round
godt afvikles på forskellige boards.

---

# Relationer

Round

→ Pool

→ Matches

---

# Designprincipper

Round svarer kun på:

"Hvilke kampe hører sammen?"

Ikke:

"Hvor spilles de?"

Ikke:

"Hvornår spilles de?"

Det afgøres af Match og Flow Engine.

---

# Fremtid

Round er designet til senere at understøtte:

- Dynamisk afvikling
- Planner
- Flow Engine
- Live overvågning

Ingen ændringer i modellen bør være nødvendige.