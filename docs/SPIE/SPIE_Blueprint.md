# SPIE — ScorgIA Pedagogical Intelligence Engine
## Blueprint officiel — Constitution technique et pédagogique

> **Version** : RELEASE-P0.2 (mis à jour 2026-08-09)
> **Date initiale** : 2026-08-03
> **Statut** : ✅ Architecture complète — SPIE-01→07 + SPIE-BETA-01/02/03/04 + RELEASE-P0/P0.2 · 0 erreur TS
> **Score architecture** : 80/100 — Voir `Architecture_Review_Report.md`
> **Auteur** : Architecture ScorgIA

### Corrections RELEASE-P0.2 (2026-08-09)

| Correction | Impact |
|-----------|--------|
| Compteurs Classe : fusion `lecons` + `fichiers_dossier` | P1 BLOQUANT résolu |
| Idempotence `programme_annuel` (check-then-update) | P5 résolu |
| Fallback `programme_annuel_id` FK null | M7a résolu |
| Onglet Quiz : affiche fichiers réels | M7b résolu |
| Modal confirmation Reconstruire | M17 résolu |
| CTA adaptatif Construire/Reprendre | M4 résolu |
| Bibliothèque : preview `contenu_html` | M13 résolu |
| PedagogiqueExplorer : 4 sources de données | M14 résolu |
| DEC-049 à DEC-052 ajoutés au Decision_Log | — |

---

## État actuel (SPIE-X)

L'architecture SPIE est **complète et définitive**. Les 7 moteurs sont livrés :

| Moteur | Sigle | Statut |
|--------|-------|--------|
| Curriculum Intelligence Engine | CIE | ✅ SPIE-02 |
| Pedagogical Context Engine | PCE | ✅ SPIE-03 |
| Academic Year Digital Twin | AYDTE | ✅ SPIE-04 |
| Pedagogical Planning Simulator | PPS | ✅ SPIE-05 |
| Pedagogical Time Engine | PTE | ✅ SPIE-06 |
| Pedagogical Strategy Engine | PSE | ✅ SPIE-07 |
| SPIE-01 Base Engines (stubs) | CKG/PPE/PGE/TQE/LCE/PAE | ✅ Interfaces définies |

### Missions SPIE-BETA

| Mission | Objectif | Statut |
|---------|----------|--------|
| SPIE-BETA-01 | Teaching Pack UI — wizard, timeline, entitlements | ✅ Livré |
| SPIE-BETA-02 | Alberta Teaching Pack — gabarits, Quality Gate, exports, versionnement | ✅ Livré |
| SPIE-BETA-03 | Première leçon enseignable — pipeline SSE 13 étapes, activités, quiz, adaptateurs | ✅ Livré |
| SPIE-BETA-04 | Certification bêta end-to-end — audit, corrections P0/P1, GO/NO GO | ✅ Livré |
| DEPLOY-BETA-01 | Préparation déploiement Vercel — docs, sécurité, migrations, branding | ✅ Livré |
| DEPLOY-BETA-02A | maxDuration routes longues — lesson-engine, build-year, lesson-regenerate, pdf | ✅ Livré |
| DEPLOY-BETA-02B | Validation schéma DB — script vérification 036, guide PO, PDF bêta | ✅ Livré |
| DEPLOY-BETA-03 | Certification finale — 19 maxDuration, audit sécurité/branding/Git, rapport PO | ✅ Livré |

**Certification** : ScorgIA Beta 0.9.2 — **GO PUSH & DEPLOY AVEC CONDITIONS** · 2026-08-06  
Aucune nouvelle couche d'architecture ne sera ajoutée (DEC-023).

---

## Vision fondatrice (inchangée)

---

## 1. Vision fondatrice

ScorgIA n'est **pas** un générateur de plans de leçon.

ScorgIA est une **plateforme d'ingénierie pédagogique assistée par intelligence artificielle**.

Son objectif est de transformer un curriculum officiel en un système complet de planification pédagogique, personnalisé pour chaque enseignant, chaque classe, chaque province.

---

## 2. L'expérience cible

L'enseignant arrive dans ScorgIA et choisit :

- Province
- Conseil scolaire / juridiction
- Niveau scolaire
- Matière

Puis, il importe son curriculum officiel **ou** ScorgIA utilise un curriculum déjà indexé.

Ensuite, ScorgIA construit automatiquement l'ensemble de sa planification :

