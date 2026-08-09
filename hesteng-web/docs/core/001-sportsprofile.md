# SportsProfile

## Formål

Et SportsProfile repræsenterer en deltager i én bestemt sport.

En person kan have flere SportsProfiles.

Eksempel:

Person
├── Dart
├── Badminton
├── Padel
└── Golf

SportsProfile indeholder sports-specifikke oplysninger og statistik.
Personlige oplysninger ligger på Person.

---

# Ansvar

SportsProfile er ansvarlig for:

- Deltagelse i aktiviteter
- Rating
- Statistik
- Historik
- Sportsindstillinger
- Relation til organisationer

SportsProfile har IKKE ansvar for:

- Login
- Adresse
- Email
- Telefon
- Personlige oplysninger

---

# Identitet

- Id
- PersonId
- SportId

---

# Basisoplysninger

- DisplayName
- ShortName
- Initials
- Status
- CreatedAt
- UpdatedAt

---

# Status

Mulige værdier:

- Active
- Inactive
- Suspended
- Archived

---

# Sportsoplysninger

Eksempler (afhænger af sporten)

Dart

- PreferredSide
- PreferredBoardPosition

Padel

- PreferredSide

Badminton

- DominantHand

---

# Rating

SportsProfile ejer IKKE ratingen.

SportsProfile har relation til:

- RatingHistory
- CurrentRating

HESTENG kan derfor understøtte flere ratingsystemer samtidig.

Eksempel

- H-Rating
- Elo
- Glicko
- TrueSkill

---

# Statistik

SportsProfile ejer IKKE statistik.

Statistik beregnes ud fra historiske kampe.

SportsProfile refererer blot til statistikken.

---

# Historik

SportsProfile refererer til:

- Activities
- Matches
- Results
- Achievements

Historik slettes aldrig.

---

# Organisationer

Et SportsProfile kan være medlem af flere organisationer.

Eksempel

Lars

- Jyden Dartklub
- Vestjysk Dart Union
- Dansk Dart Union

---

# Board Requirements

SportsProfile kan have krav til boards.

Eksempler

- HandicapBoardRequired
- ElectronicBoardPreferred
- TVBoardPreferred

Dette bruges af Planner og Flow Engine.

---

# Relationer

SportsProfile

→ Person

→ Sport

→ Registrations

→ Matches

→ RatingHistory

→ Statistics

→ Achievements

→ Organizations

---

# Designprincipper

SportsProfile beskriver spilleren.

Aktiviteter beskriver deltagelsen.

Kampe beskriver præstationen.

Statistik beskriver historien.

Rating beskriver niveauet.

Disse områder må aldrig blandes.

---

# Fremtid

SportsProfile er designet til senere at understøtte:

- Planner
- Flow Engine
- AI Coach
- Live Scoreboards
- Flere sportsgrene

Ingen ændringer i modellen bør være nødvendige.