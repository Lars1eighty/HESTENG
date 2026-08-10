# Board

## Formål

Et Board er en fysisk ressource, hvor en kamp kan afvikles.

Board er ikke dart-specifikt.

Et Board kan være:

- Dartbane
- Badmintonbane
- Padelbane
- Billardbord
- Bordtennisbord
- osv.

---

# Ansvar

Board er ansvarlig for:

- Identitet
- Egenskaber
- Status
- Tilgængelighed

Board ejer IKKE:

- Kampe
- Spillere
- Resultater

---

# Identitet

- Id
- OrganizationId

---

# Basisoplysninger

- Name
- Number
- Description
- Active

---

# Type

Eksempler

- Standard
- Handicap
- TV
- Streaming
- Finale
- Elektronisk

Et Board kan have flere typer.

---

# Status

Mulige værdier

- Available
- Reserved
- InUse
- Maintenance
- OutOfService

---

# Kapacitet

Board kan have:

- MaxParticipants
- SupportedMatchTypes

Eksempel

Et board kan bruges til:

- Single
- Double
- Team

---

# Features

Board kan have features.

Eksempler

- HandicapAccessible
- Camera
- LiveStreaming
- ElectronicScoring
- TVScreen

Planner og Flow Engine kan bruge disse.

---

# Tilgængelighed

Board kan reserveres.

Eksempel

- Kun finaler
- Kun handicap
- Kun tv-kampe

---

# Relationer

Board

→ ActivityBoard

→ Matches

---

# Designprincipper

Board er en ressource.

Et Board ved intet om turneringen.

Activity bestemmer,
hvornår Board bruges.

---

# Fremtid

Board er designet til senere at understøtte:

- Automatisk boardtildeling
- Planner
- Flow Engine
- Live Scoreboard
- iPad Scoreboard
- Sensorer
- Kameraer

Ingen ændringer i modellen bør være nødvendige.