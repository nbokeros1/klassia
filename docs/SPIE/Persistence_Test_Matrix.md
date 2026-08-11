# Persistence Test Matrix — SPIE-PERSISTENCE-01
## Cas de test pour le pipeline GENERATE → VALIDATE → PERSIST → VERIFY

**Statut :** SPIE-PERSISTENCE-01 · Actif  
**Dernière mise à jour :** 2026-08-09

---

## Matrice des cas nominaux

| ID | Étape | Entrée | Attendu (statut) | Attendu (DB) | Attendu (SSE) |
|----|-------|--------|-----------------|--------------|---------------|
| T-01 | Pack upsert | classe_id valide | pack.status = success | teaching_packs row exists | validation: termine |
| T-02 | Curriculum | JSON valide 5 unités | curriculum.status = success | programme_annuel.contenu_json.unites.length = 5 | curriculum: termine |
| T-03 | Syllabus | JSON avec titre_cours + 3 résultats | syllabus.status = success | programme_annuel.syllabus_json.titre_cours non vide | syllabus: termine |
| T-04 | Programme | INSERT réussi | programme_annuel.status = success | programme_annuel.id = progId | programme_annuel: termine |
| T-05 | Plans | unites[0].lecons.length > 0 | plans_lecon.status = success | re-lecture DB > 0 | plans_lecon: termine |
| T-06 | Leçon | contenuLecon non vide | premiere_lecon.status = success | fichiers_dossier row type_fichier='lecon_complete' | premiere_lecon: termine |
| T-07 | Quiz | quizContenu non vide | quiz.status = success | fichiers_dossier row type_fichier='quiz' | quiz: termine |
| T-08 | Finalisation | tous success | complete = true | statut = 'pret' | termine: termine |

---

## Cas d'erreur — persistance

| ID | Scénario | Attendu (buildState) | Attendu (statut pack) | SSE émis |
|----|----------|---------------------|----------------------|----------|
| E-01 | Pack upsert — DB indisponible | pack.status = error | — (stream closed) | erreur: erreur (CLOSE) |
| E-02 | Programme insert — contrainte FK | programme_annuel.status = error | partiellement_genere | programme_annuel: erreur |
| E-03 | VERIFY programme — row vide | programme_annuel.status = error | partiellement_genere | programme_annuel: erreur |
| E-04 | Syllabus — titre_cours manquant | syllabus.status = error | partiellement_genere | syllabus: erreur |
| E-05 | Leçon insert — dossier introuvable | premiere_lecon.status = error | partiellement_genere | premiere_lecon: erreur |
| E-06 | VERIFY leçon — row null | premiere_lecon.status = error | partiellement_genere | premiere_lecon: erreur |
| E-07 | Quiz insert — dossier introuvable | quiz.status = error | partiellement_genere | quiz: erreur |

---

## Cas d'erreur — génération IA

| ID | Scénario | Attendu (buildState) | SSE émis |
|----|----------|---------------------|----------|
| G-01 | Curriculum JSON malformé | curriculum.status = success (fallback) | curriculum: termine (avec fallback) |
| G-02 | Curriculum unites vides | curriculum.status = success (fallback 6 unités) | curriculum: termine |
| G-03 | Syllabus JSON malformé | syllabus.status = error | syllabus: erreur (non bloquant) |
| G-04 | Leçon contenu vide | premiere_lecon.status = error | premiere_lecon: erreur |
| G-05 | Quiz contenu vide | quiz.status = error | quiz: erreur |
| G-06 | Timeout Anthropic | error propagé | étape: erreur |

---

## Cas de reprise (reprendre: true)

| ID | État initial BuildState | Comportement attendu | Appels IA |
|----|------------------------|---------------------|-----------|
| R-01 | curriculum=success, programme=success, reste=pending | Skip étapes 1-4, génère leçon + quiz | 2 appels |
| R-02 | tout=success, finalized=false | Skip tout, re-vérifie DB, finalise | 0 appels |
| R-03 | premiere_lecon=success mais fichier supprimé | Stale ref détecté → régénère leçon | 1 appel |
| R-04 | syllabus=success, programme=pending | Skip syllabus, regénère programme + reste | 3 appels |
| R-05 | reprendre=false | Reset complet, ignore BuildState existant | tous appels |

---

## Cas anti-doublon

| ID | Scénario | Code HTTP | Message |
|----|----------|-----------|---------|
| D-01 | Pack avec statut=generation_en_cours | 409 | "La construction de cette année est déjà en cours." |
| D-02 | Pack avec statut=pret | 200 (stream) | — (pipeline démarre) |
| D-03 | Pas de pack existant | 200 (stream) | — (pipeline démarre) |

---

## Cas verifyTeachingPackCompleteness

| ID | État DB | complete | status | missingElements |
|----|---------|----------|--------|----------------|
| V-01 | pack + prog + syllabus + leçon + quiz | true | pret | [] |
| V-02 | pack + prog + syllabus, pas de leçon (entitlement activé) | false | partiellement_genere | ['premiere_lecon'] |
| V-03 | pack sans programme_annuel_id | false | erreur | ['programme_annuel'] |
| V-04 | pack + prog, syllabus.titre_cours vide | false | partiellement_genere | ['syllabus'] |
| V-05 | pack introuvable | false | erreur | ['pack'] |
| V-06 | entitlement.first_lesson_complete = false, pas de leçon | true | pret | [] |

---

## Vérification de cohérence BuildState ↔ DB

Ces assertions doivent être vraies après chaque build réussi :

```
buildState.pack.status === 'success'
  ↔ teaching_packs WHERE id = buildState.pack.objectId EXISTS

buildState.programme_annuel.status === 'success'
  ↔ programme_annuel WHERE id = buildState.programme_annuel.objectId EXISTS
  ↔ programme_annuel.contenu_json.unites.length > 0

buildState.premiere_lecon.status === 'success'
  ↔ fichiers_dossier WHERE id = buildState.premiere_lecon.objectId
    AND type_fichier = 'lecon_complete' EXISTS

buildState.quiz.status === 'success'
  ↔ fichiers_dossier WHERE id = buildState.quiz.objectId
    AND type_fichier = 'quiz' EXISTS

completeness.complete = true
  ↔ teaching_packs.statut = 'pret'
```

---

## Voir aussi

- [Persistence_Pipeline.md](Persistence_Pipeline.md) — implémentation du pipeline
- [Build_Checkpoints.md](Build_Checkpoints.md) — structure BuildState
- [Teaching_Pack_Completeness.md](Teaching_Pack_Completeness.md) — verifyTeachingPackCompleteness
- [Build_Recovery.md](Build_Recovery.md) — reprendre
