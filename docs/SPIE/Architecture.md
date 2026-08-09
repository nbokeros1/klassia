# Architecture SPIE — Description détaillée des sous-moteurs

> Référence : [SPIE_Blueprint.md](SPIE_Blueprint.md)  
> Version : SPIE-X (mis à jour 2026-08-04 — remplace SPIE-01)

---

## ⚠️ Note de version (SPIE-X)

Ce fichier décrit l'architecture SPIE-01 (stubs). L'architecture complète et à jour est documentée dans :

- `Architecture_Review.md` — inventaire complet SPIE-01 à SPIE-07
- `System_Diagram.md` — diagramme système global
- `Bounded_Contexts.md` — 10 bounded contexts DDD
- `Architecture_Review_Report.md` — synthèse et score d'architecture

**Architecture réelle (SPIE-X)** :

```
CIE (SPIE-02) → PCE (SPIE-03) → AYDTE (SPIE-04) → PPS (SPIE-05) → PSE (SPIE-07)
                                       ↓
                                  PTE (SPIE-06)
```

Les moteurs SPIE-01 (CKG, PPE, PGE, TQE, LCE, PAE) sont des **stubs** qui définissent les contrats d'interface. Leurs fonctionnalités réelles ont été implémentées dans SPIE-02 à SPIE-07.

---

## Architecture SPIE-01 (historique)

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                         SPIE ORCHESTRATEUR                       │
│                                                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │   CKG   │→ │   PPE   │→ │   PGE   │→ │   TQE   │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│       ↑                         ↓               ↓               │
│  ┌─────────┐              ┌─────────┐  ┌─────────────┐          │
│  │  Docs   │              │   LCE   │→ │     PAE     │          │
│  └─────────┘              └─────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. SPIE — Orchestrateur central

### Mission
Coordonner tous les sous-moteurs pour répondre à une intention pédagogique de l'enseignant.

### Responsabilités
- Recevoir les requêtes de planification (import curriculum, generate annual plan, etc.)
- Sélectionner et séquencer les sous-moteurs appropriés
- Maintenir l'état du pipeline (quelle étape est complétée pour quelle classe)
- Exposer les interfaces publiques à l'interface utilisateur

### Interfaces publiques
- `SPIE.initializeCurriculum(params)` → démarre le pipeline CKG
- `SPIE.generateAnnualPlan(classeId)` → démarre le pipeline PGE
- `SPIE.validateLesson(lessonId)` → appelle TQE
- `SPIE.getInsights(enseignantId)` → appelle PAE

### Dépendances
Dépend de tous les sous-moteurs. Aucun sous-moteur ne dépend de SPIE directement.

### Fichier TypeScript
`src/lib/spie/engines/spie-orchestrator.ts` (SPIE-02+)

---

## 2. CKG — Curriculum Knowledge Graph

### Mission
Transformer un document curriculaire brut (PDF, Word, texte) en un graphe de connaissances structuré, interrogeable, et traçable.

### Responsabilités
- Ingérer des documents curriculaires officiels
- Extraire : résultats d'apprentissage généraux et spécifiques, compétences, concepts, vocabulaire, grandes idées
- Construire le graphe de connaissances (nœuds et relations)
- Fournir des requêtes : "quels RAS pour ce niveau/matière ?", "quels concepts liés à ce RAG ?"
- Versionner les extractions (le curriculum change, le graphe doit pouvoir être mis à jour)
- Gérer les duplicats et les contradictions entre curricula

### Entrées
- Document curriculaire (PDF, DOCX, texte brut)
- Identifiant de province et matière
- Version du curriculum

### Sorties
- `CurriculumExtraction` : RAG, RAS, compétences, concepts, vocabulaire structurés
- `KnowledgeGraph` : réseau de nœuds et relations

### Infrastructure existante réutilisée
- `src/lib/pedagogy/curriculum/curriculum-parser.ts`
- `src/lib/ia/build-document-context.ts`
- `src/lib/documents/extraire-texte.ts`
- Tables Supabase : `fichiers_indexation`, `fichiers_dossier`

