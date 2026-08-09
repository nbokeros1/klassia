# SPIE-X — Bounded Contexts (Domain Driven Design)
## Architecture ScorgIA V1

**Date** : 2026-08-04

---

## Vue d'ensemble

ScorgIA est décomposée en **10 Bounded Contexts** distincts, chacun avec des responsabilités, limites, et échanges bien définis.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SCORGIA V1 — BOUNDED CONTEXTS                │
│                                                                       │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │  Identity  │  │   Curriculum    │  │  Pedagogical Planning    │  │
│  │  & Access  │  │  Intelligence   │  │  (Annual Plan + Seq.)    │  │
│  └────────────┘  └─────────────────┘  └──────────────────────────┘  │
│                                                                       │
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────────┐    │
│  │  Teaching   │  │     Time        │  │   AI Generation      │    │
│  │  Execution  │  │  Management     │  │   (Content & Prompts)│    │
│  └─────────────┘  └─────────────────┘  └──────────────────────┘    │
│                                                                       │
│  ┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌───────────────┐   │
│  │Assessment│  │  Analytics  │  │Resources │  │Administration │   │
│  │& Tracking│  │  & Intel.   │  │& Library │  │               │   │
│  └──────────┘  └─────────────┘  └──────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## BC-01 — Identity & Access

**Responsabilités**
- Authentification des enseignants (Supabase Auth)
- Profil enseignant (province, matière, niveau, style pédagogique)
- Gestion des forfaits (Gratuit/Pro/Pro+/Institution)
- Rôles (enseignant, direction, admin, super_admin)
- Quotas de génération IA
- Onboarding (étapes, cascade, validation)

**Objet central** : `Utilisateur`

**Limites**
- Ce contexte ne sait pas quelles leçons existent
- Il gère uniquement qui peut faire quoi (autorisation)
- Le profil IA (ProfilIA) appartient ici mais est consommé par AI Generation

**Échanges sortants**
- `ens_id`, `forfait`, `quotas` → tous les autres contextes
- `profil_ia` → AI Generation
- `province`, `langue` → Curriculum Intelligence

**Technologie** : Supabase Auth + table `utilisateurs`

---

## BC-02 — Curriculum Intelligence

**Responsabilités**
- Ingestion de documents curriculaires (PDF, DOCX, Markdown)
- Extraction des résultats d'apprentissage (RAG/RAS, attentes, compétences, big ideas)
- Construction du graphe de connaissances (CKG)
- Normalisation multi-province (Alberta, Ontario, Québec, BC, Saskatchewan…)
- Détection des contraintes (séquences, prérequis, durées min/max)
- Cache curriculaire

**Objets centraux** : `CurriculumKnowledgeGraph`, `NormalizedOutcome`, `CurriculumExtraction`

**SPIE** : SPIE-01 (CKG), SPIE-02 (CIE)

**Limites**
- Ne sait pas comment enseigner le curriculum
- Ne génère pas de plans (délègue à Pedagogical Planning)
- Répond aux requêtes de graphe (what outcomes for this level/subject?)

**Échanges sortants**
- `CurriculumKnowledgeGraph` → Pedagogical Planning
- `NormalizedOutcome[]` → AYDTE, PSE
- `CurriculumPacingModel` → AYDTE, PPS

**Technologie** : `src/lib/spie/curriculum/` + table `curricula`

---

## BC-03 — Pedagogical Planning

**Responsabilités**
- Construction du contexte pédagogique de génération (PCE)
- Jumeau numérique de l'année scolaire (AYDTE)
- Simulation de faisabilité du plan (PPS)
- Stratégie pédagogique annuelle (PSE)
- Arbre de décision pédagogique
- Comparaison de scénarios A/B/C

**Objets centraux** : `PedagogicalContext`, `AcademicYearTwin`, `SequenceBlock`, `PedagogicalStrategy`, `PedagogicalSimulation`

**SPIE** : SPIE-03, SPIE-04, SPIE-05, SPIE-07

**Limites**
- Ne génère pas de contenu (délègue à AI Generation)
- Ne suit pas le temps réel (délègue à Time Management)
- Décisions toutes déterministes (0 appels IA dans PSE/PPS)

**Échanges sortants**
- `PedagogicalContext` → AI Generation
- `AcademicYearTwin` → Time Management
- `PedagogicalStrategy` → AI Generation
- `SimulationReport` → UI (bloque ou autorise la génération)

**Technologie** : `src/lib/spie/pce/`, `src/lib/spie/aydte/`, `src/lib/spie/pps/`, `src/lib/spie/pse/`

**[DETTE]** : pas de mapper entre `AcademicYearTwin` et `ProgrammeAnnuel` (DB)

---

## BC-04 — Teaching Execution

**Responsabilités**
- Gestion des classes et des leçons individuelles
- Mode pédagogique opérationnel (TeachingStrategy : REMEDIATION, NORMAL…)
- Copilote d'enseignement en temps réel
- Gestion des ressources pédagogiques
- Export de leçons (PDF, DOCX, PPTX)

**Objets centraux** : `Classe`, `Lecon`, `ContenuLecon`, `TeachingStrategy`

