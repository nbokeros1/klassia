# SPIE-X — Architecture Review
## Audit complet du Pedagogical Intelligence Engine

**Date** : 2026-08-04  
**Version** : SPIE-X (revue post SPIE-01 à SPIE-07)  
**Statut** : ✅ Revue complète — architecture définitive ScorgIA V1

---

## Mission 1 — Inventaire complet

### 1.1 Moteurs SPIE (couche pédagogique)

| Moteur | Sigle | Chemin | Responsabilité | Statut |
|--------|-------|--------|----------------|--------|
| Core Knowledge Graph | CKG | `spie/engines/ckg/` | Graphe de connaissances curriculaire | Stub SPIE-01, implémenté SPIE-02 |
| Province Presentation Engine | PPE | `spie/engines/ppe/` | Adaptation vocabulaire provincial | Stub SPIE-01 |
| Plan Generation Engine | PGE | `spie/engines/pge/` | Génération du plan annuel | Stub SPIE-01 |
| Teaching Quality Engine | TQE | `spie/engines/tqe/` | Qualité pédagogique des leçons | Stub SPIE-01 |
| Lesson Content Engine | LCE | `spie/engines/lce/` | Contenu des leçons | Stub SPIE-01 |
| Progression Analytics Engine | PAE | `spie/engines/pae/` | Suivi de la progression | Stub SPIE-01 |
| Curriculum Intelligence Engine | CIE | `spie/curriculum/` | Parseurs, extraction, graphe | ✅ SPIE-02 |
| Pedagogical Context Engine | PCE | `spie/pce/` | Contexte de génération | ✅ SPIE-03 |
| Academic Year Digital Twin | AYDTE | `spie/aydte/` | Jumeau numérique de l'année | ✅ SPIE-04 |
| Pedagogical Planning Simulator | PPS | `spie/pps/` | Simulateur de faisabilité | ✅ SPIE-05 |
| Pedagogical Time Engine | PTE | `spie/pte/` | Suivi du temps d'enseignement | ✅ SPIE-06 |
| Pedagogical Strategy Engine | PSE | `spie/pse/` | Stratégie pédagogique annuelle | ✅ SPIE-07 |

### 1.2 Moteurs opérationnels (pre-SPIE)

| Moteur | Chemin | Responsabilité |
|--------|--------|----------------|
| activity-engine | `lib/activity-engine/` | Journalisation des événements enseignant |
| decision-engine | `lib/decision-engine/` | Décisions opérationnelles sur les missions |
| execution-engine | `lib/execution-engine/` | Exécution des workflows multi-étapes |
| insight-engine | `lib/insight-engine/` | Insights pédagogiques à partir de l'activité |
| mission-engine | `lib/mission-engine/` | Missions/gamification enseignant |
| predictive-engine | `lib/predictive-engine/` | Prédictions sur la progression |
| recommendation-engine | `lib/recommendation-engine/` | Recommandations de tâches quotidiennes |
| teacher-brain | `lib/teacher-brain/` | Mémoire IA pour la génération |
| teaching-strategy | `lib/teaching-strategy/` | Mode pédagogique opérationnel (REMEDIATION…) |
| workflow-runtime | `lib/workflow-runtime/` | Machine d'états des workflows |

### 1.3 Couche IA (génération de contenu)

| Fichier | Responsabilité | Protection |
|---------|----------------|------------|
| `build-system-prompt.ts` | Gabarit de génération de contenu | 🔒 DEC-005 : ne jamais modifier via SPIE |
| `teacher-reasoning-engine.ts` | Décide le chemin de génération | |
| `teacher-memory-engine.ts` | Mémoire pour le contexte de génération | |
| `build-auto-context.ts` | Assemble le contexte automatiquement | |
| `build-document-context.ts` | Contexte pour un document existant | |
| `skills-pedagogiques.ts` | Compétences pédagogiques pour les prompts | |
| `get-max-tokens.ts` | Budget de tokens selon le type de contenu | |

### 1.4 Objets métier (DB)

| Objet | Source | Responsabilité |
|-------|--------|----------------|
| `Utilisateur` | DB | Profil, préférences, quota IA, forfait |
| `Classe` | DB | Classe, matière, niveau, année scolaire |
| `Lecon` | DB | Leçon individuelle avec contenu riche |
| `ProgrammeAnnuel` | DB | Plan annuel (unités + leçons planifiées) |
| `Unite` | DB (nested) | Unité thématique (semaines, objectifs, leçons) |
| `GenerationIA` | DB | Journal des générations IA |
| `Ressource` | DB | Documents, liens, vidéos |
| `Sondage` | DB | Sondages en temps réel |
| `AcademicYearTwin` | SPIE | Jumeau numérique de l'année (domain model) |
| `SequenceBlock` | SPIE | Bloc de séquences (domain model) |
| `PedagogicalStrategy` | SPIE | Stratégie annuelle (domain model) |
| `PedagogicalSimulation` | SPIE | Simulation de faisabilité (domain model) |
| `AcademicTime` | SPIE | Temps d'enseignement (domain model) |

### 1.5 APIs

