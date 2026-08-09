# SPIE-X — Dette technique
## Catalogue complet des dettes identifiées

**Date** : 2026-08-04  
**Scope** : Architecture SPIE-01 → SPIE-07 + moteurs opérationnels

---

## Dette critique (bloquante pour la production)

### DETTE-001 — Absence de persistance SPIE

**Sévérité** : 🔴 Critique  
**Découverte** : SPIE-X Mission 1

**Description**  
Les objets domain SPIE suivants sont recalculés à chaque requête et jamais persistés :
- `AcademicYearTwin` (SPIE-04)
- `PedagogicalSimulation` (SPIE-05)
- `PedagogicalStrategy` (SPIE-07)
- `AcademicTime` + `AcademicClock` (SPIE-06)

**Impact**  
- Performance dégradée à l'échelle (recalcul coûteux à chaque page load)
- Impossibilité de faire évoluer l'état du twin au fil du temps
- Pas de versionnage des stratégies en production

**Plan de résolution** : Sprint 1 du Technical_Roadmap.md

---

### DETTE-002 — Mapper AcademicYearTwin ↔ ProgrammeAnnuel manquant

**Sévérité** : 🔴 Critique  
**Référence** : DEC-002

**Description**  
`ProgrammeAnnuel` (DB) et `AcademicYearTwin` (SPIE-04) modélisent le même concept métier (le plan annuel de l'enseignant) à deux niveaux différents. Aucun mapper n'existe pour passer de l'un à l'autre.

**Impact**  
- On ne peut pas charger un plan annuel existant dans le twin pour le recalculer
- On ne peut pas sauvegarder un twin calculé comme plan annuel DB

**Plan de résolution** : Sprint 1 — tâche S1-01 et S1-02

---

### DETTE-003 — PCE non branché dans les API routes

**Sévérité** : 🔴 Critique  
**Référence** : DEC-013

**Description**  
PCE est défini comme "entrée obligatoire pour toute génération" (DEC-013) mais n'est pas encore intégré dans `/api/ia/generer` ni `/api/ia/regenerer-plan-annuel`. Le système génère du contenu sans passer par le contexte pédagogique.

**Impact**  
- Toutes les générations actuelles ignorent le contexte curriculum
- La promesse "SPIE enrichit la génération" n'est pas encore tenue

**Plan de résolution** : Sprint 2 — tâche S2-01 et S2-02

---

## Dette haute (impacte la qualité mais non bloquante)

### DETTE-004 — Moteurs SPIE-01 en mode stub

**Sévérité** : 🟠 Haute  
**Référence** : DEC-007

**Description**  
Six moteurs SPIE-01 (CKG, PPE, PGE, TQE, LCE, PAE) sont des stubs. Leurs fonctionnalités réelles ont été implémentées dans les moteurs SPIE-02 à SPIE-07, mais les stubs existent toujours et pourraient créer de la confusion.

**Impact**  
- Code mort dans `src/lib/spie/engines/`
- Risque de confusion pour un futur développeur

**Plan de résolution** : Documenter clairement que SPIE-01 stubs = interfaces publiques, SPIE-02+ = implémentations. Ne pas supprimer les stubs (contrats d'interface).

---

### DETTE-005 — teacher-brain non alimenté par PCE ContextMemory

**Sévérité** : 🟠 Haute  
**Découverte** : SPIE-X Mission 2

**Description**  
`teacher-brain` (mémoire de session IA) et `PCE ContextMemory` (couverture curriculum annuelle) sont complémentaires mais non connectés. La mémoire de session ne profite pas de l'état persistant du programme.

**Impact**  
- Les générations ne savent pas ce qui a déjà été enseigné
- Risque de répétition ou incohérence dans le contenu généré

**Plan de résolution** : Sprint 2 — tâche S2-05

---

### DETTE-006 — TQE (Teaching Quality Engine) stub

**Sévérité** : 🟠 Haute  
**Référence** : SPIE-01

**Description**  
Le Teaching Quality Engine (TQE) est un stub SPIE-01. Il devrait valider la qualité pédagogique des leçons générées (cohérence avec Bloom, balance activités/évaluation, accessibilité). Ce rôle n'est actuellement rempli par aucun moteur.

**Impact**  
- Les leçons ne passent par aucun filtre qualité post-génération
- Dépendance totale à la qualité du prompt système

**Plan de résolution** : Post-Sprint 6 (roadmap V2)

---

## Dette moyenne

### DETTE-007 — Tests des moteurs opérationnels (pre-SPIE)

**Sévérité** : 🟡 Moyenne

**Description**  
Les 10 moteurs opérationnels (activity-engine, insight-engine, etc.) n'ont pas de tests unitaires documentés. Seuls les 7 moteurs SPIE ont leurs tests.

**Plan de résolution** : Ajouter des tests de base pour les engines critiques (recommendation-engine, insight-engine, teaching-strategy) dans Sprint 2 ou 3.

---

### DETTE-008 — Aucune stratégie de cache pour les appels Claude

**Sévérité** : 🟡 Moyenne

**Description**  
Chaque génération fait un appel Claude complet. Il n'y a pas de cache pour les curricula déjà analysés, ni pour les contextes PCE identiques.

**Plan de résolution** : Utiliser Supabase pour cacher les extractions curriculum (CIE), et les PedagogicalContext pour les classes sans changements depuis la dernière génération.

---

### DETTE-009 — Routes SPIE inexistantes dans l'API

**Sévérité** : 🟡 Moyenne

**Description**  
Il n'existe aucune route publique pour accéder aux données SPIE directement (`/api/spie/*`). Toutes les données SPIE sont calculées in-process dans les handlers existants.

**Plan de résolution** : Sprint 2 — tâches S2-06, S2-07, S2-08

---

## Dette faible (cosmétique ou future)

### DETTE-010 — Documentation Architecture.md datée (SPIE-01 era)

**Sévérité** : 🟢 Faible

**Description**  
`docs/SPIE/Architecture.md` décrit encore l'architecture SPIE-01 (6 engines dans un orchestrateur). Elle ne reflète plus l'architecture réelle SPIE-02→07.

**Plan de résolution** : Mise à jour dans SPIE-X Mission 9.

---

### DETTE-011 — Roadmap.md couvre seulement SPIE-01/02

**Sévérité** : 🟢 Faible

**Plan de résolution** : Remplacer par Technical_Roadmap.md (ce fichier).

---

## Résumé

| Sévérité | Count | Plan |
|----------|-------|------|
| 🔴 Critique | 3 | Sprint 1 + Sprint 2 |
| 🟠 Haute | 3 | Sprint 2 + post-V1 |
| 🟡 Moyenne | 3 | Sprint 2-3 |
| 🟢 Faible | 2 | SPIE-X Mission 9 |

**Total : 11 dettes documentées.** Aucune ne bloque le développement des features si les sprints sont exécutés dans l'ordre.