**Limites**
- Ne planifie pas l'année (délègue à Pedagogical Planning)
- Ne génère pas le contenu (délègue à AI Generation)
- N'analyse pas les données (délègue à Analytics)

**Échanges sortants**
- `statut_lecon`, `date_enseignee` → Time Management
- `lecon_contenu` → AI Generation (pour régénération)
- `activite_enregistree` → Analytics

**Technologie** : `src/app/dashboard/classes/`, tables `classes`, `lecons`

---

## BC-05 — Time Management

**Responsabilités**
- Suivi du temps d'enseignement planifié vs réel
- Gestion des événements calendaires (jours fériés, absences, retards…)
- Recalcul en cascade lors d'imprévus (seuil 30 min)
- Horloge académique (retard/avance en semaines)
- Recommandations de récupération

**Objets centraux** : `AcademicTime`, `AcademicClock`, `TimeEvent`, `TimeRecommendation`

**SPIE** : SPIE-06 (PTE)

**Limites**
- Ne génère pas de contenu
- Ne décide pas des modifications (autoApplicable: false)
- Mesure et alerte — ne prescrit pas

**Échanges sortants**
- `AcademicClock` → Analytics, AI Generation (contexte de retard)
- `TimeRecommendation[]` → UI (teacher decision)

**Technologie** : `src/lib/spie/pte/`

---

## BC-06 — AI Generation

**Responsabilités**
- Génération de contenu pédagogique (leçons, séquences, activités, quiz, évaluations)
- Génération d'images pédagogiques
- Mémoire de génération (teacher-brain, PCE memory)
- Prompt engineering (build-system-prompt, skills-pedagogiques)
- Contrôle des tokens et de la qualité de la sortie

**Objets centraux** : `GenerationIA`, system prompt, teacher memory

**Règle absolue** : Ne jamais modifier `build-system-prompt.ts` via SPIE (DEC-005)

**Limites**
- Ne planifie pas (reçoit le contexte de Pedagogical Planning)
- Ne persiste pas directement (délègue à Teaching Execution)
- Ne valide pas la pédagogie (délègue à Quality Engine TQE — stub)

**Entrées requises**
- `PedagogicalContext` (SPIE-03) — mandatory
- `PedagogicalStrategy` (SPIE-07) — optionnel mais enrichissant
- `ProfilIA` (Identity) — préférences enseignant

**Technologie** : `src/lib/ia/`, `/api/ia/*`, Anthropic Claude claude-opus-4-5

---

## BC-07 — Assessment & Tracking

**Responsabilités**
- Quiz (génération, lancement, résultats)
- Sondages en temps réel
- Suivi des élèves
- Évaluations formatives et sommatives

**Objets centraux** : Quiz, Sondage, ReponseSondage, résultats

**Limites**
- Ne génère pas d'évaluations seul (délègue à AI Generation)
- Ne analyse pas les tendances (délègue à Analytics)

**Technologie** : `src/app/dashboard/outils/quiz/`, `/api/ia/quiz`, tables `quizzes`, `sondages`

---

## BC-08 — Analytics & Intelligence

**Responsabilités**
- Insights pédagogiques (insight-engine)
- Prédictions de progression (predictive-engine)
- Recommandations de tâches quotidiennes (recommendation-engine)
- Missions gamifiées (mission-engine)
- Journalisation d'activité (activity-engine)

**Objets centraux** : Insight, Prediction, Recommendation, Mission, Activity

**Limites**
- Ne modifie pas les leçons ou plans
- N'appelle pas directement Claude (analyse uniquement)
- Lit les données des autres contextes

**Échanges entrants**
- Activité de Teaching Execution
- AcademicClock de Time Management
- Résultats d'Assessment

**Technologie** : `src/lib/*-engine/`, `/api/insights`, `/api/recommendations`, `/api/missions`, `/api/predictions`

---

## BC-09 — Resources & Library

**Responsabilités**
- Bibliothèque de ressources (documents, liens, vidéos)
- Partage de documents
- Import de documents (DOCX, PDF)
- Indexation pour le contexte IA

**Objets centraux** : `Ressource`, document indexé

**Technologie** : `src/app/dashboard/bibliotheque/`, `/api/documents/*`, Supabase Storage

---

## BC-10 — Administration

**Responsabilités**
- Tableau de bord admin (enwaha22@gmail.com uniquement)
- Gestion des enseignants, des inscriptions, des forfaits
- Tableau de bord fondateur (analytics plateforme, roadmap)
- Logs d'audit
- Invitations et impersonation

**Technologie** : `src/app/admin/`, `src/app/founder/`, `/api/admin/*`, `/api/founder/*`

---

## Événements inter-contextes

| Événement | Émetteur | Consommateurs |
|-----------|----------|---------------|
| `curriculum.ingested` | BC-02 | BC-03 |
| `annual_plan.validated` | BC-03 | BC-04, BC-06 |
| `lecon.taught` | BC-04 | BC-05, BC-08 |
| `time.event_created` | BC-05 | BC-03 (recalcul) |
| `generation.completed` | BC-06 | BC-04 (leçon créée) |
| `quiz.result` | BC-07 | BC-08 |
| `mission.completed` | BC-08 | BC-10 (analytics) |
