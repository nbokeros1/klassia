# Persistence Pipeline — SPIE-PERSISTENCE-01
## Pattern GENERATE → VALIDATE → PERSIST → VERIFY → EMIT SUCCESS

**Statut :** SPIE-PERSISTENCE-01 · Actif  
**Dernière mise à jour :** 2026-08-09  
**Fichier route :** `src/app/api/spie/build-year/route.ts`  
**Fichier utilitaires :** `src/lib/spie/build-pipeline.ts`

---

## Le problème résolu

Avant SPIE-PERSISTENCE-01, le pipeline `build-year` déclarait une étape
`SUCCESS` dès qu'une réponse IA revenait — sans vérifier que les données
avaient effectivement été écrites en base. Résultat : le Teaching Pack
atteignait le statut `pret` avec un `programme_annuel_id` null, un syllabus
vide, et des onglets affichant "aucun contenu".

---

## Règle fondamentale

> **Une étape n'est SUCCESS que si : DB verification = SUCCESS.**

Aucune étape ne peut émettre `statut: 'termine'` vers le client SSE si la
vérification DB a échoué ou si la donnée re-lue est vide/nulle.

---

## Pattern par étape

```
Pour chaque étape I du pipeline :

  1. GENERATE  — appel IA ou calcul
                 → résultat en mémoire

  2. VALIDATE  — validation minimale du résultat en mémoire
                 (ex: titre_cours non vide, unites.length > 0)
                 → si invalide : stepError(), SSE erreur, CONTINUE
                   (pipeline non bloqué sauf erreurs critiques)

  3. PERSIST   — INSERT / UPDATE / UPSERT dans Supabase
                 → si erreur DB : stepError(), SSE erreur, CONTINUE

  4. VERIFY    — re-lecture depuis Supabase (.select())
                 → si row null ou champ critique vide : stepError()
                 → si row valide : stepSuccess(objectId), SSE termine

  5. EMIT SUCCESS — SSE `statut: 'termine'` uniquement après VERIFY
```

---

## Flux détaillé des 8 étapes

```
ÉTAPE 1 — Pack (Validation + Upsert)
  G: — (pas de génération IA)
  V: classe_id + niveau + matière non vides
  P: teaching_packs UPSERT onConflict('classe_id')
  V: relire teaching_packs.id → si null : erreur critique, CLOSE
  ✓  buildState.pack = stepSuccess(packId)

ÉTAPE 2 — Curriculum (Programme annuel)
  G: claude-sonnet-4-6, 4000 tok, JSON programme
  V: unites.length > 0
  P: programme_annuel INSERT ou UPDATE (idempotent par teaching_pack_id)
  V: relire programme_annuel.contenu_json.unites
     → si null ou vide : stepError
  ✓  buildState.programme_annuel = stepSuccess(progId)

ÉTAPE 3 — Syllabus
  G: claude-sonnet-4-6, 1500 tok, JSON syllabus
  V: titre_cours non vide + resultats_apprentissage.length > 0
  P: inclus dans la mise à jour du programme_annuel (syllabus_json)
  V: vérification implicite via ÉTAPE 2
  ✓  buildState.syllabus = stepSuccess()
  ⚠ Si null : stepError + SSE erreur + CONTINUE (non bloquant)

ÉTAPE 4 — Programme annuel (persistance)
  (fait partie de l'ÉTAPE 2 — sauvegarde séquentielle)

ÉTAPE 5 — Plans de leçon (vérification depuis DB)
  G: — (plans dans contenu_json.unites[].lecons)
  V: comptage re-lu depuis programme_annuel.contenu_json en DB
  P: — (déjà persisté à l'étape 2)
  V: unites[0].lecons.length > 0
  ✓  buildState.plans_lecon = stepSuccess()

ÉTAPE 6 — Première leçon complète
  G: claude-sonnet-4-6, 3000 tok, Markdown leçon
  V: contenuLecon non vide
  P: fichiers_dossier INSERT (type_fichier = 'lecon_complete')
  V: relire fichiers_dossier.id + contenu_html
     → si null : stepError
  ✓  buildState.premiere_lecon = stepSuccess(leconId)
  ⚠ Conditionnel : entitlement.first_lesson_complete

ÉTAPE 7 — Quiz
  G: claude-sonnet-4-6, 1200 tok, Markdown quiz
  V: quizContenu non vide
  P: fichiers_dossier INSERT (type_fichier = 'quiz')
  V: relire fichiers_dossier.id
     → si null : stepError
  ✓  buildState.quiz = stepSuccess(quizId)
  ⚠ Conditionnel : entitlement.first_lesson_quiz

ÉTAPE 8 — Finalisation
  G: verifyTeachingPackCompleteness() — re-lit toute la DB
  V: completeness.complete détermine le statut final
  P: teaching_packs UPDATE (statut, contenu_json, error_message)
     studio_ia_memoire UPSERT (contexte PCE)
  V: implicite — completeness est déjà basée sur la DB réelle
  ✓  buildState.finalized = true
```

