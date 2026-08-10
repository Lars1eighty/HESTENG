# Registration

## Formål

En Registration forbinder et SportsProfile med en Activity.

En spiller deltager ikke direkte i en Activity.

Det er Registration, der repræsenterer deltagelsen.

---

# Ansvar

Registration er ansvarlig for:

- Deltagelse
- Check-in
- Seedning
- Status
- Placering i turneringen

Registration ejer IKKE:

- Spilleren
- Aktiviteten
- Kampe
- Resultater

---

# Identitet

- Id
- ActivityId
- SportsProfileId

---

# Basisoplysninger

- RegistrationNumber
- RegistrationTime
- Source

Source kan være:

- Manual
- Online
- Import
- Invitation
- Wildcard

---

# Status

Mulige værdier

- Registered
- CheckedIn
- Active
- Withdrawn
- Disqualified
- NoShow
- Finished

Status gælder kun for denne Activity.

SportsProfile påvirkes ikke.

---

# Check-in

- CheckedInAt
- CheckedInBy

Planner må først planlægge spillere,
der er checket ind.

---

# Seedning

Planner kan anvende:

- Seed
- Ranking
- Rating
- Lodtrækning

Registration gemmer kun resultatet.

Ikke beregningen.

---

# Placering

Registration kan referere til:

- Pool
- Position
- BoardGroup

Dette ændrer sig under Activity.

---

# Matchhistorik

Registration refererer til:

- Matches
- Wins
- Losses

Data beregnes.

Gemmes ikke dobbelt.

---

# Resultat

Registration kan have:

- FinalPosition
- Prize
- Qualification

Eksempel

Nr. 3

Videre til A-slutspil

---

# Board Requirements

Registration kan have midlertidige krav.

Eksempel

Denne aktivitet kræver:

- Handicap Board

Dette ligger her.

Ikke på SportsProfile.

SportsProfile beskriver spilleren.

Registration beskriver deltagelsen.

---

# Relationer

Registration

→ Activity

→ SportsProfile

→ Pool

→ Matches

→ FinalResult

---

# Designprincipper

Registration er bindeleddet.

SportsProfile eksisterer uden Activity.

Activity eksisterer uden SportsProfile.

Registration binder dem sammen.

---

# Fremtid

Registration er designet til senere at understøtte:

- Check-in via QR
- Automatisk seedning
- Planner
- Flow Engine
- Venteliste
- Sen tilmelding
- Omplacering
- Wildcards

Ingen ændringer i modellen bør være nødvendige.