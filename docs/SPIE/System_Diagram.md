# SPIE-X — Diagramme Système Global
## ScorgIA V1 — Architecture complète

**Date** : 2026-08-04

---

## Diagramme principal (vue globale)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           SCORGIA V1 — ARCHITECTURE GLOBALE                      │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                        INTERFACE UTILISATEUR (Next.js 16.2.6)                    │
│                                                                                    │
│  [Onboarding]  [Dashboard]  [Mes Classes]  [Préparer]  [Enseigner]  [Suivre]   │
│  [Studio IA]   [Outils]     [Bibliothèque] [Calendrier] [Profil IA] [Forfaits] │
│  [Admin]       [Founder]                                                          │
└────────────────────────────────────────────────┬─────────────────────────────────┘
                                                 │ HTTP / React
┌────────────────────────────────────────────────▼─────────────────────────────────┐
│                              API ROUTES (Next.js App Router)                      │
│                                                                                    │
│ ┌─────────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐  │
│ │  /api/ia/*              │  │  /api/export/*       │  │  /api/insights     │  │
│ │  generer, quiz, assist  │  │  docx, pdf, pptx     │  │  recommendations   │  │
│ │  curriculum, kit, image │  │                      │  │  missions, predict │  │
│ └────────────┬────────────┘  └──────────────────────┘  └────────────────────┘  │
│              │                                                                    │
│ ┌────────────▼────────────┐  ┌──────────────────────┐  ┌────────────────────┐  │
│ │  /api/activity          │  │  /api/documents/*    │  │  /api/workflows    │  │
│ │  /api/workflows         │  │  indexer, share, upd │  │  /api/admin/*      │  │
│ └────────────────────────-┘  └──────────────────────┘  └────────────────────┘  │
└────────────────────────────────────────────────┬─────────────────────────────────┘
                                                 │
                   ┌─────────────────────────────▼──────────────────────────────┐
                   │                    COUCHE IA (src/lib/ia/)                   │
                   │                                                               │
                   │  build-system-prompt.ts ◄─── 🔒 SACRED (DEC-005)            │
                   │         ↑                                                     │
                   │  teacher-reasoning-engine.ts ←── décide le chemin           │
                   │  teacher-memory-engine.ts    ←── mémoire de session          │
                   │  build-auto-context.ts       ←── assemble le contexte        │
                   │  skills-pedagogiques.ts      ←── compétences pour prompts    │
                   │         ↓                                                     │
                   │  Anthropic Claude (claude-opus-4-5)                           │
                   └──────────────────┬────────────────────────────────────────┘
                                      │ PedagogicalContext (mandatory)
┌─────────────────────────────────────▼──────────────────────────────────────────┐
│                    COUCHE SPIE — Pedagogical Intelligence Engine                  │
│                                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │  PIPELINE SPIE (gauche → droite = planification de l'année)                 │ │
│  │                                                                              │ │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │ │
│  │  │ SPIE-02  │→→ │ SPIE-03  │→→ │ SPIE-04  │→→ │ SPIE-05  │→→ │ SPIE-07  │ │ │
│  │  │ CIE      │   │ PCE      │   │ AYDTE    │   │ PPS      │   │ PSE      │ │ │
│  │  │ Curriculum│  │ Context  │   │ Twin     │   │ Simulator│   │ Strategy │ │ │
│  │  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘ │ │
│  │                                     ↓                                       │ │
│  │                               ┌──────────┐                                  │ │
│  │                               │ SPIE-06  │                                  │ │
│  │                               │ PTE      │                                  │ │
│  │                               │ Time     │                                  │ │
│  │                               └──────────┘                                  │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │  SPIE-01 — Moteurs de base (stubs — intégrés dans SPIE-02 à SPIE-07)       │ │
│  │  CKG | PPE | PGE | TQE | LCE | PAE + Pipeline state machine + Validators   │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┬─────────────────────────────────┘
                                                 │
┌────────────────────────────────────────────────▼─────────────────────────────────┐
│                     MOTEURS OPÉRATIONNELS (pre-SPIE)                               │
│                                                                                    │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────────────────┐   │
│  │  activity-engine │  │  insight-engine  │  │  recommendation-engine       │   │
│  │  (journalisation)│  │  (insights péda) │  │  (tâches quotidiennes)       │   │
│  └──────────────────┘  └─────────────────┘  └──────────────────────────────┘   │
│                                                                                    │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────────────────┐   │
│  │  mission-engine  │  │ predictive-engine│  │  teaching-strategy           │   │
│  │  (gamification)  │  │  (prédictions)  │  │  (mode opérationnel)         │   │
│  └──────────────────┘  └─────────────────┘  └──────────────────────────────┘   │
│                                                                                    │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────────────────┐   │
│  │  decision-engine │  │  teacher-brain   │  │  workflow-runtime             │   │
│  │  (décisions ops) │  │  (mémoire IA)   │  │  (workflows multi-étapes)    │   │
│  └──────────────────┘  └─────────────────┘  └──────────────────────────────┘   │
└────────────────────────────────────────────────┬─────────────────────────────────┘
                                                 │
┌────────────────────────────────────────────────▼─────────────────────────────────┐
│                          PERSISTANCE — Supabase PostgreSQL                         │
│                                                                                    │
│  utilisateurs  │  classes  │  lecons  │  programmes_annuels  │  generations_ia  │
│  ressources    │  sondages │  quizzes │  curricula           │  workflows       │
│  notifications │  missions │  insights│  activites           │  fichiers        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagramme de génération de leçon

```
Enseignant clique "Générer une leçon"
           │
           ▼
    [Dashboard /api/ia/generer]
           │
           ▼
    build-auto-context.ts
    ├── charge ProfilIA (Utilisateur)
    ├── charge classe + leçon en cours
    └── construit le contexte automatique
           │
           ▼
    PCE (SPIE-03) — PedagogicalContext
    ├── charge ContextScore
    ├── charge ContextMemory (couverture du programme)
    └── génère promptSummary
           │
           ▼
    teacher-reasoning-engine.ts
    ├── décide le type de contenu optimal
    ├── décide le niveau de détail
    └── sélectionne les skills pédagogiques
           │
           ▼
    build-system-prompt.ts (SACRED 🔒)
    ├── GABARIT 7 blocs (leçon complète)
    ├── injection du contexte PCE
    └── injection des préférences ProfilIA
           │
           ▼
    Anthropic Claude (claude-opus-4-5)
           │
           ▼
    Leçon générée → stockée dans Supabase
```

---

## Diagramme de planification annuelle

```
Enseignant importe le curriculum
           │
           ▼
    CIE (SPIE-02)
    ├── parse le document (PDF/DOCX/MD)
    ├── extrait RAG/RAS/compétences/concepts
    └── construit le CurriculumKnowledgeGraph
           │
           ▼
    PCE (SPIE-03)
    ├── assemble le PedagogicalContext
    └── évalue le score de contexte
           │
           ▼
    AYDTE (SPIE-04)
    ├── construit le jumeau numérique de l'année
    ├── alloue les séquences au calendrier
    └── calcule coveragePercent + pacingScore
           │
           ▼
    PPS (SPIE-05)
    ├── simule la faisabilité (0 appels IA)
    ├── détecte les risques
    └── propose des scénarios A/B/C
           │
           ▼
    PSE (SPIE-07)
    ├── construit la stratégie pédagogique
    ├── valide la stratégie (7 dimensions)
    └── génère la recommandation enseignant
           │
           ▼
    [Si validePourGeneration = true]
           │
           ▼
    /api/ia/regenerer-plan-annuel
    → Génération IA du ProgrammeAnnuel
```
