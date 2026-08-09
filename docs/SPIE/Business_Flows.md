# SPIE-X — Flux Métier
## ScorgIA V1 — Diagrammes de flux des processus majeurs

**Date** : 2026-08-04

---

## Flux 1 — Onboarding d'un nouvel enseignant

```
Enseignant arrive sur le site
          │
          ▼
    [Page /signup] → Création compte Supabase Auth
          │
          ▼
    [/onboarding] — étapes multi-phases
    ├── Étape 1 : Informations personnelles (nom, province, matière, niveau)
    ├── Étape 2 : Style pédagogique préféré
    ├── Étape 3 : Objectifs d'utilisation
    └── Étape 4 : Profil IA initial
          │
          ▼
    Création de la première Classe
          │
          ▼
    [/dashboard] — accueil avec missions initiales
          │
          ▼
    Quota IA initial → Forfait Gratuit activé
```

---

## Flux 2 — Ingestion d'un curriculum provincial

```
Enseignant clique "Importer mon curriculum"
          │
          ▼
    [/dashboard/classes/{id}] → Upload fichier (PDF/DOCX/TXT)
          │
          ▼
    POST /api/ia/curriculum
          │
          ▼
    CIE (SPIE-02) — Curriculum Intelligence Engine
    ├── PDF/DOCX parser → extraction du texte
    ├── Prompt province-aware → extraction IA des RAG/RAS/compétences
    └── CurriculumNormalizer → NormalizedOutcome[]
          │
          ▼
    GraphBuilder → CurriculumKnowledgeGraph
    ConstraintEngine → CurriculumConstraint[]
    QualityEngine → CurriculumQualityReport (score ≥ 40 pour générer)
          │
          ▼
    Stockage dans curricula (Supabase)
          │
          ▼
    [UI] Confirmation : "X objectifs extraits, prêt pour la planification"
```

---

## Flux 3 — Génération du plan annuel

```
Enseignant clique "Générer mon plan annuel"
    (requis: classe + curriculum importé + dates de l'année scolaire)
          │
          ▼
    PCE (SPIE-03) — Pedagogical Context Engine
    ├── Construit le PedagogicalContext
    ├── Calcule le ContextScore (qualité des sources disponibles)
    └── Charge la ContextMemory (état couverture programme)
          │
          ▼
    AYDTE (SPIE-04) — Academic Year Digital Twin
    ├── Construit le jumeau numérique de l'année
    ├── Alloue les séquences au calendrier (semaines/termes)
    ├── Calcule coveragePercent (% outcomes couverts)
    └── Calcule pacingScore (qualité du rythme)
          │
          ▼
    PPS (SPIE-05) — Pedagogical Planning Simulator
    ├── Simule la faisabilité (0 appels IA)
    ├── Détecte 8 types de risques
    └── Statut : realisable / realisable_risques / difficile / irrealisable
          │
          ┌─────────────────────────────┐
          │ irrealisable ?              │
          │ → Afficher SimulationReport │
          │ → Bloquer la génération     │
          │ → Proposer scénario C       │
          └─────────────────────────────┘
          │ realisable
          ▼
    PSE (SPIE-07) — Pedagogical Strategy Engine
    ├── Construit la PedagogicalStrategy (7 décisions tracées)
    ├── Valide la stratégie (7 dimensions pondérées)
    ├── Compare A/B/C
    └── Génère la recommandation enseignant
          │
          ▼
    [validePourGeneration = true]
          │
          ▼
    POST /api/ia/regenerer-plan-annuel
    ├── build-auto-context.ts → contexte complet
    ├── build-system-prompt.ts (SACRED 🔒)
    └── Claude claude-opus-4-5 → ProgrammeAnnuel JSON
          │
          ▼
    Stockage ProgrammeAnnuel (Supabase)
          │
          ▼
    [UI] Plan annuel interactif affiché
```

---

## Flux 4 — Génération d'une leçon individuelle

