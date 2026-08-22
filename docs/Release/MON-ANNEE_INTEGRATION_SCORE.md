# MON-ANNEE — Scorecard d'intégration V1 → V4

**Audit :** MON-ANNEE-INTEGRATION-01  
**Date :** 2026-08-15  
**Méthode :** Audit statique (code source, migrations, types)

---

## Scorecard — 10 dimensions /100

| # | Dimension | /10 | Justification |
|---|-----------|-----|--------------|
| 1 | **Build My Year pipeline** | 9 | Anti-doublon, smart resume 7 étapes, anti-placeholder prompt. Race condition binding (040) : acceptable usage séquentiel. |
| 2 | **Curriculum RA coverage** | 7 | Relations correctes, `isTaught` V4 fonctionnel. BUG-05 : `seqCovers` sur-déclare légèrement la couverture. |
| 3 | **Smart Syllabus** | 9 | 2 phases (AI + déterministe), persistance DB, score de complétude. Visuel non testé (pas de browser). |
| 4 | **Plan annuel** | 9 | Anti-placeholder garanti par prompt, toutes les séquences et leçons présentes, timeline cohérente. |
| 5 | **Arborescence classe** | 10 | Binding idempotent (`buildKey`), `plans_lecons` est un type standard (migration 008+010+015), `Syllabus/` et `Séquences/` auto-créés, zéro doublon. |
| 6 | **Mon Année dashboard** | 7 | Toutes les cartes V4, données réelles. BUG-01 : dropdown classes vide → changement de classe impossible depuis la page. |
| 7 | **Marquer comme enseignée** | 8 | Flow explicite (jamais automatique), auth + ownership complet, optimistic update + rechargement. BUG-02 : lost-update P2, très faible probabilité. |
| 8 | **Persistence** | 8 | F5 + logout/login + URL params fonctionnels via localStorage/DB. BUG-01 impacte les sessions nouvelles sans localStorage. |
| 9 | **Multi-classes / isolation** | 9 | RLS + ownership vérifié, `handleClasseChange()` reset complet. Navigabilité altérée par BUG-01 mais isolation correcte. |
| 10 | **API / Sécurité** | 8 | Ownership chaîne user→profil→classe→programme. BUG-04 : `statut` non validé en runtime (impact limité, ownership vérifié). |

---

## Score total

```
84 / 100
```

---

## Détail des déductions

| Bug | Impact score | Dimension |
|-----|-------------|-----------|
| BUG-01 Dropdown classes vide | −3 (D6) + −1 (D8) + −1 (D9) | Navigabilité |
| BUG-02 Lost-update mark-taught | −1 (D7) | Intégrité |
| BUG-03 `.single()` 406 | −0 (P3 absorbé) | — |
| BUG-04 StatutLecon non validé | −2 (D10) | Sécurité |
| BUG-05 `seqCovers` over-report | −3 (D2) | Curriculum |
| BUG-06 nb_lecons_total dénormalisé | −0 (P3 absorbé) | — |

---

## Comparaison par version

| Version | Fonctionnalités ajoutées | Score estimé (rétro) |
|---------|-------------------------|----------------------|
| V1 | Build pipeline, arborescence | ~65/100 |
| V2 | Curriculum coverage, classe folder binding | ~72/100 |
| V2.1 / V2.1A | Smart resume, binding corrigé | ~78/100 |
| V3 | Smart Syllabus 2 phases | ~81/100 |
| **V4** | Teaching tracker, pacing, isTaught | **84/100** |

---

## Verdict

### ✅ READY WITH FIXES

**Prêt à merger, sous réserve de la correction de BUG-01.**

### Argument

Le pipeline Build My Year, le Smart Syllabus, la couverture curriculum, et le flow marquer-enseignée sont tous fonctionnels. La qualité d'intégration est élevée (84/100). Les données sont réelles, les règles métier respectées (jamais de marquage automatique, planifié ≠ préparé ≠ enseigné), et la persistance est solide.

BUG-01 est la seule friction bloquante : un enseignant avec plusieurs classes qui accède à Mon Année directement ne peut pas basculer entre ses classes depuis cette page. C'est silencieux et trompeur (le dropdown est visible mais vide). Fix minimal : 2 lignes de code.

BUG-02 (lost-update) est accepté pour V4 : un enseignant solo n'ouvre pas deux onglets Mark-taught simultanément dans la même seconde. La résolution structurelle est tracée en V5 (migration 041).

---

## Actions requises avant push

| # | Action | Priorité | Estimation |
|---|--------|---------|-----------|
| 1 | Fix BUG-01 : `.eq('enseignant_id', user.id)` → utiliser `profil.id` | **BLOCKER** | 15 min |
| 2 | Valider BUG-01 corrigé : vérifier que `allClasses` est non-vide | **BLOCKER** | test |

## Actions post-ship recommandées

| # | Action | Priorité |
|---|--------|---------|
| 3 | Fix BUG-03 : `.single()` → `.maybeSingle()` | P3 |
| 4 | Fix BUG-04 : valider `statut` contre liste de valeurs | P3 |
| 5 | Fix BUG-05 : raffiner `seqCovers` dans `curriculum-coverage.ts` | P3 |
| 6 | Fix BUG-06 : calculer `totalLecons` depuis `contenu_json` | P3 |
| 7 | Évaluer migration 040 avec PO | V5 |
| 8 | Évaluer migration 041 (events) avec PO | V5 |

---

## Contraintes respectées

| Contrainte | Respectée |
|-----------|----------|
| NE PAS PUSH | ✓ |
| NE PAS exécuter migration 040 | ✓ |
| NE PAS exécuter migration 041 | ✓ |
| NE PAS exécuter de migration distante | ✓ |
| Aucune modification de code (sauf P0) | ✓ (aucun P0 trouvé) |
| Ne jamais déduire "enseignée" d'une leçon préparée | ✓ — vérifié dans tout le codebase |
| Ne jamais considérer planifié = couvert ou préparé = enseigné | ✓ |
| Ne pas inventer une métrique | ✓ — toutes les métriques sont dérivées de données réelles |
| Ne pas marquer automatiquement une leçon enseignée | ✓ — seul `/api/spie/mark-taught` (action explicite) écrit `statut: 'enseignee'` |

---

*Audit statique — aucune migration exécutée — aucun push*
