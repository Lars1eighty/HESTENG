# Membership

**Module:** Core
**Version:** 1.0
**Status:** Approved

---

# Formål

Et Membership beskriver en Persons medlemskab af en Organisation.

En Person kan have flere medlemskaber på tværs af organisationer.

Organisationen ejer medlemskabet – ikke personen.

---

# Ansvar

Membership har ansvar for:

- Relation mellem Person og Organisation
- Roller
- Status
- Indmeldelse
- Udmeldelse

---

# Egenskaber

- MembershipId
- PersonId
- OrganisationId
- Status
- IndmeldtDato
- UdmeldtDato
- Aktiv
- Oprettet
- Ændret

---

# Relationer

Et Membership tilhører:

- én Person
- én Organisation

Et Membership kan have:

- én eller flere Roller

---

# Membership ejer

- Roller
- Status

Membership ejer ikke:

- Person
- Organisation
- SportsProfile

---

# Business Rules

- En Person kan have flere medlemskaber.
- En Organisation kan have mange medlemmer.
- Et medlemskab kan afsluttes uden at historik slettes.
- Historiske medlemskaber bevares.

---

# Fremtidige udvidelser

Eksempler:

- Medlemsnummer
- Kontingent
- Startlicens
- Licensstatus

Disse påvirker ikke Memberships ansvar.

---

# Bemærkning

Membership beskriver relationen mellem Person og Organisation.

En Person kan være aktiv i flere klubber samtidig.