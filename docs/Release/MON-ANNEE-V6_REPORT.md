# MON-ANNEE-V6 — Release Report

**Date:** 2026-08-17  
**Commit:** feat(mon-annee): add multi-class school year workspace  
**Qualité:** tsc=0, build=succès

---

## Livré

### Hub multi-classes (`/dashboard/mon-annee`)
- Chargement batch : packs + programmes + events en une seule Promise.all avec IN clause
- Cartes par classe : matière, niveau, pack statut, progression %, leçons enseignées/total, prochaine leçon
- Navigation vers `/dashboard/mon-annee/[classeId]` au clic
- État vide professionnel si aucune classe

### Workspace par classe (`/dashboard/mon-annee/[classeId]`)
- Shell isolé (pas de sidebar) avec header sticky
- Class selector dropdown pour changer de classe (navigation URL, pas de stale state)
- Mini-nav 8 onglets : Aperçu migré, 7 autres → liens vers routes existantes (pas de régression)

### Cockpit Aperçu
- **YearProgressHero** : 3 barres (enseigné / préparé / calendrier), indicateur de rythme (EN_AVANCE / DANS_LE_RYTHME / À_SURVEILLER / EN_RETARD), métriques clés
- **NowSection** : Séquence en cours + Prochaine leçon avec actions (Ouvrir plan, Préparer, Marquer enseignée)
- **AnnualFlightPlan** : Roadmap expandable séquences → leçons, bouton mark-taught inline, liens vers plans de leçon
- **CurriculumProgressSummary** : Couverture RA (V2 uniquement), RA non planifiés en alerte
- **QuickActions** : max 4 actions dérivées de `getNextTeachingAction()`

### Mark-taught V5 intégré
- Accessible depuis NowSection (prochaine leçon) et AnnualFlightPlan (chaque leçon)
- MarkTaughtModal V5 inchangé — POST teaching_events append-only
- Optimistic override local (localOverrides) avant refresh serveur

### Sidebar
- "Mon Année" ouvre dans un nouvel onglet (`target="_blank"`)

---

## Non modifié (garantie backward compat)
- Dashboard principal
- Routes syllabus / plan_annuel / évaluations / curriculum
- Quota / forfait / paiements
- V1–V5 flow complet

---

## Scénarios validés (audit spec section 23)
1. Hub charge avec 0 classes → état vide correct
2. Hub charge avec N classes → N cartes avec vraies données
3. Workspace sans pack → NoPack state
4. Workspace avec pack V1 (pas curriculum_outcomes) → CurriculumProgressSummary affiche message V1
5. Workspace avec pack V2 → couverture RA affichée
6. Mark-taught depuis NowSection → optimistic update + refresh
7. Mark-taught depuis AnnualFlightPlan → idem
8. Class selector → navigation vers autre classeId (URL change, pas de stale state)
9. Mini-nav tabs non migrés → lien externe vers route existante
10. tsc=0, build=succès
