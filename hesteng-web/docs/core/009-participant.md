# Participant

## Formål

En Participant er den enhed, der deltager i en Match.

En Match spilles altid mellem præcis to Participants.

En Participant kan repræsentere:

- SportsProfile
- Team

Dermed bliver Match uafhængig af om der spilles:

- Single
- Double
- Hold

---

# Ansvar

Participant er ansvarlig for:

- Identitet
- Deltagelse i kampe

Participant ejer IKKE:

- Resultater
- Statistik
- Rating

---

# Typer

Mulige typer

- SportsProfileParticipant
- TeamParticipant

Senere kan andre typer tilføjes uden at ændre Match.

Eksempler

- Mixed Team
- Nation
- Klubhold

---

# Identitet

- Id
- Type

---

# Relationer

Participant

→ SportsProfile

eller

→ Team

Aldrig begge.

---

# Designprincipper

Match arbejder altid mod Participant.

Ikke mod SportsProfile.

Ikke mod Team.

Dermed bliver Match generisk.

---

# Eksempler

Single

Participant
↓

SportsProfile (Lars)

Double

Participant
↓

Team
├── Lars
└── Peter

Holdkamp

Participant
↓

Team
├── Lars
├── Peter
├── Kim
└── Ole

Match er fuldstændig ens.

Kun Participant ændrer sig.

---

# Fremtid

Participant er designet til senere at understøtte:

- Single
- Double
- Hold
- Mixed
- Internationale hold
- Nye sportsgrene

Ingen ændringer i Match bør være nødvendige.