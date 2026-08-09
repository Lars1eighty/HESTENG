# Organisation

**Module:** Core
**Version:** 1.0
**Status:** Approved

---

# Formål

En Organisation repræsenterer en klub, forening eller anden sportsorganisation.

Organisationen ejer aktiviteter, boards, medlemmer og lokale indstillinger.

---

# Ansvar

Organisation har ansvar for:

- Medlemmer
- Aktiviteter
- Boards
- Lokale indstillinger
- Roller og rettigheder

Organisation ejer aldrig personen.

---

# Egenskaber

- OrganisationId
- Navn
- KortNavn
- Organisationsnummer (valgfrit)
- Land
- Aktiv
- Oprettet
- Ændret

---

# Relationer

En Organisation kan have:

- mange Memberships
- mange Aktiviteter
- mange Boards

En Organisation kan understøtte:

- én eller flere sportsgrene

---

# Organisation ejer

- Aktiviteter
- Boards
- Lokale indstillinger

Organisation ejer ikke:

- Person
- SportsProfile
- H-Rating

---

# Business Rules

- En Organisation kan oprettes uden medlemmer.
- En Person kan være medlem af flere organisationer.
- En Organisation kan understøtte flere sportsgrene.
- Sletning af en Organisation må aldrig slette historiske data.

---

# Fremtidige udvidelser

Eksempler:

- Logo
- Adresse
- Kontaktoplysninger
- Hjemmeside
- Sponsorinformation

Disse påvirker ikke Organisationens ansvar.

---

# Bemærkning

Organisation er den administrative enhed på HESTENG Platform.

SportsProfile tilhører personen.

Aktiviteter tilhører organisationen.