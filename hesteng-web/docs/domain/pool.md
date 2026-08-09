# Pool

**Module:** Dart
**Version:** 1.0
**Status:** Draft

---

# Formål

En Pool er en gruppe af deltagere inden for en Activity.

Pools anvendes til at organisere deltagere og danne grundlag for kampprogram, stillinger og videre progression.

---

# Ansvar

Pool har ansvar for:

- Deltagere
- Runder
- Stilling
- Status

---

# Egenskaber

- PoolId
- ActivityId
- Navn
- Nummer
- Status
- Oprettet
- Ændret

---

# Relationer

En Pool tilhører:

- én Activity

En Pool kan have:

- mange Registrations
- mange Rounds
- mange Matches

---

# Pool ejer

- Rounds
- Stilling

Pool refererer til:

- Registrations
- Matches

---

# Business Rules

- En Pool kan oprettes uden deltagere.
- En Registration kan kun være i én Pool pr. Activity.
- En Pool kan ikke slettes efter første kamp er startet.
- Historiske Pools bevares.

---

# Status

Mulige statusser:

- Oprettet
- Aktiv
- Afsluttet

---

# Bemærkning

En Pool beskriver kun gruppen.

Kampe organiseres gennem Rounds.