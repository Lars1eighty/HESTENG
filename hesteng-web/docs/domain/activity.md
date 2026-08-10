# Activity

**Module:** Dart
**Version:** 1.0
**Status:** Draft

---

# Formål

En Activity repræsenterer en sportsaktivitet.

Det kan eksempelvis være:

- Klubaften
- Turnering
- Liga
- Træningsaften
- Klubmesterskab

Activity er den centrale enhed i Dart-modulet.

---

# Ansvar

Activity har ansvar for:

- Aktivitetstype
- Organisation
- Deltagere
- Spiltype
- Regelsæt
- Puljer
- Runder
- Kampe
- Resultater
- Statistik
- H-Rating
- Status

---

# Egenskaber

- ActivityId
- OrganisationId
- ActivityTypeId
- SportId
- Navn
- Beskrivelse
- StartDatoTid
- SlutDatoTid
- Status
- Aktiv
- Oprettet
- Ændret
- BestOfLegs
- BestOfSets

---

# Relationer

En Activity tilhører:

- én Organisation
- én Sport
- én ActivityType

En Activity kan have:

- mange Registrations
- mange Pools
- mange Rounds
- mange Matches
- mange Boards
- mange Resultater

En Activity anvender:

- ét GameType
- ét RuleSet

---

# Activity ejer

- Registrations
- Pools
- Rounds
- Matches
- Resultater

Activity refererer til:

- GameType
- RuleSet

---

# Business Rules

- En Activity kan oprettes uden deltagere.
- En Activity kan ikke startes uden et valgt GameType.
- En Activity kan ikke startes uden et valgt RuleSet.
- Når en Activity afsluttes, bliver resultater, statistik og H-Rating låst.
- Historiske Activities må aldrig slettes.

---

# Fremtidige udvidelser

Eksempler:

- Live streaming
- Sponsorinformation
- Kameraer
- AI-analyse
- Tilskuertilstand

Disse ændrer ikke Activitys ansvar.

---

# Bemærkning

Activity er Aggregate Root for Dart-modulet.

Alle dartspecifikke processer starter fra en Activity.