---

## Propagation des erreurs

Le pipeline ne s'interrompt pas sur toutes les erreurs — seules les erreurs
**critiques** closent le stream :

| Étape | Erreur critique (CLOSE) | Erreur non bloquante (CONTINUE) |
|-------|------------------------|--------------------------------|
| 1 Pack | packVerify.id null | — |
| 2 Curriculum | — | unites vides (fallback généré) |
| 3 Syllabus | — | syllabus null (continue sans syllabus) |
| 4 Programme | — | insert échoué (statut SSE erreur) |
| 5 Plans | — | count = 0 |
| 6 Leçon | — | insert échoué |
| 7 Quiz | — | insert échoué |
| 8 Final | — | (toujours exécuté) |

---

## Événements SSE émis

Chaque événement SSE suit le type `BuildYearEvent` :

```typescript
type BuildYearEvent = {
  step:                BuildYearStep
  statut:              'en_attente' | 'en_cours' | 'termine' | 'erreur' | 'ignore'
  message:             string         // visible dans l'UI
  detail?:             string
  teaching_pack_id?:   string
  programme_annuel_id?: string
  progress?:           number         // 0–100
}
```

La progression (`progress`) reflète l'avancement réel — elle n'avance pas
lors d'une étape en cours, seulement à la confirmation VERIFY.

---

---

## SPIE-DIAGNOSTIC-01 — Corrections critiques appliquées

Deux violations DB ont été découvertes et corrigées (2026-08-09) :

| Défaut | Table | Valeur invalide | Valeur correcte |
|--------|-------|----------------|-----------------|
| Colonne inexistante | `programme_annuel` | `genere_par_ia: true` | supprimé |
| Contrainte CHECK | `fichiers_dossier.statut` | `'prete'` | `'brouillon'` |

Ces corrections ont débloqué les étapes "Sauvegarde plan annuel", "Première leçon" et "Quiz".  
Voir [SPIE-DIAGNOSTIC-01_Report.md](SPIE-DIAGNOSTIC-01_Report.md) pour le diagnostic complet.

**Règle dérivée :** Avant tout futur INSERT dans `build-year`, lire `supabase/schema.sql`
et les migrations pour vérifier les colonnes et contraintes CHECK (DEC-065).

---

## Voir aussi

- [Build_Checkpoints.md](Build_Checkpoints.md) — BuildState et step results
- [Teaching_Pack_Completeness.md](Teaching_Pack_Completeness.md) — verifyTeachingPackCompleteness
- [Build_Recovery.md](Build_Recovery.md) — reprise et anti-doublon
- [Build_My_Year_Workflow.md](Build_My_Year_Workflow.md) — workflow utilisateur
- [SPIE-DIAGNOSTIC-01_Report.md](SPIE-DIAGNOSTIC-01_Report.md) — root causes et corrections P0
- [Build_Debugging_Guide.md](Build_Debugging_Guide.md) — procédure de débogage
- [Build_Trace_Model.md](Build_Trace_Model.md) — modèle de trace structurée