### Extensions futures
- RAG vectoriel (embeddings) pour recherche sémantique
- Alignement automatique entre curricula (Alberta ↔ Ontario)
- Import depuis les APIs ministérielles
- Détection de progression verticale (maternelle → secondaire)

### Fichier TypeScript
`src/lib/spie/engines/ckg/`

---

## 3. PPE — Provincial Pedagogy Engine

### Mission
Encoder les règles, le vocabulaire et les conventions pédagogiques spécifiques à chaque province (et pays), afin que la génération soit toujours conforme aux attentes locales.

### Responsabilités
- Fournir le gabarit officiel de plan de leçon pour chaque province
- Adapter le vocabulaire pédagogique (RAG/RAS en Alberta = Overall/Specific Expectations en Ontario)
- Injecter le contexte provincial dans les prompts de génération
- Gérer les différences de modèles pédagogiques (Bloom, PFEQ, Big Ideas, etc.)
- Fournir les règles de différenciation par province (Universel/Ciblé/Spécialisé en Alberta vs. PEI/accommodements en Ontario)
- Associer les normes professionnelles (TQS Alberta, Standards Ontario, etc.)

### Entrées
- Code de province
- Niveau scolaire
- Matière
- Type de contenu à générer (leçon, séquence, plan annuel)

### Sorties
- `ProvinceProfile` : profil pédagogique de la province
- `TemplateSelection` : gabarit à utiliser
- `PromptAdaptations` : modifications à appliquer au prompt de génération

### Infrastructure existante réutilisée
- `src/lib/constants/templates-provinciaux.ts`
- `src/lib/constants/curricula.ts` (`CURRICULA_CONTEXT`)
- `src/lib/ia/skills-pedagogiques.ts`
- `src/lib/ia/build-system-prompt.ts` (section gabarits)

### Extensions futures
- Ajout de provinces canadiennes (Nouvelle-Écosse, Î.-P.-É., etc.)
- Ajout de pays (France, Belgique, Suisse, Maroc, Sénégal)
- Gabarits personnalisés par conseil scolaire
- Compliance avec les réformes curriculaires en temps réel

### Fichier TypeScript
`src/lib/spie/engines/ppe/`

---

## 4. PGE — Planning Generation Engine

### Mission
Générer du contenu pédagogique de haute qualité — plans annuels, séquences, leçons, activités, quiz — en utilisant le CKG comme source de vérité curriculaire et le PPE comme guide pédagogique.

### Responsabilités
- Construire les prompts enrichis (CKG + PPE + profil enseignant)
- Orchestrer la génération IA via les routes `/api/ia/`
- Structurer la sortie IA en objets métier (`LessonPlan`, `SequencePlan`, `AnnualPlan`)
- Gérer le budget de tokens et la qualité des sorties
- Maintenir la cohérence entre leçons consécutives

### Entrées
- `CurriculumExtraction` depuis CKG
- `ProvinceProfile` depuis PPE
- Profil enseignant (`ProfilIA`)
- Paramètres de génération (type, durée, niveau, langue)

### Sorties
- `LessonPlan` structuré
- `SequencePlan` structuré
- `AnnualPlan` structuré

### Infrastructure existante réutilisée
- `src/lib/ia/teacher-reasoning-engine.ts` (raisonnement algorithmique)
- `src/lib/ia/build-system-prompt.ts` (construction du prompt)
- `src/lib/ia/teacher-memory-engine.ts` (personnalisation)
- `src/lib/ia/build-auto-context.ts` (sélection de documents)
- `src/lib/ia/get-max-tokens.ts` (budget tokens)
- Routes : `/api/ia/generer`, `/api/ia/assistant`, `/api/ia/curriculum`

### Extensions futures
- Génération séquentielle de toute une année en une passe
- Différenciation automatique 3 niveaux à chaque leçon
- Intégration vidéos et ressources externes
- Génération de matériel pour les élèves (fiches, exercices)

### Fichier TypeScript
`src/lib/spie/engines/pge/`

---

## 5. TQE — Teaching Quality Engine

### Mission
Valider que le contenu pédagogique généré respecte les standards de qualité attendus avant de le présenter à l'enseignant.

