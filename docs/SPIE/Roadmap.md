# Roadmap SPIE
## Progression des missions

> Référence : [SPIE_Blueprint.md](SPIE_Blueprint.md)  
> Version : SPIE-X (mis à jour 2026-08-04)

---

## ⚠️ Note de version

La feuille de route complète des sprints de fonctionnalités est dans `Technical_Roadmap.md`.  
Ce fichier conserve l'historique des missions SPIE-01 à SPIE-07 (phase architecture).

---

## Phase architecture — COMPLÈTE ✅

| Mission | Livré | Statut |
|---------|-------|--------|
| SPIE-01 | 2026-08-03 | ✅ Fondation, stubs, types |
| SPIE-02 | 2026-08-04 | ✅ CIE — Curriculum Intelligence |
| SPIE-03 | 2026-08-04 | ✅ PCE — Pedagogical Context |
| SPIE-04 | 2026-08-04 | ✅ AYDTE — Academic Year Digital Twin |
| SPIE-05 | 2026-08-04 | ✅ PPS — Planning Simulator |
| SPIE-06 | 2026-08-04 | ✅ PTE — Pedagogical Time Engine |
| SPIE-07 | 2026-08-04 | ✅ PSE — Pedagogical Strategy Engine |
| SPIE-X  | 2026-08-04 | ✅ Architecture Review — inventaire, diagrammes, score |

**Score d'architecture : 80/100** — Voir `Architecture_Review_Report.md`

---

## Phase fonctionnalités — À DÉMARRER

Voir `Technical_Roadmap.md` pour les 6 sprints détaillés.

| Sprint | Objectif |
|--------|----------|
| Sprint 1 | Persistance SPIE (mappers, JSONB) |
| Sprint 2 | Intégration APIs (PCE dans generer, PSE dans plan) |
| Sprint 3 | Génération plan annuel (UI + pipeline complet) |
| Sprint 4 | Génération séquences |
| Sprint 5 | Génération leçons, activités, évaluations |
| Sprint 6 | Enseignement actif, suivi, amélioration |

---

## Historique — SPIE-01 (fondation)

**Objectif** : Fondation — architecture complète, types, documentation  
**Livré le** : 2026-08-03  
**Statut** : ✅ Validé

### Livrables SPIE-01
- ✅ Audit complet du codebase existant
- ✅ Architecture 6 moteurs (CKG, PPE, PGE, TQE, LCE, PAE)
- ✅ Documentation complète (10 fichiers Markdown)
- ✅ 23 types de domaine TypeScript complets
- ✅ 6 engines avec interfaces complètes (stubs)
- ✅ Pipeline state machine (stubs)
- ✅ Validators synchrones fonctionnels
- ✅ 0 erreur TypeScript

---

## SPIE-02 — Curriculum Intelligence Engine 🔜

**Objectif** : Construire le vrai moteur d'intelligence curriculaire  
**Prérequis** : Validation de SPIE-01

### Missions
1. Parseurs (PDF, DOCX, Markdown, Texte) → sortie commune
2. Extraction structurée (RAG, RAS, compétences, concepts, vocabulaire)
3. Construction du graphe de connaissances (CKG complet)
4. Constraint Engine (semaines, durées, prérequis, co-requis)
5. Quality Engine pour les données curriculaires
6. Services : `curriculum-parser`, `curriculum-normalizer`, `curriculum-validator`, `curriculum-graph`, `constraint-engine`, `curriculum-cache`
7. Documentation : `Curriculum_Engine.md`, `Constraint_Engine.md`, `Parser.md`, `Extraction_Model.md`, `Validation.md`
8. Tests unitaires pour chaque composant
9. Rapport SPIE-02

**Note** : Le moteur doit fonctionner avec n'importe quel curriculum, pas seulement l'Alberta.

---

## SPIE-03 — Provincial Pedagogy Engine 🔜

**Objectif** : PPE complet avec registre de toutes les provinces et gabarits versionnés  
**Prérequis** : Validation de SPIE-02

### Missions
1. Registre provincial complet (toutes provinces canadiennes + FR + IB)
2. Versionnement des gabarits dans la DB
3. Adaptation des prompts par province (lien avec `build-system-prompt.ts`)
4. Normes professionnelles (TQS Alberta structure + indicateurs)
5. Interface enseignant pour gabarits personnalisés
6. Tests d'adaptation provinciale

---

## SPIE-04 — Planning Generation Engine 🔜

**Objectif** : Génération complète plan annuel → séquences → leçons  
**Prérequis** : Validation de SPIE-03

### Missions
1. Génération plan annuel (PGE + CKG + PPE + calendrier)
2. Génération séquences thématiques
3. Génération plans de leçon sur demande
4. Mapper domain model ↔ persistance DB
5. Intégration avec l'interface Préparer existante
6. Batch generation (générer toute une séquence en une fois)

---

## SPIE-05 — Teaching Quality Engine 🔜

**Objectif** : Validation qualité automatique de tout contenu généré  
**Prérequis** : Validation de SPIE-04

### Missions
1. TQE complet (alignement, Bloom, différenciation, structure)
2. Intégration des normes professionnelles (TQS Alberta)
3. Score de qualité en temps réel dans l'interface
4. Rapport de qualité avec suggestions
5. Re-génération automatique si score < seuil

---

## SPIE-06 — Learning Continuity Engine 🔜

**Objectif** : Cohérence de l'année scolaire entière  
**Prérequis** : Validation de SPIE-05

### Missions
1. Suivi de progression réelle vs. planifiée
2. Détection de lacunes curriculaires
3. Recalibration automatique du plan annuel
4. Intégration avec le Teacher Brain existant
5. Alertes de déviation de calendrier

---

## SPIE-07 — Pedagogical Analytics Engine 🔜

**Objectif** : Insights professionnels actionnables  
**Prérequis** : Validation de SPIE-06

### Missions
1. PAE complet (intégration insight/recommendation/prediction engines existants)
2. Réflexion post-leçon automatisée
3. Tableau de bord professionnel annuel
4. Rapport pour direction d'école
5. Benchmarking anonymisé

---

## SPIE-08 — Interface enseignant complète 🔜

**Objectif** : UX fluide pour l'ensemble du pipeline  
**Prérequis** : Validation de SPIE-07

---

## SPIE-09 — Export et intégrations 🔜

**Objectif** : Export DOCX, PPTX, PDF, intégrations LMS  
**Prérequis** : Validation de SPIE-08

---

## SPIE-10 — Multilingue et multi-pays 🔜

**Objectif** : Extension internationale (France, Maroc, Belgique, etc.)  
**Prérequis** : Validation de SPIE-09

---

## Règle de progression

> Chaque mission SPIE doit être :
> 1. Complétée à 100% (0 erreur TypeScript, tests passent, documentation mise à jour)
> 2. Soumise pour validation
> 3. Validée par le Product Owner
> 4. Avant que la mission suivante ne commence

Cette règle garantit que l'architecture reste solide et cohérente.
