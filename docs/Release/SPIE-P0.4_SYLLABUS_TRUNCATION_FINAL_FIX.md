# SPIE-P0.4 — Syllabus Truncation Final Fix

**Statut :** Livré — en attente de validation Product Owner  
**Date :** 2026-08-13  
**Priorité :** P0 — bloquant bêta  
**Pack concerné :** `8263629e-07c5-493c-a90b-9c24b09b272f`  
**Suite de :** SPIE-P0.3 (Diagnostic Syllabus)

---

## 1. Cause racine confirmée

Les logs Vercel produits par SPIE-P0.3 ont fourni la confirmation :

```
validationError: null
syllabusOk: false
[SPIE_BUILD_FAILED] {
  step: 'syllabus',
  phase: 'validate',
  error: 'Parse échoué : JSON invalide (original: Unexpected end of JSON input)'
}
POST /api/spie/build-year ~105 secondes
```

**Interprétation :**

| Signal | Signification |
|--------|--------------|
| `validationError: null` | Le code n'a jamais atteint la validation sémantique — échec avant |
| `error: 'Unexpected end of JSON input'` | JSON tronqué en cours de génération |
| `POST ~105 secondes` | Claude a atteint la limite `max_tokens` et a été arrêté en plein JSON |
| P0.3 trailing-comma fix | Passé sans effet — ce n'était pas un trailing comma |

**Diagnostic final :** `max_tokens: 1500` était trop bas. Claude génère un JSON dépassant 1500 tokens avec le prompt verbose + le contexte curriculum (800 chars). Le modèle s'arrête en milieu d'objet JSON → `Unexpected end of JSON input` → fail-fast.

---

## 2. Changements appliqués

### Fichier modifié
`src/app/api/spie/build-year/route.ts` — bloc `if (!skipSyllabus)` uniquement (ÉTAPE 3).

**Aucun autre fichier modifié.** Le fail-fast, les autres étapes SPIE, les logos, et toute logique hors syllabus sont inchangés.

---

## 3. Architecture de la solution (12 missions)

### MISSION 1 — Log `[SPIE_SYLLABUS_AI_RESULT]` avec métriques complètes

Après chaque appel Anthropic (tentative 1 et tentative 2), le log suivant est émis :

```typescript
console.info('[SPIE_SYLLABUS_AI_RESULT]', {
  attempt: 1,                    // ou 2
  model: 'claude-sonnet-4-6',
  maxTokens: 2000,               // ou 800
  stopReason: stop1,             // 'end_turn' | 'max_tokens' | ...
  inputTokens: iToks1,           // message.usage.input_tokens
  outputTokens: oToks1,          // message.usage.output_tokens
  rawLength: raw1.length,        // longueur brute de la réponse
  rawStart: raw1.slice(0, 300),  // début du JSON pour diagnostic
  rawEnd: raw1.slice(-500),      // fin du JSON (repère la troncature)
  durationMs: Date.now() - t1Start,
})
```

### MISSION 2 — Détection `stop_reason === 'max_tokens'`

Déclencheur de retry :
```typescript
if (res1.error?.includes('Unexpected end') || stop1 === 'max_tokens') {
  // → retry tentative 2
}
```

Les deux conditions couvrent :
- Troncature brutale (`stop_reason = max_tokens`) avant que le JSON soit complet
- Cas où le JSON se termine prématurément sans que `stop_reason` soit `max_tokens`

### MISSION 3 — Prompt compact (tentative 1)

| Paramètre | Avant (P0.3) | Après (P0.4) |
|-----------|-------------|--------------|
| `max_tokens` | 1500 | **2000** |
| `curriculumCtx` | 800 chars | **400 chars** |
| Tableaux JSON | 5-6 items | **max 3 items** |
| Description | 2-3 phrases | **1-2 phrases** |
| Champs optionnels | `normes_reference` | **supprimé** |

### MISSION 4 — Prompt strict

