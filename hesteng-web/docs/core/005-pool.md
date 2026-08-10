# Pool

## Formål

En Pool er en gruppe Registrations, der spiller mod hinanden
inden for en Activity.

En Pool eksisterer kun i den Activity, den er oprettet i.

---

# Ansvar

Pool er ansvarlig for:

- Deltagere
- Kampprogram
- Stilling
- Status

Pool ejer IKKE:

- Spillere
- Resultater
- Statistik
- Rating

---

# Identitet

- Id
- ActivityId
- Name
- DisplayOrder

Eksempler:

A
B
C
D

eller

1
2
3
4

---

# Status

Mulige værdier

- Planned
- Running
- Finished

---

# Deltagere

Pool består af Registrations.

Ikke SportsProfiles.

En spiller deltager via sin Registration.

---

# Kampe

Pool refererer til:

- Rounds
- Matches

Planner opretter kampene.

Pool ændrer dem ikke.

---

# Stilling

Stillingen beregnes.

Ikke gemmes.

Eksempler:

- Point
- Vundne kampe
- Vundne legs
- Legdifference
- Indbyrdes

Regelsættet afgør rækkefølgen.

---

# Boards

En Pool kan have:

- Faste boards
- Dynamiske boards

Dette afgøres af Activity.

Eksempel

Version 0.1

Pool A

Board 1
Board 2

Senere kan Flow Engine tildele boards dynamisk.

---

# Planner

Planner bestemmer:

- Antal pools
- Poolstørrelser
- Fordeling af deltagere

Pool ved ikke hvorfor.

Kun resultatet.

---

# Flow Engine

Flow Engine kan:

- Overvåge fremdrift
- Beregne forventet sluttid
- Registrere flaskehalse
- Foreslå ændringer

Pool udfører aldrig ændringer selv.

---

# Relationer

Pool

→ Activity

→ Registrations

→ Rounds

→ Matches

---

# Designprincipper

Pool beskriver:

"Hvem spiller sammen?"

Rounds beskriver:

"Hvornår?"

Matches beskriver:

"Hvem mod hvem?"

Disse tre områder holdes adskilt.

---

# Fremtid

Pool er designet til senere at understøtte:

- Planner
- Flow Engine
- Automatisk pooloptimering
- Forventet sluttid
- Dynamiske boards
- Live status

Ingen ændringer i modellen bør være nødvendige.