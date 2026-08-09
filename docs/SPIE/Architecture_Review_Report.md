# SPIE-X — Rapport de revue d'architecture
## Audit complet ScorgIA V1 — SPIE-01 à SPIE-07

**Date** : 2026-08-04  
**Auteur** : SPIE-X Architecture Review  
**Statut** : ✅ Revue complète

---

## Résumé exécutif

ScorgIA V1 dispose d'une **architecture pédagogique complète et cohérente**. Les 7 moteurs SPIE (SPIE-01 à SPIE-07) forment une chaîne déterministe de décision pédagogique allant de l'ingestion du curriculum jusqu'à la stratégie d'enseignement annuelle. Cette architecture ne contient **aucun doublon réel**, **0 erreur TypeScript**, et est prête pour le développement des fonctionnalités réelles.

La principale dette technique est l'**absence de couche de persistance SPIE** — les objets domain sont calculés correctement mais jamais sauvegardés en DB. C'est le premier travail du Sprint 1.

---

## Mission 1 — Inventaire : résultats

### Composants inventoriés

| Catégorie | Count |
|-----------|-------|
| Moteurs SPIE (SPIE-01→07) | 12 moteurs (6 stubs + 6 complets) |
| Moteurs opérationnels (pre-SPIE) | 10 moteurs |
| Fichiers couche IA | 7 fichiers |
| Tables DB | 12+ tables Supabase |
| Routes API | 45+ routes |
| Pages UI | 50+ pages |
| Objets domain | 13 types majeurs |
| Fichiers documentation | 30+ fichiers docs/SPIE/ |

**Voir** : `Architecture_Review.md` — section 1.1 à 1.6

---

## Mission 2 — Doublons : résultats

**5 paires analysées. 0 doublon réel.**

| Paire | Verdict |
|-------|---------|
| TeachingStrategy vs PedagogicalStrategy | Faux doublon — niveaux temporels différents |
| recommendation-engine vs PPS | Faux doublon — domaines orthogonaux |
| decision-engine vs PCE DecisionEngine | Faux doublon — niveaux d'abstraction différents |
| ProgrammeAnnuel vs AcademicYearTwin | Chevauchement voulu — mapper requis (Sprint 1) |
| teacher-brain vs PCE memory | Complémentaires — intégration souhaitée (Sprint 2) |

---

## Mission 3 — Diagramme système

Voir `System_Diagram.md` pour les 3 diagrammes :
- Architecture globale (5 couches)
- Flux de génération d'une leçon
- Pipeline de planification annuelle

---

## Mission 4 — Bounded Contexts (DDD)

**10 Bounded Contexts identifiés** :

1. Identity & Access — Utilisateur, auth, forfaits
2. Curriculum Intelligence — CIE, CKG, extraction
3. Pedagogical Planning — PCE, AYDTE, PPS, PSE (SPIE)
4. Teaching Execution — Classes, leçons, ressources
5. Time Management — PTE, événements calendaires
6. AI Generation — build-system-prompt, teacher-brain, Claude
7. Assessment & Tracking — Quiz, sondages
8. Analytics & Intelligence — insight/recommendation/prediction/mission-engine
9. Resources & Library — Bibliothèque, partage
10. Administration — Admin, founder

**Voir** : `Bounded_Contexts.md`

---

## Mission 5 — Objets métier

Voir `Architecture_Review.md` — section 1.4

**Principaux objets et leur couche** :
- DB : Utilisateur, Classe, Lecon, ProgrammeAnnuel, GenerationIA
- SPIE : AcademicYearTwin, PedagogicalStrategy, PedagogicalSimulation, AcademicTime
- [DETTE] : mappers entre les deux couches manquants

---

## Mission 6 — Flux métier

**8 flux documentés** dans `Business_Flows.md` :
1. Onboarding
2. Ingestion curriculum
3. Génération plan annuel
4. Génération leçon
5. Session d'enseignement actif
6. Génération quiz
7. Suivi et amélioration
8. Partage et collaboration

---

## Mission 7 — Architecture IA

**Voir** : `AI_Architecture.md`

### Synthèse

