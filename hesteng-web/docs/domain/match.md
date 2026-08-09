# Match

**Module:** Dart
**Version:** 1.0
**Status:** Draft

---

# Formål

En Match repræsenterer en konkurrence mellem to SportsProfiles inden for en Activity.

Match er den centrale enhed for resultater, statistik og H-Rating.

---

# Ansvar

Match har ansvar for:

- Spillere
- Resultat
- Legs
- Status
- Tidspunkt

---

# Egenskaber

- MatchId
- ActivityId
- RoundId
- BoardAssignmentId (valgfri)
- HomeSportsProfileId
- AwaySportsProfileId
- VinderSportsProfileId
- Status
- StartDatoTid
- SlutDatoTid
- Oprettet
- Ændret

---

# Relationer

En Match tilhører:

- én Activity
- én Round

En Match kan have:

- mange Legs

En Match kan være tildelt:

- ét BoardAssignment

---

# Match ejer

- Legs
- Resultat

---

# Business Rules

- En Match har præcis to deltagere.
- En Match kan ikke afsluttes uden en vinder.
- H-Rating opdateres først, når Match er afsluttet.
- Statistik opdateres først, når Match er afsluttet.
- Historiske Matches må aldrig slettes.

---

# Status

Mulige statusser:

- Planlagt
- Klar
- I gang
- Afsluttet
- Annulleret

---

# Bemærkning

Match er grundlaget for:

- Statistik
- H-Rating
- Historik
- Rekorder

Scoring registreres i de tilhørende Legs.