```
Curriculum
  └─ Analyse & extraction
       └─ Résultats d'apprentissage généraux (RAG)
            └─ Résultats d'apprentissage spécifiques (RAS)
                 └─ Compétences
                      └─ Concepts & Vocabulaire
                           └─ Calendrier scolaire
                                └─ Plan annuel
                                     └─ Séquences
                                          └─ Plans de leçon
                                               └─ Activités
                                                    └─ Quiz & Évaluations
                                                         └─ Différenciation
                                                              └─ Réflexion professionnelle
```

ScorgIA devient ainsi le **copilote pédagogique de toute l'année scolaire**.

---

## 3. L'architecture SPIE

SPIE est composé de 6 sous-moteurs spécialisés, chacun avec une mission précise :

```
ScorgIA
├── SPIE  ─  Orchestrateur central
│
├── CKG   ─  Curriculum Knowledge Graph
│             Ingestion, extraction, graphe de connaissances curriculaires
│
├── PPE   ─  Provincial Pedagogy Engine
│             Règles et vocabulaire pédagogiques par province
│
├── PGE   ─  Planning Generation Engine
│             Génération de planifications à partir du KG et des règles
│
├── TQE   ─  Teaching Quality Engine
│             Validation de la qualité pédagogique du contenu généré
│
├── LCE   ─  Learning Continuity Engine
│             Cohérence entre leçons, séquences et plan annuel
│
└── PAE   ─  Pedagogical Analytics Engine
              Analyse, insights professionnels, recommandations
```

Voir [Architecture.md](Architecture.md) pour la description complète de chaque moteur.

---

## 4. Principes d'architecture

### 4.1 Multi-province, multi-pays, multi-curricula

SPIE doit pouvoir accueillir :
- Toutes les provinces canadiennes
- D'autres pays (France, Belgique, Maroc, etc.)
- Plusieurs curricula pour une même province (Programme of Studies + Diploma exams)
- Plusieurs langues d'enseignement
- Plusieurs modèles pédagogiques (Bloom, PFEQ, Big Ideas, etc.)

**Sans être réécrit.**

### 4.2 Séparation des préoccupations

| Couche | Responsabilité |
|--------|----------------|
| CKG | Ce que le curriculum **dit** |
| PPE | Comment la province **enseigne** |
| PGE | Ce que l'IA **génère** |
| TQE | Si le contenu est **valide** |
| LCE | Si la progression est **cohérente** |
| PAE | Ce que les **données** révèlent |

### 4.3 Réutilisation de l'existant

SPIE **n'est pas une réécriture** de l'infrastructure existante. Il s'appuie sur :

| Existant | Rôle dans SPIE |
|----------|----------------|
| `teacher-reasoning-engine.ts` | Composant interne de PGE |
| `build-system-prompt.ts` | Composant interne de PGE + PPE |
| `templates-provinciaux.ts` | Registre de gabarits du PPE |
| `teacher-brain.ts` | Composant interne de PAE |
| `insight-engine.ts` / `recommendation-engine.ts` | Composants internes de PAE |
| `pedagogy/curriculum/curriculum-parser.ts` | Composant interne de CKG |
| `ContenuLecon` (database.ts) | Persistance du LessonPlan SPIE |
| `ProgrammeAnnuel` (database.ts) | Persistance de l'AnnualPlan SPIE |

### 4.4 Règle de non-modification

> **Aucun fichier existant n'est modifié dans SPIE-01.**
>
> SPIE-01 crée uniquement des fichiers nouveaux : types, interfaces, services vides, documentation.
>
> Les intégrations avec le code existant se feront dans les missions SPIE-02 et suivantes.

---

## 5. Objets métier centraux

Les objets complets sont définis dans [Domain_Model.md](Domain_Model.md).

Résumé :