| Question | Réponse |
|----------|---------|
| Qui décide ? | SPIE (déterministe) + teacher-reasoning-engine |
| Qui génère ? | Claude claude-opus-4-5 via build-system-prompt |
| Qui valide ? | PCE (score ≥ 30) + PPS (non irrealisable) + PSE (score ≥ 60) |
| Qui mémorise ? | teacher-brain (session) + PCE ContextMemory (annuel) + DB |
| Qui améliore ? | insight/predictive/recommendation/mission-engine |

---

## Mission 8 — Feuille de route technique

**6 sprints documentés** dans `Technical_Roadmap.md` :

| Sprint | Objectif | Durée |
|--------|----------|-------|
| 1 | Persistance SPIE | 2–3 semaines |
| 2 | Intégration APIs | 2–3 semaines |
| 3 | Génération plan annuel | 3–4 semaines |
| 4 | Génération séquences | 3–4 semaines |
| 5 | Génération leçons et activités | 3–4 semaines |
| 6 | Enseignement, suivi, amélioration | 2–3 semaines |

---

## Mission 9 — Documentation mise à jour

### Fichiers créés (SPIE-X)

| Fichier | Mission |
|---------|---------|
| `Architecture_Review.md` | Mission 1–2 |
| `System_Diagram.md` | Mission 3 |
| `Bounded_Contexts.md` | Mission 4 |
| `Business_Flows.md` | Mission 6 |
| `AI_Architecture.md` | Mission 7 |
| `Technical_Roadmap.md` | Mission 8 |
| `Technical_Debt.md` | Inventaire des dettes |
| `Architecture_Principles.md` | Principes fondateurs |
| `Architecture_Review_Report.md` | Ce fichier — Mission 12 |

### Fichiers mis à jour

| Fichier | Changement |
|---------|-----------|
| `Architecture.md` | Mis à jour avec architecture SPIE-X |
| `Roadmap.md` | Remplacé par Technical_Roadmap.md |
| `Decision_Log.md` | DEC-023 à DEC-025 ajoutés |
| `SPIE_Blueprint.md` | Statut mis à jour — architecture complète |

---

## Mission 10 — Contrôle qualité

**Résultat** : ✅ 0 erreur TypeScript (confirmé en fin de SPIE-07)

```
npx tsc --noEmit → 0 erreurs
```

Aucun code n'a été modifié dans SPIE-X (mission de documentation uniquement). L'état TypeScript est identique à la fin de SPIE-07.

---

## Mission 11 — Score d'architecture

### Évaluation sur 9 dimensions

| Dimension | Score | Justification |
|-----------|-------|---------------|
| **Cohérence** | 82/100 | Pipeline SPIE cohérent end-to-end ; quelques moteurs opérationnels non encore connectés au SPIE |
| **Évolutivité** | 90/100 | Architecture SPIE en barrel pattern, interfaces TypeScript strictes, ajout de moteur sans breaking change |
| **Maintenabilité** | 78/100 | 20+ moteurs à maintenir, mais séparation des responsabilités claire ; stubs SPIE-01 légèrement confusants |
| **Lisibilité** | 85/100 | Nommage français cohérent, types explicites, 30+ docs ; quelques noms longs (PedagogicalDecisionTree) |
| **Performance** | 62/100 | Absence de persistance SPIE (recalcul systématique) ; aucune stratégie de cache ; dette critique S1 |
| **Testabilité** | 74/100 | 5 suites de tests SPIE-07, 5 pour SPIE-06, bonnes couvertures ; moteurs opérationnels non testés |
| **Sécurité** | 76/100 | RLS prévu sur nouvelles tables ; auth Supabase ; admin protégé par email — pas de tests de sécurité |
| **Extensibilité** | 88/100 | 10 bounded contexts clairs, dépendances entre SPIE bien typées, ajout de features sans toucher l'architecture |
| **Documentation** | 86/100 | 30+ fichiers docs, rapport de chaque SPIE, Decision_Log complet ; Architecture.md datée (corrigée dans SPIE-X) |

### **Score global : 80/100**

