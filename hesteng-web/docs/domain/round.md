# Round

**Module:** Dart
**Version:** 1.0
**Status:** Draft

---

# Formål

En Round samler de kampe, der spilles samtidigt inden for en Pool.

Rounds anvendes til at styre rækkefølgen af kampe og turneringens fremdrift.

---

# Ansvar

Round har ansvar for:

- Kampe
- Status
- Start
- Slut

---

# Egenskaber

- RoundId
- PoolId
- Nummer
- Status
- StartDatoTid
- SlutDatoTid
- Oprettet
- Ændret

---

# Relationer

En Round tilhører:

- én Pool

En Round kan have:

- mange Matches

---

# Round ejer

- Matches

---

# Business Rules

- En Round kan oprettes uden kampe.
- En Match kan kun tilhøre én Round.
- En Round kan først afsluttes, når alle kampe er afsluttet.
- Historiske Rounds bevares.

---

# Status

Mulige statusser:

- Oprettet
- Klar
- I gang
- Afsluttet

---

# Bemærkning

Round beskriver turneringens fremdrift.

Boardfordeling håndteres af BoardAssignment.