| Route | Méthode | Responsabilité |
|-------|---------|----------------|
| `/api/ia/generer` | POST | Génération principale (leçon, séquence, quiz…) |
| `/api/ia/generer-image` | POST | Génération d'images pédagogiques |
| `/api/ia/curriculum` | POST | Analyse de curriculum IA |
| `/api/ia/assistant` | POST | Assistant conversationnel |
| `/api/ia/quiz` | POST | Génération de quiz |
| `/api/ia/activite` | POST | Génération d'activités |
| `/api/ia/kit` | POST | Kit de leçon |
| `/api/ia/teaching-copilot` | POST | Copilote d'enseignement |
| `/api/ia/regenerer-plan-annuel` | POST | Régénération du plan annuel |
| `/api/ia/memory` | GET/POST | Gestion de la mémoire IA |
| `/api/ia/action` | POST | Actions IA diverses |
| `/api/export/{docx,pdf,pptx}` | POST | Export de documents |
| `/api/insights` | GET | Insights pédagogiques |
| `/api/recommendations` | GET | Recommandations de tâches |
| `/api/missions` | GET | Missions enseignant |
| `/api/predictions` | GET | Prédictions de progression |
| `/api/workflows` | GET/POST | Workflows multi-étapes |
| `/api/activity` | POST | Journalisation d'activité |
| `/api/documents` | CRUD | Gestion des documents |
| `/api/admin/*` | GET/POST | Administration plateforme |
| `/api/founder/*` | GET/POST | Tableau de bord fondateur |

### 1.6 Flux principaux

1. **Ingestion curriculum** → CIE parseurs → extraction → graphe → stockage
2. **Génération plan annuel** → PCE → AYDTE → PPS → PSE → génération IA
3. **Génération de leçon** → PCE → build-system-prompt → Anthropic Claude
4. **Enseignement actif** → teaching-strategy → PTE → insights → recommandations
5. **Suivi progression** → activity-engine → insight-engine → predictive-engine → missions

---

## Mission 2 — Détection des doublons

### 2.1 Analyse des potentiels chevauchements

#### `TeachingStrategy` (pre-SPIE) vs `PedagogicalStrategy` (SPIE-07)

| | TeachingStrategy | PedagogicalStrategy |
|--|----------------|---------------------|
| Source | `lib/teaching-strategy/` | `lib/spie/pse/` |
| Temporalité | Opérationnel (journalier) | Annuel (planification) |
| Décision | Mode actif (REMEDIATION, NORMAL…) | Approche globale (direct, actif…) |
| Consommateur | mission-engine (priorités) | PSE → génération de plan |

**Verdict : Pas de doublon.** Deux abstractions distinctes à deux niveaux de granularité temporelle.

#### `recommendation-engine` (pre-SPIE) vs PPS recommendations (SPIE-05)

| | recommendation-engine | PPS recommendations |
|--|---------------------|---------------------|
| Source | `lib/recommendation-engine/` | `lib/spie/pps/` |
| Domaine | Tâches quotidiennes (quoi faire aujourd'hui) | Ajustements curriculaires (compresser séquences, supprimer…) |
| Trigger | Analyse de l'activité enseignant | Simulation de faisabilité |

**Verdict : Pas de doublon.** Domaines d'application orthogonaux.

#### `decision-engine` (pre-SPIE) vs PCE DecisionEngine (SPIE-03)

| | decision-engine | PCE DecisionEngine |
|--|----------------|-------------------|
| Source | `lib/decision-engine/` | `lib/spie/pce/decisions/` |
| Rôle | Décisions sur les missions opérationnelles | Décisions de génération IA à partir du contexte |
| Consommateur | mission-engine | build-system-prompt, PCE builder |

**Verdict : Pas de doublon.** Deux niveaux de décision distincts.

#### `ProgrammeAnnuel`/`Unite` (DB) vs `AcademicYearTwin`/`SequenceBlock` (SPIE-04)

| | ProgrammeAnnuel / Unite | AcademicYearTwin / SequenceBlock |
|--|------------------------|----------------------------------|
| Source | DB Supabase | SPIE domain model |
| Format | JSON brut (ContenuProgramme) | Objet riche avec versions, impacts, cadence |
| Cycle de vie | Statique (généré, stocké) | Dynamique (recalculable, versionnée) |

**Verdict : Chevauchement conceptuel voulu (DEC-002).** Un mapper est requis. Ces deux couches sont distinctes par design. **Dette technique : mapper manquant.**

#### `teacher-brain` vs PCE memory

| | teacher-brain | PCE memory (ContextMemory) |
|--|-------------|---------------------------|
| Source | `lib/teacher-brain/` | `lib/spie/pce/memory/` |
| Rôle | Mémoire IA pour la session de génération actuelle | Suivi de ce qui a été couvert dans le curriculum |
| Temporalité | Session / éphémère | Annuel / persistant |

**Verdict : Complémentaires, pas doublons.** La PCE memory devrait alimenter teacher-brain. **Opportunité d'intégration.**

### 2.2 Résumé des chevauchements

| Paire | Type | Action |
|-------|------|--------|
| TeachingStrategy vs PSE PedagogicalStrategy | Faux doublon | Aucune action |
| recommendation-engine vs PPS recs | Faux doublon | Aucune action |
| decision-engine vs PCE decisions | Faux doublon | Aucune action |
| ProgrammeAnnuel vs AcademicYearTwin | Dette DEC-002 | **Créer mapper Sprint 1** |
| teacher-brain vs PCE memory | Opportunité | **Intégrer Sprint 2** |

---

## Conclusion

L'architecture SPIE-01 à SPIE-07 est **cohérente et sans doublons réels**. Le seul travail restant est la couche de persistance et l'intégration avec les APIs existantes.

> Voir `Architecture_Review_Report.md` pour la synthèse complète.