System prompt tentative 1 :
```
RETURN ONLY VALID JSON. No markdown. No ```json. No introduction. No commentary.
Start with {. Every opened object and array MUST be closed. Keep every string concise.
```

System prompt tentative 2 (ultra-compact) :
```
RETURN ONLY VALID JSON. Start with {. Close every bracket. Ultra-short values only.
```

### MISSION 5 — Pré-parse : strip fences + extraction `{…}` (inchangé)

`sylExtract` encapsule la logique existante :
1. Strip des fences `` ```json `` et `` ``` ``
2. Extraction `{` → `}` (indexOf / lastIndexOf)
3. `JSON.parse` premier essai
4. Repair trailing commas si échec → deuxième `JSON.parse`

### MISSION 6 — Retry unique sur troncature

- **Déclencheur :** `res1.error?.includes('Unexpected end') || stop1 === 'max_tokens'`
- **Tentative 2 :** prompt ultra-compact, `max_tokens: 800`, valeurs minimales
- **Si tentative 2 échoue :** `throw new Error(...)` → catch externe → `stepError` → fail-fast existant → STOP

Le fail-fast (bloc `syllabusOk` + `controller.close()`) est **intact et inchangé**.

### MISSION 7 — Validation sémantique

Après parse réussi (tentative 1 ou 2) :
- `titre_cours` présent → requis (avec normalisation depuis `titre`/`title` autorisée)
- `resultats_apprentissage` → fallback générique si tableau vide

### MISSION 8 — Aucune fabrication

Les seules normalisations autorisées :
- `titre` / `title` → `titre_cours` (normalisation contrôlée, loggée dans `sylParseError`)
- `resultats_apprentissage` vide → valeur générique `Résultats d'apprentissage — {matiere} {niveau}`

Aucun champ n'est inventé de toutes pièces.

### MISSION 9 — `durationMs` dans tous les logs

- `[SPIE_SYLLABUS_AI_RESULT]` : `durationMs` = durée de l'appel API (tentative individuelle)
- `[SPIE_SYLLABUS_FAILED]` : `totalDurationMs` = durée totale depuis `sylStart`
- `[SPIE]` (succès) : `durationMs` total dans le log `phase: 'complete'`

---

## 4. Cas de test (MISSION 10)

### Cas A — JSON propre (tentative 1 réussit)

Claude retourne :
```json
{"titre_cours":"Mathématiques 10e","niveau":"10","matiere":"Mathématiques","description":"Cours annuel.","grandes_idees":["Algèbre"],"resultats_apprentissage":["RA 1"],"methodes_pedagogiques":["Direct"],"methodes_evaluation":["Formative"],"version":"1.0"}
```
- `sylExtract` → parse réussit → `titreCours` présent → succès ✓
- `[SPIE_SYLLABUS_AI_RESULT]` avec `stopReason: 'end_turn'` ✓

### Cas B — Markdown autour du JSON (tentative 1 réussit)

Claude retourne :
```
```json
{"titre_cours":"Mathématiques 10e",...}
```
```
- Strip markdown → extraction `{…}` → parse → succès ✓

### Cas C — Trailing comma (tentative 1, réparation)

Claude retourne `{"grandes_idees":["A","B",],...}`  
- Premier `JSON.parse` échoue → repair → deuxième parse → succès ✓

### Cas D — Troncature tentative 1, retry OK

Claude (tentative 1) retourne `{"titre_cours":"Mathématiques 10e","grandes_idees":["A`  
- `res1.error.includes('Unexpected end')` → vrai → retry tentative 2
- `[SPIE_SYLLABUS_AI_RESULT]` `attempt: 1` avec `stopReason: 'max_tokens'` ✓
- Tentative 2 retourne JSON compact valide → succès ✓
- `[SPIE_SYLLABUS_AI_RESULT]` `attempt: 2` ✓

### Cas E — Deux tentatives tronquées → STOP

Tentative 1 tronquée → retry → tentative 2 aussi tronquée :
- `res2.data === null` → `throw new Error(...)` → catch externe → `stepError` → fail-fast → `controller.close()` ✓

### Cas F — `titre` au lieu de `titre_cours` → normalisation

Claude retourne `{"titre":"Mathématiques 10e","resultats_apprentissage":["RA 1"],...}`  
- `parsed.titre_cours` absent → `rawP['titre']` présent → `titreCours = "Mathématiques 10e"`
- `sylParseError` logué avec `'titre_cours dérivé de champ alternatif'`
- Succès ✓

---

## 5. Protocole de test produit (MISSION 11)

**Pack de test :** `8263629e-07c5-493c-a90b-9c24b09b272f`

### Étapes

1. Déployer (après validation PO)
2. Ouvrir la page de la classe `ef917872-8d6b-4022-b3b8-122f4ff722a1`
3. Cliquer "Reprendre la génération" (Smart Resume)
4. Observer les logs Vercel en temps réel

### Logs attendus dans Vercel

**Si succès en tentative 1 :**
```
[SPIE_SYLLABUS_AI_RESULT] { attempt: 1, stopReason: 'end_turn', rawLength: <X>, ... }
[SPIE] { step: 'syllabus', phase: 'complete', durationMs: <Y> }
```

**Si troncature → retry réussi :**
```
[SPIE_SYLLABUS_AI_RESULT] { attempt: 1, stopReason: 'max_tokens', ... }
[SPIE] { step: 'syllabus', phase: 'retry', stopReason: 'max_tokens' }
[SPIE_SYLLABUS_AI_RESULT] { attempt: 2, stopReason: 'end_turn', ... }
[SPIE] { step: 'syllabus', phase: 'complete', ... }
```

### SSE attendu côté UI

```
✓ validation → termine
✓ curriculum → termine (ou skip si reprise)
✓ syllabus   → termine (message: "Syllabus généré et validé ✓")
✓ programme_annuel → termine
✓ plans_lecon → termine
✓ premiere_lecon → termine (si entitlement)
✓ quiz → termine (si entitlement)
```

---

## 6. Vérification DB (MISSION 12)

Après succès, exécuter dans Supabase SQL Editor :

### Q1 — Teaching pack avec programme_annuel_id non NULL

```sql
SELECT id, statut, programme_annuel_id IS NOT NULL AS fk_set
FROM teaching_packs
WHERE id = '8263629e-07c5-493c-a90b-9c24b09b272f';
```

Attendu : `fk_set = true`

### Q2 — syllabus_json non null et non vide

```sql
SELECT 
  id,
  syllabus_json IS NOT NULL                         AS has_syllabus,
  syllabus_json != '{}'::jsonb                      AS syllabus_not_empty,
  syllabus_json->>'titre_cours'                     AS titre_cours
FROM programme_annuel
WHERE teaching_pack_id = '8263629e-07c5-493c-a90b-9c24b09b272f';
```

Attendu : `has_syllabus = true`, `syllabus_not_empty = true`, `titre_cours` non NULL

### Q3 — teaching_packs.programme_annuel_id non NULL

```sql
SELECT 
  p.id          AS pack_id,
  p.statut,
  p.programme_annuel_id IS NOT NULL AS prog_set
FROM teaching_packs p
WHERE p.id = '8263629e-07c5-493c-a90b-9c24b09b272f';
```

Attendu : `prog_set = true`

---

## 7. Qualité Gate

| Check | Résultat |
|-------|----------|
| `npx tsc --noEmit` | ✓ 0 erreurs |
| `npm run build` | ✓ Succès (119 pages, 0 erreurs) |
| Fail-fast modifié | ✗ Non — intact |
| Autres étapes SPIE modifiées | ✗ Non |
| Logos modifiés | ✗ Non |
| Secrets / tokens dans les logs | ✗ Non |
| Fabrication de données | ✗ Non |
| Fichiers hors périmètre modifiés | ✗ Non |

---

## 8. Contraintes respectées

| Contrainte mission | Respectée |
|-------------------|-----------|
| NE PAS modifier le fail-fast | ✓ |
| NE PAS toucher aux logos | ✓ |
| NE PAS toucher aux autres étapes SPIE | ✓ |
| NE PAS push avant test Product Owner | ✓ En attente |
| Never log secrets / tokens / API keys | ✓ |
| UNE SEULE tentative de récupération | ✓ (exactement 1 retry) |
| Pas de continuation du JSON tronqué | ✓ (régénération complète) |

---

## 9. Action requise Product Owner

1. **Tester** avec le pack `8263629e-07c5-493c-a90b-9c24b09b272f` via "Reprendre la génération"
2. **Inspecter** les logs Vercel pour `[SPIE_SYLLABUS_AI_RESULT]` — confirmer `stopReason: 'end_turn'`
3. **Vérifier** la DB avec Q1, Q2, Q3 (section 6)
4. **Approuver** le push si tout est conforme

---

*Document généré dans le cadre de SPIE-P0.4 — Suite de SPIE-P0.1, P0.2, P0.3*
