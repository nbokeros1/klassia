# SPIE-PERSISTENCE-01 — Rapport officiel
## Build Pipeline Persistance — Verified Pedagogical Delivery

**Date :** 2026-08-09  
**Auteur :** ScorgIA Architecture  
**Statut :** ✅ VALIDÉ — BUILD EXIT 0

---

## Résumé exécutif

SPIE-PERSISTENCE-01 résout un bug P0 fondamental : le pipeline "Construire
mon année scolaire" déclarait le Teaching Pack complet (`pret`) sans que les
données soient vérifiablement présentes en base. Résultat : les onglets
Syllabus, Plan annuel, Séquences, Première leçon, et Quiz affichaient
"aucun contenu" même après un build réussi.

La correction introduit le pattern **GENERATE → VALIDATE → PERSIST → VERIFY**
et le mécanisme de **BuildState** persisté pour permettre la reprise exacte.

---

## Diagnostic initial (root cause)

| Symptôme | Cause racine |
|----------|-------------|
| Syllabus vide dans l'UI | `syllabus_json = {}` (truthy) stocké même quand génération nulle |
| Onglet Plan annuel vide | `programme_annuel` non sauvegardé → `programme_annuel_id = null` |
| "30 plans structurés ✓" mais onglet vide | Comptage in-memory, pas re-lecture DB |
| Pack marqué `pret` sans contenu | `statutFinal` basé sur `premiereLeconId` (en-mémoire), pas DB réelle |
| `etapes_completees` incluait 'syllabus' même null | Aucune validation du résultat réel |

---

## 28 missions — État de livraison

| # | Mission | Livré |
|---|---------|-------|
| 1 | Audit forensique : identifier toutes les sources d'erreur silencieuses | ✅ |
| 2 | Réécriture `build-year/route.ts` : pattern GENERATE→VERIFY | ✅ |
| 3 | Validation minimale pour chaque étape avant persist | ✅ |
| 4 | `verifyTeachingPackCompleteness()` dans build-pipeline.ts | ✅ |
| 5 | Syllabus : validation `titre_cours + resultats_apprentissage` avant persist | ✅ |
| 6 | Programme annuel : VERIFY re-lecture `contenu_json.unites` après write | ✅ |
| 7 | Plans de leçon : comptage re-lu depuis DB (pas in-memory) | ✅ |
| 8 | Première leçon : VERIFY re-lecture `contenu_html` après INSERT | ✅ |
| 9 | Quiz : VERIFY re-lecture après INSERT | ✅ |
| 10 | `etapes_completees` = uniquement les étapes `status === 'success'` | ✅ |
| 11 | `BuildState` type dans build-pipeline.ts | ✅ |
| 12 | BuildState persisté dans `teaching_packs.contenu_json.build_state` | ✅ |
| 13 | Anti-doublon : vérification `generation_en_cours` avant stream SSE | ✅ |
| 14 | Smart resume : `reprendre: true` → skip des étapes `status=success` | ✅ |
| 15 | Stale reference check : si objectId existe mais DB row supprimée → régénère | ✅ |
| 16 | SSE émis après VERIFY (pas après generate) — messages précis | ✅ |
| 17 | `statut = completeness.status` (pas `premiereLeconId ? 'pret' : ...`) | ✅ |
| 18 | Outil de vérification : `POST /api/spie/verify-pack` | ✅ |
| 19 | Founder diagnostic : table Teaching Pack dans `/founder/monitoring` | ✅ |
| 20 | CTA adaptatif Reprendre / Reconstruire dans `programme/page.tsx` | ✅ |
| 21 | EmptyState précis par onglet (syllabus, plan annuel, etc.) | ✅ |
| 22 | `programme_annuel_id` FK mis à jour dès l'étape 4 (pas seulement en fin) | ✅ |
| 23 | Leçon step : dossier introuvable → stepError (pas skip silencieux) | ✅ |
| 24 | `teaching_pack_id` inclus dans UPDATE programme_annuel (repair FK) | ✅ |
| 25 | `TeachingPackContenu.build_state` ajouté au type | ✅ |
| 26 | `BuildYearWizardInput.reprendre` ajouté au type | ✅ |
| 27 | `BuildMyYearWizard.reprendre` prop propagé au fetch | ✅ |
| 28 | Documentation : 6 nouveaux docs + 6 mises à jour existants | ✅ |

