# GameType

**Module:** Dart
**Version:** 1.0
**Status:** Draft

---

# Formål

Et GameType beskriver hvilket spil der spilles.

GameType definerer spillets grundlæggende struktur, men ikke reglerne for hvordan det afvikles.

---

# Ansvar

GameType har ansvar for:

- Navn
- Beskrivelse
- Standard startscore (hvis relevant)

GameType beskriver aldrig regler som Double Out eller Best of 5.

---

# Egenskaber

- GameTypeId
- Navn
- Beskrivelse
- Aktiv

---

# Relationer

Et GameType kan anvendes af mange Activities.

Et GameType kan anvendes sammen med mange RuleSets.

---

# Business Rules

- En Activity skal anvende præcis ét GameType.
- Et GameType kan bruges af flere RuleSets.
- Nye GameTypes skal kunne oprettes uden kodeændringer.

---

# Standardtyper

Eksempler:

- 501
- 301
- Cricket
- Shanghai
- Around the Clock
- Bob's 27
- 121 Checkout

---

# Bemærkning

GameType beskriver **hvad** der spilles.

RuleSet beskriver **hvordan** der spilles.