# Person

**Module:** Core
**Version:** 1.0
**Status:** Approved

---

# Formål

En Person repræsenterer et fysisk menneske.

Person er den centrale identitet på HESTENG Platform.

Alle sportsprofiler, medlemskaber og brugeradgange knyttes til en Person.

---

# Ansvar

Person har ansvar for:

- Identitet
- Grundlæggende personoplysninger
- Relation til Sportsprofiler
- Relation til Organisationer
- Relation til User

Person indeholder aldrig sportsdata.

---

# Egenskaber

- PersonId
- Fornavn
- Efternavn
- Fødselsdato
- Køn
- Nationalitet
- E-mail
- Telefon
- Profilbillede
- Aktiv

---

# Relationer

En Person kan have:

- én User
- flere Sportsprofiler
- flere Memberships

---

# Person ejer ikke

- H-Rating
- Statistik
- Kampe
- Historik
- Rekorder

Disse tilhører SportsProfile.

---

# Business Rules

- En Person kan eksistere uden User.
- En Person kan eksistere uden SportsProfile.
- En Person må aldrig slettes, hvis der findes historiske data.
- Navne kan ændres uden at historikken påvirkes.

---

# Fremtidige udvidelser

Eksempler:

- Adresse
- Nødkontakt
- Sociale medier
- Verificeret identitet

Disse påvirker ikke Person-modellens ansvar.

---

# Bemærkning

Person beskriver mennesket.

SportsProfile beskriver personen som sportsudøver.