```
Enseignant ouvre une leçon dans Préparer
    (classe + leçon sélectionnée)
          │
          ▼
    [/dashboard/classes/{id}/lecons/{leconId}] 
          │
          ▼
    POST /api/ia/generer
    ├── build-auto-context.ts
    │   ├── ProfilIA (style, préférences)
    │   ├── Leçon (titre, objectifs, contexte)
    │   └── Classe (niveau, effectif, matière)
    ├── PCE → PedagogicalContext + ContextMemory
    └── teacher-reasoning-engine.ts → type de contenu, niveau de détail
          │
          ▼
    build-system-prompt.ts (SACRED 🔒)
    ├── Gabarit 7 blocs : Mise en contexte / Activation / Enseignement /
    │   Pratique guidée / Pratique autonome / Évaluation / Retour
    ├── Injection PedagogicalContext (province, constraints, coverage)
    └── Injection ProfilIA (style, niveaux différenciation)
          │
          ▼
    Claude claude-opus-4-5 → ContenuLecon (JSON riche)
          │
          ▼
    Stockage dans lecons (Supabase)
          │
          ▼
    [DocumentEditor] — édition Word-like
    [PrintPanel] — export PDF/DOCX/PPTX
```

---

## Flux 5 — Session d'enseignement actif

```
Enseignant ouvre la salle de classe
    [/dashboard/classes/{id}/salle]
          │
          ▼
    Mode enseignement actif
    ├── Affichage de la leçon (présenter mode)
    ├── Lancement de sondages en temps réel
    └── Copilote IA disponible (AssistantFlottant)
          │
          ▼
    teaching-strategy → évalue le mode actif
    ├── NORMAL_PROGRESS
    ├── REMEDIATION (détecté si confusion ou retard)
    ├── ACCELERATION
    ├── REVIEW_MODE
    └── ASSESSMENT_MODE
          │
          ▼
    activity-engine → journalise l'activité
          │
          ▼
    PTE (SPIE-06) — suivi du temps réel
    ├── Compare heures planifiées vs réelles
    ├── Détecte les événements imprévus (absence, pause, retard)
    └── Recommande si retard > seuil (30 min)
          │
          ▼
    [Fin de la leçon]
    ├── Marquage statut_lecon = enseignee
    ├── Mise à jour ContextMemory (PCE)
    └── Déclenchement insight-engine
```

---

## Flux 6 — Génération d'un quiz

```
Enseignant clique "Créer un quiz"
          │
          ▼
    [/dashboard/outils/quiz]
          │
          ▼
    POST /api/ia/quiz
    ├── PCE → contexte courant
    └── build-system-prompt.ts (template quiz)
          │
          ▼
    Claude → Quiz JSON (questions + réponses + explications)
          │
          ▼
    Stockage + création du code d'accès
          │
          ▼
    [/dashboard/outils/quiz/{id}/lancer]
    → Les élèves accèdent via [/quiz/{code}]
          │
          ▼
    Résultats → BC-07 Assessment
    → insight-engine analyse
```

---

## Flux 7 — Suivi et amélioration continue

```
[Dashboard] — Vue enseignant
          │
          ├── recommendation-engine → "Quoi faire aujourd'hui ?"
          │   (priorités selon état de la classe, retards détectés, etc.)
          │
          ├── insight-engine → "Ce qui se passe dans ta classe"
          │   (tendances, points forts, points faibles détectés)
          │
          ├── predictive-engine → "Projections"
          │   (où en sera la classe en fin de trimestre ?)
          │
          └── mission-engine → "Missions gamifiées"
              (points, badges, défis pédagogiques)
```

---

## Flux 8 — Partage et collaboration

```
Enseignant veut partager une leçon
          │
          ▼
    Export (PDF / DOCX / PPTX)
    POST /api/export/{format}
          │
          ▼
    Fichier téléchargeable
          │ ou
          ▼
    Partage via lien (Ressource → bibliothèque)
    POST /api/documents/share
          │
          ▼
    Autre enseignant accède via [/dashboard/bibliotheque]
```
