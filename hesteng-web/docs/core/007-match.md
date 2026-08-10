# Match

## Formål

En Match er en konkurrence mellem præcis to Participants.

En Participant kan være:

- SportsProfile (Single)
- Team (Double)
- Team (Holdkamp)

Match ved ikke, om det er single, double eller hold.
Det afgøres af MatchType.

---

# Ansvar

Match er ansvarlig for:

- Deltagere
- Status
- Board
- Resultat
- Start/slut
- Side

Match ejer IKKE:

- Spillere
- Rating
- Statistik

---

# Identitet

- Id
- ActivityId
- PoolId
- RoundId

---

# Deltagere

- ParticipantA
- ParticipantB

Der er ALTID præcis to Participants.

---

# MatchType

Eksempler

- Single
- Double
- Team

Participant afgør,
hvem der indgår.

---

# Format

Match refererer til:

- GameFormat
- ScoringFormat

Eksempler

- Best of 5
- Best of 7
- 501 DO
- Cricket

---

# Board

Et Match kan tildeles:

- Board
- StartTime
- ExpectedEndTime

Planner tildeler første plan.

Flow Engine kan senere ændre den.

---

# Status

Mulige værdier

- Planned
- Ready
- Called
- Running
- Finished
- Cancelled

---

# Resultat

Match refererer til:

- Winner
- Loser
- Legs
- Games

Resultatet gemmes.

Statistik beregnes bagefter.

---

# Side

Match består af:

- Side A
- Side B

En Side kan være:

- SportsProfile
- Team

---

# Relationer

Match

→ Activity

→ Pool

→ Round

→ Board

→ Side A

→ Side B

→ Result

---

# Designprincipper

Match ved kun:

"Hvem mødes?"

Ikke:

"Hvem er spillerne?"

Det ved Side.

Dermed kan samme Match-model bruges til:

- Single
- Double
- Holdkampe

---

# Fremtid

Match er designet til senere at understøtte:

- Live scoring
- iPad Scoreboards
- Planner
- Flow Engine
- Automatisk boardtildeling
- AI analyse

Ingen ændringer i modellen bør være nødvendige.