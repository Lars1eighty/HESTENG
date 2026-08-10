# Competitor

**Module:** Core
**Version:** 1.0
**Status:** Draft

---

# Formål

En Competitor repræsenterer den enhed, der deltager i en konkurrence.

En Competitor kan være:

- én SportsProfile
- ét Team

---

# Ansvar

Competitor har ansvar for:

- Konkurrenceidentitet
- Deltagelse i kampe

Competitor har ikke ansvar for statistik, H-Rating eller historik.

---

# Typer

En Competitor kan være:

- Individual
- Team

---

# Relationer

En Competitor består af:

- én eller flere SportsProfiles

En Competitor kan deltage i:

- mange Matches

---

# Business Rules

- En Match har præcis to Competitors.
- En Competitor skal indeholde mindst én SportsProfile.
- En Team Competitor skal indeholde mindst to SportsProfiles.

---

# Eksempler

Single

Competitor
└── Lars

Double

Competitor
├── Lars
└── Peter

Fodbold

Competitor
└── Herning IF