| Objet | Description | Fichier TypeScript |
|-------|-------------|-------------------|
| `ProvinceEducation` | Province avec son système pédagogique | `types/province.ts` |
| `SchoolAuthority` | Conseil scolaire / juridiction | `types/province.ts` |
| `Curriculum` | Programme officiel versionné | `types/curriculum.ts` |
| `CurriculumDocument` | Document source du curriculum | `types/curriculum.ts` |
| `CurriculumExtraction` | Résultat d'extraction IA | `types/curriculum.ts` |
| `LearningOutcomeGeneral` | RAG / Overall Expectation | `types/outcomes.ts` |
| `LearningOutcomeSpecific` | RAS / Specific Expectation | `types/outcomes.ts` |
| `Competency` | Compétence disciplinaire ou transversale | `types/outcomes.ts` |
| `BigIdea` | Grande idée (BC / IB) | `types/outcomes.ts` |
| `EssentialKnowledge` | Connaissance essentielle | `types/outcomes.ts` |
| `Vocabulary` | Terme du vocabulaire disciplinaire | `types/outcomes.ts` |
| `AnnualPlan` | Plan annuel d'une classe | `types/planning.ts` |
| `SequencePlan` | Séquence d'apprentissage | `types/planning.ts` |
| `LessonPlan` | Plan de leçon complet | `types/planning.ts` |
| `LessonActivity` | Activité dans une leçon | `types/planning.ts` |
| `Quiz` | Quiz généré | `types/assessment.ts` |
| `Assessment` | Évaluation sommative | `types/assessment.ts` |
| `QualityReport` | Rapport de qualité TQE | `types/assessment.ts` |
| `PedagogicalResource` | Ressource pédagogique | `types/resources.ts` |
| `Template` | Gabarit de leçon | `types/resources.ts` |
| `ProfessionalStandard` | Norme professionnelle (TQS, etc.) | `types/resources.ts` |
| `AcademicCalendar` | Calendrier scolaire provincial | `types/calendar.ts` |
| `TeachingReflection` | Réflexion professionnelle post-leçon | `types/resources.ts` |

---

## 6. Pipeline officiel

Le pipeline complet est détaillé dans [Pipeline.md](Pipeline.md).

Résumé des étapes :

1. **Intake** — L'enseignant choisit sa province, niveau, matière, curriculum
2. **Ingestion** — CKG ingère le document curriculaire
3. **Extraction** — CKG extrait les RAG, RAS, compétences, concepts
4. **Graph** — CKG construit le graphe de connaissances
5. **Calendar** — LCE construit le calendrier scolaire
6. **Annual Plan** — PGE génère le plan annuel à partir du graphe
7. **Sequences** — PGE découpe le plan annuel en séquences
8. **Lessons** — PGE génère les plans de leçon pour chaque séquence
9. **Quality** — TQE valide chaque leçon (Bloom, alignement, différenciation)
10. **Teach** — L'enseignant enseigne avec le copilot temps réel
11. **Track** — LCE + PAE analysent la progression et la cohérence
12. **Reflect** — PAE génère les insights professionnels

---

## 7. Gabarits ScorgIA

Les gabarits sont versionnés, modifiables et remplaçables.

ScorgIA fournit trois gabarits officiels par défaut pour l'Alberta :
- Plan annuel (AnnualPlan)
- Plan de séquence (SequencePlan)
- Plan de leçon (LessonPlan)

Voir [Templates.md](Templates.md) pour la structure complète et les gabarits des autres provinces.

---

## 8. Normes professionnelles

ScorgIA prépare l'architecture pour associer des normes professionnelles :
- Teaching Quality Standard (Alberta Education)
- Normes Ontario, Québec, BC (extensions futures)

Voir [Provincial_Engine.md](Provincial_Engine.md) pour l'architecture d'extension.

---

## 9. Règle documentaire (Mission 12)

> **À partir de SPIE-01, chaque futur prompt SPIE doit obligatoirement mettre à jour les documents Markdown existants.**
>
> Ne jamais créer une nouvelle documentation parallèle.
> Toujours enrichir les documents existants.
> La documentation grandit en même temps que le code.

---

## 10. Roadmap SPIE

Voir [Roadmap.md](Roadmap.md) pour le détail des prochaines missions.

| Mission | Objectif principal | Statut |
|---------|--------------------|--------|
| SPIE-01 | Fondation : architecture, types, documentation | ✅ |
| SPIE-02 | CKG : ingestion et extraction curriculaire | ✅ |
| SPIE-03 | PPE : moteur provincial complet | ✅ |
| SPIE-04 | PGE : génération plan annuel + séquences | ✅ |
| SPIE-05 | TQE : validation qualité pédagogique | ✅ |
| SPIE-06 | LCE : cohérence et continuité | ✅ |
| SPIE-07 | PAE : analytics et insights | ✅ |
| SPIE-X | Persistance, intégrations PCE | ✅ |
| SPIE-BETA-01 | Teaching Pack UI — wizard, pipeline SSE | ✅ |
| SPIE-BETA-02 | Alberta Teaching Pack — gabarits, Quality Gate, exports | ✅ |
| SPIE-BETA-03 | Première leçon enseignable — pipeline SSE 13 étapes, activités, quiz | ✅ |
| SPIE-BETA-04 | Certification bêta end-to-end — audit, corrections P0/P1, GO/NO GO | ✅ |
| RELEASE-P0 | Déploiement Vercel — docs, sécurité, migrations, branding, maxDuration | ✅ |
| RELEASE-P0.2 | Workspace Data Binding — compteurs, explorer, bibliothèque, onglets | ✅ |
