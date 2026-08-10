# Team

## Formål

Et Team er en samling af SportsProfiles,
der optræder som én Participant.

Et Team kan være:

- Double
- Hold
- Midlertidigt Showdouble-hold
- Fast klubhold
- Landshold

Et Team kan være permanent eller oprettes kun til én Activity.

---

# Ansvar

Team er ansvarlig for:

- Medlemmer
- Teamnavn
- Teamtype
- Status

Team ejer IKKE:

- Kampe
- Resultater
- Statistik
- Rating

---

# Identitet

- Id
- OrganizationId (valgfri)
- ActivityId (valgfri)

---

# Typer

Eksempler

- Permanent
- Activity
- Random
- National
- Club

---

# Medlemmer

Et Team består af:

- 2 spillere (Double)
- X spillere (Hold)

Alle medlemmer er SportsProfiles.

---

# Navn

Eksempler

FCM

AGF

Lars / Peter

Team 7

Random Team 12

Planner kan automatisk navngive midlertidige teams.

---

# Status

- Active
- Inactive
- Archived

---

# Relationer

Team

→ SportsProfiles

→ Participant

→ Activities

---

# Designprincipper

Et Team er uafhængigt af kampe.

Match spiller altid mod en Participant.

Participant kan pege på Team.

Dermed ændres Match aldrig.

---

# Showdouble

Showdouble opretter nye Teams for hver runde.

Gamle Teams bevares i historikken.

Dermed kan HESTENG vise:

- Hvem spillede sammen?
- Statistik for teamet
- Historik

Ingen data overskrives.

---

# Fremtid

Team er designet til senere at understøtte:

- Showdouble
- Holdturnering
- Liga
- Landshold
- AI Team Analyzer

Ingen ændringer i Match eller Participant bør være nødvendige.