---

## Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/lib/spie/build-pipeline.ts` | BuildState, StepResult, verifyTeachingPackCompleteness |
| `src/app/api/spie/verify-pack/route.ts` | Endpoint completeness check |
| `docs/SPIE/Persistence_Pipeline.md` | Pattern GENERATE→VERIFY |
| `docs/SPIE/Build_Checkpoints.md` | BuildState structure |
| `docs/SPIE/Teaching_Pack_Completeness.md` | verifyTeachingPackCompleteness |
| `docs/SPIE/Build_Recovery.md` | Smart resume + anti-doublon |
| `docs/SPIE/Persistence_Test_Matrix.md` | Matrice de tests |
| `docs/SPIE/SPIE-PERSISTENCE-01_Report.md` | Ce rapport |

---

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/app/api/spie/build-year/route.ts` | Réécriture complète — pattern GENERATE→VERIFY |
| `src/lib/types/teaching-pack.ts` | `build_state` + `reprendre` ajoutés |
| `src/components/build-year/BuildMyYearWizard.tsx` | Prop `reprendre` + transmission |
| `src/app/dashboard/classes/[id]/programme/page.tsx` | CTA adaptatif, EmptyState précis |
| `src/app/founder/monitoring/page.tsx` | Teaching Pack diagnostic |
| `docs/SPIE/SPIE_Blueprint.md` | SPIE-PERSISTENCE-01 dans roadmap |
| `docs/SPIE/Pipeline.md` | Note PERSIST→VERIFY |
| `docs/SPIE/Teaching_Pack.md` | BuildState, verify-pack |
| `docs/SPIE/Persistence.md` | BuildState, verify-pack endpoint |
| `docs/SPIE/Decision_Log.md` | DEC-053 à DEC-060 |
| `docs/Workspace/Workspace_Data_Binding.md` | Reprise CTA binding |

---

## Vérification TypeScript + Build

```
npx tsc --noEmit   → 0 erreurs
npm run build      → EXIT 0
```

---

## Décisions architecture (voir Decision_Log.md)

| DEC | Décision |
|-----|---------|
| DEC-053 | Une étape est SUCCESS uniquement si DB verification = SUCCESS |
| DEC-054 | BuildState persisté dans contenu_json (pas de table séparée) |
| DEC-055 | Anti-doublon check avant ouverture du stream SSE (409 si en cours) |
| DEC-056 | Smart resume : skip étapes success, re-vérif objectId stale |
| DEC-057 | verifyTeachingPackCompleteness lit DB après toutes les étapes |
| DEC-058 | statut final = completeness.status (pas état en mémoire) |
| DEC-059 | etapes_completees = projection de build_state, status=success uniquement |
| DEC-060 | Erreurs non critiques → CONTINUE pipeline (pas CLOSE stream) |

---

## Contraintes respectées

- ✅ SPIE non modifié
- ✅ Migrations existantes non modifiées
- ✅ Pas de push Git effectué
- ✅ "Ne jamais afficher Powered by Claude" respecté
- ✅ "Ne jamais inventer un résultat d'apprentissage" respecté
- ✅ Aucune nouvelle table créée
- ✅ Aucun nouveau moteur SPIE ajouté
- ✅ Aucun nouveau forfait, province, marketplace ajouté

---

## Verdict

**SPIE-PERSISTENCE-01 : ✅ VALIDÉ**

Le Teaching Pack suit maintenant le pattern GENERATE → VALIDATE → PERSIST →
VERIFY → EMIT SUCCESS à chaque étape. Un pack ne peut jamais devenir `pret`
si les objets obligatoires ne sont pas vérifiablement présents en base.
La reprise exacte (smart resume) permet à l'enseignant de continuer un build
interrompu sans régénérer les étapes réussies.
