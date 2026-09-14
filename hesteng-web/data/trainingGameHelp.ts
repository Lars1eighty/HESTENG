export type TrainingGameHelp = {
  name: string;
  purpose: string;
  rules: string[];
  finish: string;
  measures: string;
};

export const trainingGameHelp: Record<string, TrainingGameHelp> = {
  "jdc-challenge": {
    name: "JDC Challenge",
    purpose: "Træn præcision på både scoring og doubler i én samlet challenge.",
    rules: [
      "Følg de targets HESTENG viser dig gennem hele challengen.",
      "Shanghai-delene spilles med 3 pile på hvert tal, og double-delen går gennem D1-D20 og Bull.",
      "Registrér hvert kast i HESTENG, så scoren beregnes automatisk.",
    ],
    finish: "Challengen slutter, når alle targets er gennemført.",
    measures: "Samlet score, Shanghai, hits, forsøg og træfprocent.",
  },
  "catch-40": {
    name: "Catch 40",
    purpose: "Træn checkouts systematisk gennem området 61-100.",
    rules: [
      "HESTENG fører dig gennem checkout-targets fra 61 til 100.",
      "Spil hvert target som vist og registrér, om du lukker det.",
      "Fortsæt gennem hele rækken uden selv at skulle holde regnskab.",
    ],
    finish: "Øvelsen slutter, når checkout-rækken er gennemført.",
    measures: "Score, antal checkouts, forsøg, checkoutprocent og højeste checkout.",
  },
  "bobs-27": {
    name: "Bob's 27",
    purpose: "Træn alle doubler under pres og få et enkelt mål for din double-form.",
    rules: [
      "Du starter på 27 point og går fra D1 til D20 og til sidst Bull.",
      "Du har 3 pile på hver double.",
      "Hits giver point; rammer du ingen af de 3 pile, trækkes targetets værdi fra scoren.",
    ],
    finish: "Øvelsen slutter efter Bull eller tidligere, hvis spillets score-regel afslutter forsøget.",
    measures: "Slutscore, hits, forsøg og træfprocent.",
  },
  "game-420": {
    name: "Game 420",
    purpose: "Træn doubler gennem hele skiven med fokus på at få remaining så langt ned som muligt.",
    rules: [
      "Du starter med 420 remaining.",
      "HESTENG fører dig gennem D1-D20 og Bull.",
      "Registrér dine hits på hvert target; ramte doubler reducerer remaining.",
    ],
    finish: "Spillet slutter, når hele target-rækken er gennemført.",
    measures: "Remaining, hits, forsøg og træfprocent.",
  },
  scoring: {
    name: "Scoring",
    purpose: "Mål hvor stabilt du rammer et valgt scoring-target over mange pile.",
    rules: [
      "Vælg T20, T19 eller Bull som dit target.",
      "Kast i alt 100 pile og registrér udfaldet efter hvert kast.",
      "På tal registrerer du single, double, triple eller miss; HESTENG holder løbende statistik.",
    ],
    finish: "Øvelsen slutter efter præcis 100 pile.",
    measures: "Score, singles, doubles, triples, misses, hits, træfprocent samt første og sidste 50 pile.",
  },
  "priestleys-triples": {
    name: "Priestley's Triples",
    purpose: "Træn præcision på de vigtige triples fra T10 til T20.",
    rules: [
      "Du går fra T10 til T20 i rækkefølge.",
      "Du har 3 pile på hvert target.",
      "Kun triple-hits tæller som succes, men øvrige udfald registreres til statistikken.",
    ],
    finish: "Øvelsen slutter efter T20.",
    measures: "Score, triples, øvrige hits/misses, forsøg og træfprocent.",
  },
  "around-the-world": {
    name: "Around the World",
    purpose: "Træn præcision på hele skiven og mål, hvor få pile du behøver.",
    rules: [
      "Vælg Singles, Doubles eller Triples.",
      "Ram 1-20 i rækkefølge og afslut på Bull.",
      "Du bliver på samme target, indtil du rammer det korrekte segment.",
    ],
    finish: "Øvelsen slutter, når Bull er ramt.",
    measures: "Pile brugt, hits, forsøg, misses og træfprocent. Færre pile er bedre.",
  },
  "target-training": {
    name: "Target Training",
    purpose: "Byg din egen præcisionstræning omkring de targets, du vil forbedre.",
    rules: [
      "Vælg 1-3 targets og hvor mange runder du vil spille.",
      "Kast mod det viste target og registrér hit eller miss.",
      "HESTENG skifter mellem dine valgte targets og holder styr på alle kast.",
    ],
    finish: "Øvelsen slutter, når alle valgte runder er gennemført.",
    measures: "Hits, forsøg og samlet træfprocent fordelt på dine targets.",
  },
  "checkout-121": {
    name: "121",
    purpose: "Træn checkout-progression og evnen til at lukke under tidspres.",
    rules: [
      "Start på 121 og brug højst 9 pile på hvert forsøg.",
      "Lukker du tallet, går næste target én op. Misser du, bliver du på samme target.",
      "Sessionen varer 20 minutter; et igangværende forsøg må afsluttes, når tiden udløber.",
    ],
    finish: "Sessionen slutter efter 20 minutter og det sidste igangværende forsøg.",
    measures: "Højeste checkout, antal lukkede, forsøg, checkoutprocent og tid.",
  },
  "checkout-170": {
    name: "170",
    purpose: "Træn det maksimale checkout og din evne til at skabe og afslutte en lukning.",
    rules: [
      "Du får 10 forsøg på at lukke 170.",
      "Du har højst 9 pile på hvert forsøg.",
      "Ved en lukning registrerer du, hvor mange pile du brugte; ellers registrerer du miss.",
    ],
    finish: "Øvelsen slutter efter 10 forsøg.",
    measures: "Antal lukkede, checkoutprocent, bedste antal pile og gennemsnitligt antal pile ved lukninger.",
  },
  "checkout-170-vs-cpu": {
    name: "170 vs CPU",
    purpose: "Gør checkout-træningen kampnær ved at spille 170-legs mod en modstander.",
    rules: [
      "Vælg CPU-niveau 45, 55 eller 65.",
      "I starter hvert leg på 170 og skiftes til at have første visit fra leg til leg.",
      "Indtast din visit-score. Brug Lukket, når du tager checkouten; CPU spiller automatisk efter dine visits.",
    ],
    finish: "Første spiller til 5 legs vinder kampen.",
    measures: "Matchresultat, dine og CPU'ens legs samt dit 3-pils snit.",
  },
  "doubles-10": {
    name: "Doubles 10",
    purpose: "Test din double-præcision på tilfældige targets uden at kunne forberede rækkefølgen.",
    rules: [
      "HESTENG vælger 10 forskellige doubler tilfældigt fra D1-D20.",
      "Du har højst 3 pile på hver double.",
      "Registrér om du rammer på pil 1, 2 eller 3 - eller om alle tre misser.",
    ],
    finish: "Øvelsen slutter efter de 10 doubler.",
    measures: "Doubler ramt, doubleprocent, pile brugt og gennemsnitligt antal pile ved hits.",
  },
  "scoring-targets": {
    name: "Scoring Targets",
    purpose: "Træn høj scoring specifikt på T20, T19 og Bull.",
    rules: [
      "Vælg enten T20 + T19 + Bull eller 100 pile på ét target.",
      "Mix-varianten giver 10 runder á 3 pile på hvert af de tre targets - 90 pile i alt.",
      "100-pils varianten bruger ét valgt target gennem hele sessionen; registrér antal hits efter hver visit.",
    ],
    finish: "Øvelsen slutter efter 90 pile i mix eller 100 pile i single-target varianten.",
    measures: "Point, hits, antal pile, træfprocent samt hits på T20, T19 og Bull.",
  },
  "practice-501": {
    name: "501 Practice",
    purpose: "Spil et helt 501-leg og få et enkelt billede af din kamp-performance.",
    rules: [
      "Start på 501 og indtast din score efter hver visit.",
      "Bust håndteres af HESTENG, så remaining bliver stående ved ugyldige visits.",
      "Når du lukker leget, bruger du Lukket-knappen i stedet for at skrive 0 som remaining.",
    ],
    finish: "Øvelsen slutter, når 501-leget er lukket.",
    measures: "3-pils snit, visits, beregnede pile, checkout og højeste visit.",
  },
  "practice-501-vs-cpu": {
    name: "501 vs CPU",
    purpose: "Spil en rigtig 501-kamp med justerbar modstand og kampformat.",
    rules: [
      "Vælg CPU 45, 55 eller 65 og spil først til 3, 5, 7 eller 9 legs.",
      "Starteren skifter fra leg til leg. Indtast dine visits, mens CPU spiller automatisk.",
      "42-dart-reglen kan slås til: efter 14 visits til hver vinder laveste remaining; ved lighed afgøres leget på Bull.",
    ],
    finish: "Kampen slutter, når en spiller når det valgte antal legs.",
    measures: "Matchresultat, legs, dit 3-pils snit, CPU-niveau og kampformat.",
  },
};

export const trainingRouteExerciseIds: Record<string, string> = {
  "/traening/121": "checkout-121",
  "/traening/170": "checkout-170",
  "/traening/170-vs-cpu": "checkout-170-vs-cpu",
  "/traening/doubles-10": "doubles-10",
  "/traening/scoring-targets": "scoring-targets",
  "/traening/501": "practice-501",
  "/traening/501-vs-cpu": "practice-501-vs-cpu",
};
