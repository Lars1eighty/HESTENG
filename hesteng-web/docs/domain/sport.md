# Sport

**Module:** Core
**Version:** 1.0
**Status:** Approved

---

# Formål

En Sport beskriver en sportsgren på HESTENG Platform.

Alle sportsmoduler tilknyttes en Sport.

---

# Ansvar

Sport har ansvar for:

- Sportsidentitet
- Navn
- Beskrivelse
- Aktivering af sportsmoduler

Sport indeholder aldrig sportsdata.

---

# Egenskaber

- SportId
- Navn
- KortNavn
- Beskrivelse
- Aktiv
- Oprettet
- Ændret

---

# Relationer

En Sport kan have:

- mange SportsProfiles
- mange Organisationer
- ét sportsmodul

---

# Sport ejer

- Sportsidentitet

Sport ejer ikke:

- Spillere
- H-Rating
- Statistik
- Aktiviteter
- Kampe

---

# Business Rules

- En Sport kan eksistere uden spillere.
- En Sport kan aktiveres eller deaktiveres.
- En Person kan have én SportsProfile pr. Sport.
- Nye sportsgrene må kunne tilføjes uden ændringer i Core.

---

# Fremtidige udvidelser

Eksempler:

- Ikon
- Farvetema
- Standardindstillinger
- Egne ratingmodeller

Disse påvirker ikke Sports ansvar.

---

# Bemærkning

Sport er bindeleddet mellem Core og et sportsmodul.

Eksempler:

- Dart
- Fodbold
- Padel
- Bordtennis
- Badminton