**Interprétation**  
L'architecture est **solide et bien pensée**. Le score de performance (62) est le seul point faible significatif et correspond à une dette connue (persistance SPIE). Une fois les mappers et la persistance implémentés (Sprint 1), ce score passera à ~80+, portant le score global à ~83/100.

---

## Mission 12 — Synthèse finale

### Forces

1. **Architecture déterministe robuste** — SPIE prend des décisions pédagogiques auditables, traçables, reproductibles sans IA
2. **Séparation stricte des responsabilités** — 10 bounded contexts, 7 moteurs SPIE, couche IA indépendante
3. **Typage TypeScript strict** — 0 erreur sur l'ensemble de la codebase SPIE
4. **Documentation exhaustive** — Chaque moteur a son doc, chaque décision son DEC-XXX
5. **Sécurité by design** — RLS, admin protégé, autoApplicable: false sur toutes les recs
6. **Extensibilité** — Ajouter des features de génération ne nécessite pas de toucher SPIE

### Faiblesses

1. **Persistance absente** — Les objets SPIE sont calculés, pas sauvegardés (Sprint 1 critique)
2. **APIs non branchées** — PCE n'est pas encore intégré dans `/api/ia/generer` (Sprint 2 critique)
3. **Moteurs opérationnels non testés** — Les 10 moteurs pre-SPIE n'ont pas de tests unitaires
4. **TQE stub** — Pas de validation qualité post-génération
5. **Cache inexistant** — Chaque génération = appel Claude complet, même contexte identique

### Dette technique (résumé)

| Priorité | Dette | Sprint |
|----------|-------|--------|
| 🔴 Critique | DETTE-001 : Persistance SPIE absente | Sprint 1 |
| 🔴 Critique | DETTE-002 : Mapper AcademicYearTwin ↔ ProgrammeAnnuel | Sprint 1 |
| 🔴 Critique | DETTE-003 : PCE non branché dans APIs | Sprint 2 |
| 🟠 Haute | DETTE-005 : teacher-brain ↔ PCE memory | Sprint 2 |
| 🟠 Haute | DETTE-006 : TQE stub | Post-V1 |

**11 dettes totales documentées** — Voir `Technical_Debt.md`

### Recommandations

1. **Ne pas ajouter de nouveaux moteurs SPIE** — l'architecture est complète (Principe 9)
2. **Commencer par Sprint 1** — la persistance est le prérequis de tout
3. **Garder build-system-prompt.ts sacré** — DEC-005 est une règle absolue
4. **Intégrer PCE en priorité** — c'est la promesse centrale de SPIE-03
5. **Tester les moteurs opérationnels** — avant Sprint 3 pour éviter les régressions

### Architecture finale décidée

```
SCORGIA V1 — STACK OFFICIELLE

Frontend : Next.js 16.2.6 + React 19 + TypeScript 5
Auth : Supabase Auth
DB : Supabase PostgreSQL (avec RLS)
Storage : Supabase Storage
IA : Anthropic Claude claude-opus-4-5
Hébergement : (Vercel / Railway — à confirmer)

COUCHES :
UI → API Routes → [IA Layer] → [SPIE Layer] → [Operational Engines] → DB

SPIE PIPELINE :
CIE → PCE → AYDTE → PPS → PSE
              ↓
             PTE (temps réel)

RÈGLES ABSOLUES :
- build-system-prompt.ts : IMMUABLE via SPIE (DEC-005)
- autoApplicable: false sur toutes les recommandations (DEC-017)
- 0 appels IA dans SPIE (DEC-018)
- RLS sur toutes les nouvelles tables
- L'enseignant valide toujours avant application
```

### Prochains modules (après validation SPIE-X)

Les fonctionnalités réelles à développer (dans cet ordre) :
1. **Génération du plan annuel** — Sprint 3
2. **Génération des séquences** — Sprint 4
3. **Génération des plans de leçon** — Sprint 5
4. **Génération des activités** — Sprint 5
5. **Génération des quiz** — Sprint 5 (déjà partiellement en place)
6. **Génération des évaluations** — Sprint 5

---

*Ce rapport marque la fin de la phase d'architecture de ScorgIA V1. L'architecture est définitive. Les prochaines missions développent des fonctionnalités.*
