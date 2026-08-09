# HESTENG Core Architecture

**Version:** 1.0
**Status:** Approved

---

# Formål

HESTENG Core er fundamentet for hele platformen.

Core indeholder kun generelle domæner og funktioner, som kan anvendes af alle sportsgrene.

Core må aldrig indeholde sportspecifik logik.

---

# Ansvar

Core har ansvar for:

- Personer
- Brugere
- Organisationer
- Medlemskaber
- Roller og rettigheder
- Sportsgrene
- Sportsprofiler
- Rating
- Historik
- Logning
- Konfiguration

---

# Designprincipper

Core skal:

- være uafhængig af sportsgrene
- kunne genbruges af alle moduler
- være stabil
- ændres sjældent
- være fundamentet for platformen

---

# Domænemodel

Core består af følgende domæner:

- Person
- User
- Organisation
- Membership
- Role
- Sport
- SportsProfile
- Rating
- RatingHistory
- Log

---

# Domæner

## Person

Beskriver et menneske.

En person kan have flere sportsprofiler.

---

## User

Login til platformen.

En User er knyttet til én Person.

---

## Organisation

En klub, forening eller organisation.

Eksempler:

- Jyden Dartklub
- DDU
- Dansk Boldspil Union

---

## Membership

Forbinder en Person med en Organisation.

En person kan være medlem af flere organisationer.

---

## Role

Beskriver hvilke rettigheder et medlemskab har.

Eksempler:

- Medlem
- Turneringsleder
- Træner
- Administrator

---

## Sport

Beskriver en sportsgren.

Eksempler:

- Dart
- Fodbold
- Padel
- Bordtennis

---

## SportsProfile

En persons profil inden for en bestemt sport.

Sportsprofilen ejer blandt andet:

- H-Rating
- Statistik
- Historik
- Rekorder

---

## Rating

Beskriver en ratingscore.

Ratingmodellen bestemmes af den valgte Rating Engine.

---

## RatingHistory

Gemmer alle ændringer i en spillers H-Rating.

Historik slettes aldrig.

---

## Log

Registrerer systemhændelser.

Anvendes til:

- Audit
- Fejlsøgning
- Historik

---

# Relationer

Person
├── User
├── Membership
└── SportsProfile

Organisation
└── Membership

Sport
└── SportsProfile

SportsProfile
├── Rating
└── RatingHistory

---

# Regler

Core må aldrig kende til:

- Kampe
- Puljer
- Boards
- Runder
- DartConnect
- Spilregler

Dette implementeres i de enkelte sportsmoduler.

---

# Fremtid

Alle kommende sportsgrene skal kunne implementeres uden ændringer i Core.