# SPIE-X — Feuille de route technique
## Les 6 sprints pour passer de l'architecture aux fonctionnalités réelles

**Date** : 2026-08-04  
**Principe** : Aucune nouvelle couche d'architecture. Développement des fonctionnalités réelles.

---

## Contexte

L'architecture SPIE-01 à SPIE-07 est complète. Les fondations sont en place :
- 7 moteurs SPIE (déterministes, typés, testés)
- 10 moteurs opérationnels (pre-SPIE)
- Couche IA (build-system-prompt, teacher-brain, PCE)
- Base de données Supabase structurée

**Ce qui manque** : les connexions entre ces couches. Le SPIE tourne dans le vide — il n'est pas branché sur les APIs existantes ni sur la DB.

---

## Sprint 1 — Persistance SPIE (2–3 semaines)

**Objectif** : Connecter les objets domain SPIE à la base de données.

### Tâches

| # | Tâche | Priorité |
|---|-------|---------|
| S1-01 | Créer le mapper `AcademicYearTwin ↔ ProgrammeAnnuel` (DEC-002) | CRITIQUE |
| S1-02 | Créer le mapper `SequenceBlock ↔ Unite` | CRITIQUE |
| S1-03 | Créer le mapper `PedagogicalStrategy → programmes_annuels.metadata` | HIGH |
| S1-04 | Créer le mapper `PedagogicalSimulation → cache (table simulation_cache)` | HIGH |
| S1-05 | Ajouter colonne `spie_metadata` (JSONB) à `programmes_annuels` | HIGH |
| S1-06 | Créer table `spie_strategy_cache` pour les stratégies calculées | MEDIUM |
| S1-07 | Migrer PCE ContextMemory vers `classes.spie_context` (JSONB) | HIGH |

### Résultat attendu
Un `AcademicYearTwin` calculé par AYDTE peut être sauvegardé, rechargé, et recalculé à la demande sans tout reconstruire.

### Règles
- RLS activé sur toutes les nouvelles tables
- Chaque mapper a ses types TypeScript (pas de `any`)
- 0 modification du schéma existant sauf ajout de colonnes JSONB

---

## Sprint 2 — Intégration APIs SPIE (2–3 semaines)

**Objectif** : Brancher le SPIE dans les APIs existantes.

### Tâches

| # | Tâche | Priorité |
|---|-------|---------|
| S2-01 | Intégrer PCE dans `/api/ia/generer` (contexte enrichi automatique) | CRITIQUE |
| S2-02 | Intégrer PSE dans `/api/ia/regenerer-plan-annuel` (valider avant générer) | CRITIQUE |
| S2-03 | Intégrer PPS dans la UI du plan annuel (afficher SimulationReport) | HIGH |
| S2-04 | Intégrer PTE dans `/api/ia/teaching-copilot` (contexte temps réel) | HIGH |
| S2-05 | Brancher PCE ContextMemory → teacher-memory-engine (DEC-013) | HIGH |
| S2-06 | Route `/api/spie/context` — GET PedagogicalContext pour une classe | MEDIUM |
| S2-07 | Route `/api/spie/strategy` — GET/POST PedagogicalStrategy | MEDIUM |
| S2-08 | Route `/api/spie/simulate` — POST simulation de faisabilité | MEDIUM |

### Résultat attendu
Toute génération de leçon passe automatiquement par PCE. La route `/api/ia/regenerer-plan-annuel` appelle PSE en gate.

---

## Sprint 3 — Génération du plan annuel (3–4 semaines)

**Objectif** : L'enseignant peut générer un plan annuel complet depuis l'interface.

### Tâches

| # | Tâche | Priorité |
|---|-------|---------|
| S3-01 | Page `/dashboard/classes/{id}/plan-annuel` — création/visualisation | CRITIQUE |
| S3-02 | Formulaire : dates année scolaire, jours de classe, heures/semaine | CRITIQUE |
| S3-03 | Appel CIE → import curriculum (si pas encore importé) | CRITIQUE |
| S3-04 | Visualisation AYDTE : timeline des séquences sur l'année | HIGH |
| S3-05 | Affichage SimulationReport PPS avec statut et risques | HIGH |
| S3-06 | Affichage PedagogicalStrategy avec arbre de décision | HIGH |
| S3-07 | Comparaison A/B/C avec recommandation enseignant | HIGH |
| S3-08 | Bouton "Générer le plan" → pipeline complet SPIE → Claude | CRITIQUE |
| S3-09 | Affichage du ProgrammeAnnuel généré (Vue calendrier + liste) | HIGH |
| S3-10 | Export du plan annuel (PDF/DOCX) | MEDIUM |

