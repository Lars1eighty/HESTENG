# SportsProfile

**Module:** Core
**Version:** 1.0
**Status:** Approved

---

# Formål

En SportsProfile beskriver en Persons identitet inden for én bestemt sport.

En Person kan have én SportsProfile pr. sport.

SportsProfile er ejer af alle sportsrelaterede data.

---

# Ansvar

SportsProfile har ansvar for:

- H-Rating
- Statistik
- Historik
- Rekorder
- Sportspecifikke indstillinger

SportsProfile indeholder aldrig personoplysninger.

---

# Egenskaber

- SportsProfileId
- PersonId
- SportId
- Aktiv
- Oprettet
- Ændret

---

# Relationer

En SportsProfile tilhører:

- én Person
- én Sport

En SportsProfile kan have:

- én H-Rating
- mange RatingHistory
- mange Statistikker
- mange Aktiviteter
- mange Kampe

---

# SportsProfile ejer

- H-Rating
- Statistik
- Historik
- Rekorder

---

# Business Rules

- En Person kan kun have én SportsProfile pr. sport.
- SportsProfile må aldrig slettes, hvis der findes historiske data.
- SportsProfile følger personen mellem organisationer.
- H-Rating følger SportsProfile – ikke organisationen.

---

# Fremtidige udvidelser

Eksempler:

- Favoritposition
- Spillestil
- Hånd (højre/venstre)
- Personlige mål

Disse påvirker ikke SportsProfiles ansvar.

---

# Bemærkning

SportsProfile er forbindelsen mellem Core og sportsmodulerne.

Alle sportsrelaterede funktioner tager udgangspunkt i SportsProfile.