### Responsabilités
- Vérifier l'alignement curriculaire (le contenu couvre-t-il les bons RAS ?)
- Vérifier la couverture de la taxonomie de Bloom
- Vérifier la présence de la différenciation
- Vérifier la cohérence des durées estimées
- Vérifier l'intégration de la perspective autochtone si requise
- Générer un rapport de qualité avec score et recommandations

### Entrées
- `LessonPlan` généré par PGE
- `CurriculumExtraction` cible (pour vérifier l'alignement)
- `ProvinceProfile` (pour connaître les exigences provinciales)

### Sorties
- `QualityReport` avec score, problèmes identifiés, suggestions d'amélioration

### Infrastructure existante réutilisée
- `src/lib/pedagogy/lessons/lesson-analyzer.ts`
- `src/lib/pedagogy/evaluations/evaluation-analyzer.ts`
- Skill `audit-sortie-ia`

### Extensions futures
- Scoring automatique de toute une séquence
- Comparaison avec les meilleures pratiques de la communauté
- Intégration des normes professionnelles (TQS Alberta)
- Rapport de conformité pour direction d'école

### Fichier TypeScript
`src/lib/spie/engines/tqe/`

---

## 6. LCE — Learning Continuity Engine

### Mission
Assurer la cohérence et la continuité des apprentissages à travers toutes les leçons, séquences et le plan annuel entier.

### Responsabilités
- Vérifier que les prérequis de chaque leçon ont été couverts dans les leçons précédentes
- Détecter les lacunes dans la couverture curriculaire
- Alerter quand le rythme réel diverge du plan annuel
- Recalibrer le plan annuel après des absences, jours fériés, ou changements
- Assurer la progression verticale (les concepts de cette leçon préparent ceux de la prochaine)

### Entrées
- `AnnualPlan` et `SequencePlan` de PGE
- Statuts réels des leçons enseignées
- Calendrier scolaire actuel

### Sorties
- `ContinuityReport` : état de la cohérence
- `PlanAdjustments` : suggestions d'ajustement du plan

### Infrastructure existante réutilisée
- `src/lib/teacher-brain/` (Teacher Brain)
- `src/lib/workflow-runtime/workflow-runtime.ts`
- `src/lib/mission-engine/` (Mission Engine)
- Tables : `missions_enseignant`, `workflow_instances`, `evenements_calendrier`

### Extensions futures
- Synchronisation entre enseignants (co-enseignement)
- Cohérence verticale entre niveaux (l'année précédente a-t-elle couvert les prérequis ?)
- Intégration du programme d'études personnalisé (PEP)

### Fichier TypeScript
`src/lib/spie/engines/lce/`

---

## 7. PAE — Pedagogical Analytics Engine

### Mission
Transformer les données d'enseignement en insights professionnels actionnables pour l'enseignant.

### Responsabilités
- Analyser les patterns d'enseignement (cadence, complétion, cohérence)
- Générer des recommandations pédagogiques personnalisées
- Prédire les risques (leçons non couvertes, évaluations manquées, pacing trop rapide)
- Alimenter le tableau de bord professionnel
- Générer les réflexions post-leçon

### Entrées
- Événements d'activité (`activity_events`)
- Statuts des leçons
- Insights accumulés
- Profil enseignant

### Sorties
- `TeacherInsight` : insight professionnel avec confiance et priorité
- `TeacherRecommendation` : action recommandée
- `TeacherPrediction` : risque prédit
- `TeachingReflection` : réflexion post-cours

### Infrastructure existante réutilisée
- `src/lib/insight-engine/insight-engine.ts`
- `src/lib/recommendation-engine/recommendation-engine.ts`
- `src/lib/predictive-engine/predictive-engine.ts`
- `src/lib/teacher-brain/teacher-brain.ts`
- Tables : `teacher_insights`, `teacher_recommendations`, `teacher_predictions`, `teacher_memory`

### Extensions futures
- Comparaison anonymisée avec d'autres enseignants (benchmarking)
- Portfolio professionnel automatique
- Rapport pour direction d'école
- Intégration avec les résultats des élèves

### Fichier TypeScript
`src/lib/spie/engines/pae/`
