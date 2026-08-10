# Result

## Formål

Et Result beskriver udfaldet af en Match.

Result er den officielle registrering af,
hvordan kampen sluttede.

---

# Ansvar

Result er ansvarlig for:

- Vinder
- Taber
- Slutcifre
- Status
- Afslutning

Result ejer IKKE:

- Statistik
- Rating
- Beregninger

---

# Identitet

- Id
- MatchId

---

# Status

Mulige værdier

- Pending
- Finished
- Walkover
- Retired
- Cancelled
- Abandoned

---

# Vindere

Result refererer til:

- WinningSide
- LosingSide

Match ændres aldrig.

---

# Score

Eksempler

Legs

3-2

Sæt

4-1

Point

21-18

Result ved ikke,
hvad tallene betyder.

Det gør ScoringFormat.

---

# Sluttid

- StartedAt
- FinishedAt
- Duration

Disse data bruges senere af:

- Statistik
- Planner
- Flow Engine

---

# Godkendelse

- RegisteredBy
- RegisteredAt

Senere kan der tilføjes:

- ApprovedBy

---

# Rettelser

Result må gerne ændres.

Alle ændringer logges.

Historik slettes aldrig.

---

# Relationer

Result

→ Match

→ WinningSide

→ LosingSide

---

# Designprincipper

Result beskriver:

"Hvad skete?"

Statistik beskriver:

"Hvad betyder det?"

Rating beskriver:

"Hvad ændres?"

Disse områder må aldrig blandes.

---

# Fremtid

Result er designet til senere at understøtte:

- Automatisk statistik
- H-Rating
- Elo
- AI analyse
- Planner
- Flow Engine
- Historik

Ingen ændringer i modellen bør være nødvendige.