### Résultat attendu
En 5 clics, un enseignant a un plan annuel pédagogiquement cohérent, validé par 5 moteurs SPIE, généré par Claude.

---

## Sprint 4 — Génération des séquences (3–4 semaines)

**Objectif** : Générer des séquences d'apprentissage détaillées à partir du plan annuel.

### Tâches

| # | Tâche | Priorité |
|---|-------|---------|
| S4-01 | Détail d'une séquence depuis le ProgrammeAnnuel | CRITIQUE |
| S4-02 | Génération IA d'une séquence (objectifs, ressources, étapes) | CRITIQUE |
| S4-03 | Association séquence ↔ leçons planifiées | CRITIQUE |
| S4-04 | Drag-and-drop pour réorganiser les séquences | HIGH |
| S4-05 | Impact AYDTE lors du déplacement d'une séquence | HIGH |
| S4-06 | Recalcul PPS après modification | MEDIUM |
| S4-07 | Export séquence en DOCX | MEDIUM |

---

## Sprint 5 — Génération des leçons et activités (3–4 semaines)

**Objectif** : Génération de leçons individuelles complètes enrichies par le SPIE.

### Tâches

| # | Tâche | Priorité |
|---|-------|---------|
| S5-01 | Intégrer PedagogicalStrategy dans build-system-prompt.ts (via contexte) | CRITIQUE |
| S5-02 | Intégrer AcademicClock (PTE) dans le contexte de génération | HIGH |
| S5-03 | Génération d'activités pédagogiques (5 types) | CRITIQUE |
| S5-04 | Génération d'évaluations (formatives et sommatives) | HIGH |
| S5-05 | Mode différenciation : générer variantes selon PSE.differenciationType | HIGH |
| S5-06 | Lien leçon → ressources suggérées (bibliothèque) | MEDIUM |
| S5-07 | Présentation mode (plein écran) améliorée | MEDIUM |

---

## Sprint 6 — Enseignement, suivi et amélioration (2–3 semaines)

**Objectif** : Boucler la boucle : enseignement → suivi → amélioration.

### Tâches

| # | Tâche | Priorité |
|---|-------|---------|
| S6-01 | Intégrer PTE dans la salle de classe (afficher retard/avance) | CRITIQUE |
| S6-02 | Actions enseignant sur TimeRecommendation (appliquer/rejeter) | HIGH |
| S6-03 | Dashboard analytics : coveragePercent, pacingScore, AcademicClock | HIGH |
| S6-04 | Insights actionnables à partir des données SPIE | HIGH |
| S6-05 | Recalcul du plan annuel après événements (arrêts, absence, maladie) | HIGH |
| S6-06 | Export rapport de fin d'année (SPIE coverage report) | MEDIUM |
| S6-07 | Partage de plan annuel entre enseignants (même école) | LOW |

---

## Dépendances entre sprints

```
Sprint 1 (Persistance) → prérequis de tous les autres
     │
     └─ Sprint 2 (APIs) → prérequis de Sprint 3, 5, 6
           │
           └─ Sprint 3 (Plan annuel) → prérequis de Sprint 4
                 │
                 └─ Sprint 4 (Séquences) → prérequis de Sprint 5
                       │
                       └─ Sprint 5 (Leçons) → Sprint 6 parallélisable
                             │
                             └─ Sprint 6 (Suivi) → clôture V1
```

---

## Critères de succès V1

| Critère | Mesure |
|---------|--------|
| Génération plan annuel | < 60 secondes end-to-end |
| Couverture curriculum | ≥ 85% des outcomes placés |
| Zéro TS errors | `npx tsc --noEmit` = 0 errors |
| Zéro modifications SPIE | Aucune couche SPIE ajoutée dans les sprints 1–6 |
| Aucune modification `build-system-prompt.ts` | DEC-005 respecté |
| Tests SPIE verts | Tous les tests existants passent |
| RLS actif | Toutes les nouvelles tables ont RLS |
