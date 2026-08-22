# Mon Année V4 — Curriculum Progress & Teaching Tracker

**Version :** 4.0  
**Date :** 2026-08-15  
**Statut :** Livré

---

## Problème résolu

Mon Année V3 permettait de voir le plan et le syllabus, mais ne répondait pas aux questions fondamentales du pilotage pédagogique :

- Qu'est-ce que le curriculum exige que j'enseigne ?
- Qu'est-ce que j'ai planifié ? Préparé ? **Réellement enseigné ?**
- Suis-je en retard, dans le rythme, ou en avance par rapport au calendrier scolaire ?
- Quelle est la prochaine action la plus urgente pour ma classe ?

---

## Solution V4

### Marquage explicite de l'enseignement

L'enseignant peut désormais marquer une leçon comme enseignée depuis le plan annuel :
- Bouton **+ Enseigner** sur chaque leçon dans la vue expandée
- **Modal de confirmation** avec date d'enseignement (défaut : aujourd'hui) et note optionnelle
- Le marquage est **toujours explicite** — aucun marquage automatique, jamais

Une leçon peut être désenseignée (annulation) : le modal s'adapte pour afficher l'historique et proposer l'annulation.

### Indicateur de rythme pédagogique

Un badge dans l'en-tête de Mon Année indique le rythme par rapport au calendrier scolaire :

| Statut | Condition | Couleur |
|--------|-----------|---------|
| En avance | Δ ≥ +8 % | Vert |
| Dans le rythme | -7 % ≤ Δ < +8 % | Bleu |
| À surveiller | -15 % ≤ Δ < -7 % | Ambré |
| En retard | Δ < -15 % | Rouge |

Δ = % leçons enseignées − % année scolaire écoulée

### Couverture curriculum enrichie (V4)

La matrice curriculum affiche désormais des données réelles pour la colonne **Enseigné** :
- ✓ vert : au moins une leçon couvrant ce RA a été marquée enseignée
- ✗ rouge : RA planifié, mais aucune leçon enseignée
- — : RA non encore planifié

La colonne **Évalué** reste "—" (pas de source de données en V4 — voir V5).

### Séquence en cours enrichie

La carte de séquence affiche désormais la liste des leçons avec leur statut individuel :
- Strikethrough + badge vert pour les leçons enseignées
- Badge violet pour les leçons préparées (plan détaillé)
- Badge gris pour les leçons à préparer

### Tâches prioritaires dynamiques (V4)

Les tâches prioritaires suivent un ordre déterministe :
1. **Enseigner** : leçon préparée (plan complet) dans la séquence en cours → action immédiate
2. **Préparer** : leçons sans plan dans la séquence en cours (max 3)
3. **Planifier** : compléter le syllabus si < 80 %

---

## Règles inviolables

- **Jamais de marquage automatique** : une leçon est enseignée uniquement si l'enseignant le confirme explicitement
- **Planifié ≠ Préparé ≠ Enseigné** : les trois statuts sont distincts et indépendants
- **Préparé ≠ Enseigné** : avoir un plan de leçon ne signifie pas que la leçon a été donnée
- **Évalué** est un statut futur — aucune inférence depuis les autres statuts

---

## Expérience utilisateur

### Marquer une leçon comme enseignée (flow principal)

1. Aller dans **Mon Année**
2. Dans **Votre plan de cours**, cliquer sur une séquence pour l'expand
3. Sur une leçon, cliquer **+ Enseigner**
4. Modal : vérifier/modifier la date, ajouter une note (optionnel)
5. Confirmer → badge "Enseignée ✓" affiché, compteur mis à jour
6. La carte de rythme en en-tête se recalcule automatiquement

### Annuler un enseignement

1. Sur une leçon déjà enseignée, cliquer **Annuler ✕**
2. Modal : confirmation de l'annulation + date actuelle affichée
3. Confirmer → statut revient à brouillon

---

## Architecture technique

### Choix : STATE (OPTION A)

Le statut d'enseignement est stocké dans `programme_annuel.contenu_json` JSONB, sur chaque `LeconProgramme` :

```typescript
{
  statut?: 'enseignee',
  date_enseignee?: '2026-10-14',     // ISO date
  note_enseignement?: string          // note optionnelle
}
```

**Avantages :** aucune migration requise, cohérence immédiate avec tous les composants existants (AnnualPlanOverview, deriveData, CurriculumCoverage), backward compat V1/V2.

**Limite :** un seul marquage par leçon — ne supporte pas l'historique multi-enseignements. Migration 041 (EVENTS) proposée pour V5.

### API

`PATCH /api/spie/mark-taught`  
Corps : `{ programmeAnnuelId, uniteNumero, leconNumero, statut, date_enseignee?, note_enseignement? }`  
Vérifie l'ownership complet (user → profil → classe → programme) avant toute écriture.

---

## Limites V4 (à documenter pour le PO)

- **Évalué** : aucune source de données. Un système d'évaluations avec dates sera requis (V5).
- **Multi-enseignements** : un RA enseigné dans L1, L3, et L8 est traité comme "enseigné" dès L1. L'historique détaillé requiert la migration 041 (EVENTS).
- **Cross-classe** : le suivi est strictement par classe — pas de métriques agrégées multi-classes.
- **Synchronisation hors ligne** : le marquage requiert une connexion réseau.
- **UpcomingAssessments** : toujours vide en V4 (aucune table d'évaluations planifiées).
