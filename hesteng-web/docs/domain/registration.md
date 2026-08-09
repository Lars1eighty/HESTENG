# Registration

**Module:** Dart
**Version:** 1.0
**Status:** Draft

---

# Formål

En Registration repræsenterer en tilmelding til en Activity.

En Registration forbinder en SportsProfile med en Activity.

---

# Ansvar

Registration har ansvar for:

- Deltagelse
- Check-in
- Seedning
- Startstatus
- Fravær

---

# Egenskaber

- RegistrationId
- ActivityId
- SportsProfileId
- Seed
- CheckInTime
- Status
- Oprettet
- Ændret

---

# Relationer

En Registration tilhører:

- én Activity
- én SportsProfile

En Registration kan senere blive placeret i:

- én Pool

---

# Registration ejer

- Check-in
- Seed
- Deltagerstatus

Registration ejer ikke:

- Kampe
- Statistik
- H-Rating

---

# Business Rules

- En SportsProfile kan kun registreres én gang pr. Activity.
- Check-in er valgfrit.
- Seed kan være tom.
- En Registration kan annulleres før Activity starter.
- Historiske Registrationer må aldrig slettes.

---

# Status

Mulige statusser:

- Registreret
- Checket ind
- Afmeldt
- Udeblevet
- Diskvalificeret

---

# Bemærkning

Registration beskriver kun deltagelsen.

Puljer, kampe og resultater oprettes først efter registreringen.