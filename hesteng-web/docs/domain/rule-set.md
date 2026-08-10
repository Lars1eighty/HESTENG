# RuleSet

**Module:** Dart
**Version:** 1.0
**Status:** Draft

---

# Formål

Et RuleSet beskriver, hvordan et GameType afvikles.

RuleSet indeholder alle regler for spillets gennemførelse, men beskriver aldrig selve spiltypen.

---

# Ansvar

RuleSet har ansvar for:

- Startscore
- Double In
- Double Out
- Master Out
- Bull-værdi
- Bust-regel
- Legs
- Sets
- Pile pr. besøg

---

# Egenskaber

- RuleSetId
- Navn
- Beskrivelse
- StartScore
- DoubleIn
- DoubleOut
- MasterOut
- BullValue
- BustRule
- DartsPerVisit
- Aktiv

---

# Relationer

Et RuleSet kan anvendes af mange Activities.

Et RuleSet kan anvendes sammen med mange GameTypes.

---

# Business Rules

- En Activity skal anvende præcis ét RuleSet.
- RuleSets skal kunne oprettes uden kodeændringer.
- Et RuleSet må ikke indeholde statistik eller scoring.

---

# Standard RuleSets

Eksempler:

- Standard 501
- Double Out
- Double In / Double Out
- Single Out
- Best of 3
- Best of 5

---

# Bemærkning

GameType beskriver **hvad** der spilles.

RuleSet beskriver **hvordan** det spilles.