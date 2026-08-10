# ActivityType

**Module:** Dart
**Version:** 1.0
**Status:** Draft

---

# Formål

En ActivityType beskriver formålet med en Activity.

ActivityType anvendes til at kategorisere aktiviteter og bestemme deres overordnede type.

---

# Ansvar

ActivityType har ansvar for:

- Navn
- Beskrivelse
- Aktiv status

---

# Egenskaber

- ActivityTypeId
- Navn
- Beskrivelse
- Aktiv

---

# Relationer

En ActivityType kan anvendes af mange Activities.

---

# Business Rules

- En Activity skal have præcis én ActivityType.
- Nye ActivityTypes kan oprettes uden ændringer i systemet.

---

# Standardtyper

Eksempler:

- Klubaften
- Turnering
- Liga
- Klubmesterskab
- Træning
- Show-event

---

# Bemærkning

ActivityType beskriver **hvorfor** aktiviteten afholdes.

Den beskriver ikke reglerne for, hvordan der spilles.