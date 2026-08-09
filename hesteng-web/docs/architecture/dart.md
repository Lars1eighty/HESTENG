# HESTENG Dart Architecture

**Version:** 1.0
**Status:** Approved

---

# Formål

HESTENG Dart er det første sportsmodul på HESTENG Platform.

Modulet indeholder alle dartspecifikke domæner, regler og processer.

---

# Ansvar

Dart-modulet har ansvar for:

- Aktiviteter
- Aktivitetstyper
- Spiltyper
- Regelsæt
- Tilmeldinger
- Puljer
- Runder
- Kampe
- Legs
- Boards
- Boardtildelinger
- Boardkø
- Statistik
- Scoring
- DartConnect-integration

---

# Designprincipper

- Dart-modulet må bygge oven på Core.
- Dart-modulet må aldrig ændre Core.
- Dart-specifik logik må aldrig placeres i Core.

---

# Aggregate Root

Den centrale klasse i Dart-modulet er:

## Activity

Activity ejer:

- Season
- Registrations
- Pools
- Rounds
- Matches
- Board Assignments
- Queue
- Results
- Statistics
- Rating
- AI

Alle processer starter fra en Activity.

---

# Domænemodel

Dart består af følgende domæner:

- Activity
- ActivityType
- Season
- GameType
- RuleSet
- Registration
- Pool
- Round
- Match
- Leg
- Board
- BoardAssignment
- Queue
- Event

---

# Engines

Dart anvender følgende engines:

- H-Rating Engine
- Scoring Engine
- Statistics Engine
- AI Engine
- Seed Engine

Alle engines kan udskiftes uden at ændre domænemodellen.

---

# Dataflow

DartConnect
↓
Import
↓
Activity
↓
Match
↓
Leg
↓
Statistics
↓
H-Rating
↓
Player Card
↓
Dashboard

---

# Driftstilstande

En aktivitet kan afvikles i:

- Automatisk
- Assisteret
- Manuel

---

# Fremtid

Følgende funktioner forventes senere:

- Egen scoring
- Kamera-integration
- API-scoring
- Træningsmodul
- Heatmaps
- AI Coach