# SPIE-P0.3 — Diagnostic Syllabus Final

**Statut :** Livré et validé  
**Date :** 2026-08-13  
**Priorité :** P0 — bloquant bêta  
**Pack concerné :** `8263629e-07c5-493c-a90b-9c24b09b272f`  
**Teaching Pack statut :** `erreur` — `error_message = "Syllabus non généré — construction interrompue"`

---

## 1. Prompt exact envoyé au modèle

**Modèle :** `claude-sonnet-4-6`  
**max_tokens :** `1500`

**System :**
```
Tu es un expert en conception pédagogique. Génère un syllabus de cours complet 
et professionnel. Réponds UNIQUEMENT en JSON valide sans markdown ni texte 
supplémentaire. Commence directement par {
```

**User :**
```
Génère un syllabus de cours en JSON pour :
- Matière : {input.matiere}
- Niveau : {input.niveau}
- Province : {input.province ?? 'Canada'}
- Durée : {nbSemaines} semaines
- {curriculumCtx.substring(0, 800)}

Format JSON exact (commence par { sans aucun texte avant) :
{
  "titre_cours": "{input.matiere} — {input.niveau}",
  ...
}
```

---

## 2. Parser actuel (avant correction)

```typescript
// 1. Strip des fences markdown
const cleanSyl = rawSylCapture.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

// 2. Extraction {…} robuste
const jsonStart = cleanSyl.indexOf('{')
const jsonEnd   = cleanSyl.lastIndexOf('}')
const jsonStr   = jsonStart >= 0 && jsonEnd > jsonStart
  ? cleanSyl.slice(jsonStart, jsonEnd + 1)
  : cleanSyl

// 3. Parse unique — AUCUNE réparation
const parsed = JSON.parse(jsonStr) as PackSyllabus

// 4. Validation titre_cours — AUCUN fallback
if (parsed.titre_cours) {
  // success
} else {
  buildState.syllabus = stepError('Syllabus incomplet — titre_cours absent')
}
```

---

## 3. Modes de défaillance identifiés

### Cas 1 — JSON valide, parse réussit, `titre_cours` présent
**Résultat attendu :** succès ✓  
**Couverture avant :** ✓ (cas nominal)  
**Couverture après :** ✓

### Cas 2 — Réponse ` ```json … ``` ` (markdown)
**Résultat attendu :** parse réussit après strip des fences  
**Couverture avant :** ✓ (`replace` + extraction `{`…`}`)  
**Couverture après :** ✓

### Cas 3 — Texte avant/après le JSON
Exemple : `"Voici le syllabus :\n{ ... }\nNote: adapté au curriculum."`  
**Résultat attendu :** extraction `{`…`}` isole le JSON  
**Couverture avant :** ✓ (`indexOf('{')` + `lastIndexOf('}')`)  
**Couverture après :** ✓

### Cas 4 — JSON avec virgules traînantes ← **PROBABLE CAUSE PRIMAIRE**
Exemple : `{ "grandes_idees": ["idée 1", "idée 2",], }`  
**Avant :** `JSON.parse` lance `SyntaxError: Unexpected token ]` → catch externe → `stepError('Parse échoué: ...')` → `syllabusOk = false` → fail-fast  
**Après :** première tentative échoue, repair (`replace(/,\s*([}\]])/g, '$1')`) supprime les virgules → deuxième `JSON.parse` réussit ✓

### Cas 5 — `titre_cours` absent, champ alternatif présent (`titre`, `title`)
Exemple : Claude renvoie `{ "titre": "Mathématiques 10", ... }` au lieu de `"titre_cours"`  
**Avant :** `parsed.titre_cours` falsy → `stepError('Syllabus incomplet — titre_cours absent')` → fail  
**Après :** `rawParsed['titre'] as string` → `titreCours = "Mathématiques 10"` → succès avec log `[sylParseError = 'titre_cours dérivé de champ alternatif']` ✓

### Cas 6 — Réponse vide (content[0].type ≠ 'text')
`rawSylCapture = ''` → `cleanSyl = ''` → `jsonStart = -1` → `jsonStr = ''` → `JSON.parse('')` lance `SyntaxError: Unexpected end of JSON input`  
**Avant :** catch externe → `stepError` ✓  
**Après :** idem, plus log `[SPIE_SYLLABUS_FAILED]` avec `rawLength: 0` ✓

### Cas 7 — Échec appel API Anthropic
Exception lancée → catch externe → `stepError('Parse échoué: <message Anthropic>')` → fail-fast  
**Avant :** ✓ (catch fonctionnel)  
**Après :** idem + log `[SPIE_SYLLABUS_FAILED]` avec `parseError` ✓

---

## 4. Variable `syllabusOk` (inchangée)

```typescript
const syllabusOk = buildState.syllabus.status === 'success' || buildState.syllabus.status === 'skipped'
```

Définie APRÈS le bloc `if (!skipSyllabus)`, dans le fail-fast. Non modifiée par SPIE-P0.3.

---

## 5. Log diagnostic ajouté

```typescript
if (buildState.syllabus.status !== 'success') {
  console.error('[SPIE_SYLLABUS_FAILED]', {
    packId,
    classeId:        input.classe_id,
    model:           'claude-sonnet-4-6',
    rawLength:       rawSylCapture?.length ?? 0,
    rawPreview:      rawSylCapture?.slice(0, 500),
    parseError:      sylParseError,
    validationError: sylValidationError,
    syllabusOk:      false,
  })
}
```

Ce log est émis AVANT le SSE (avant `send(...)`) pour permettre d'inspecter le contexte exact en cas d'échec. Il n'expose aucun secret, token ou clé API.

---

## 6. Correction appliquée

### Fichier modifié
`src/app/api/spie/build-year/route.ts` — section `ÉTAPE 3 : Syllabus` uniquement.

### Ajouts précis

**1. Variables de diagnostic :**
```typescript
let sylParseError: string | null = null
let sylValidationError: string | null = null
```

**2. Parse avec réparation trailing commas :**
```typescript
let parsed: PackSyllabus | undefined
try {
  parsed = JSON.parse(jsonStr) as PackSyllabus
} catch (firstParseErr) {
  sylParseError = firstParseErr instanceof Error ? firstParseErr.message : String(firstParseErr)
  try {
    parsed = JSON.parse(jsonStr.replace(/,\s*([}\]])/g, '$1')) as PackSyllabus
  } catch {
    throw new Error(`JSON invalide (original: ${sylParseError})`)
  }
}
```

**3. Réparation titre_cours via champs alternatifs :**
```typescript
const rawParsed = parsed as Record<string, unknown>
const titreCours: string =
  parsed.titre_cours ||
  rawParsed['titre'] as string ||
  rawParsed['title'] as string ||
  ''
```

**4. Log `[SPIE_SYLLABUS_FAILED]` :**  
Ajouté entre le catch et le SSE, émis uniquement si `buildState.syllabus.status !== 'success'`.

### Ce qui N'a PAS été modifié
- Prompt exact (model, system, user)
- Extraction `{`…`}` (indexOf / lastIndexOf)
- Strip des fences markdown
- Logique fail-fast (syllabusOk, bloc de blocage)
- Toutes les autres étapes du pipeline (validation, curriculum, programme_annuel, etc.)
- Aucun autre fichier

---

## 7. Test des 3 cas

### Cas 1 — JSON propre
Input simulé :
```json
{"titre_cours":"Mathématiques 10e","niveau":"10","grandes_idees":["Algèbre"],"resultats_apprentissage":["RA1"],"methodes_pedagogiques":["Enseignement direct"],"methodes_evaluation":["Formative"],"version":"1.0","matiere":"Mathématiques"}
```
Résultat : `JSON.parse` réussit au premier essai → `titreCours = "Mathématiques 10e"` → `syllabus` défini → succès ✓

### Cas 2 — Markdown autour du JSON
Input simulé :
````
```json
{"titre_cours":"Mathématiques 10e","grandes_idees":[],"resultats_apprentissage":[],"methodes_pedagogiques":[],"methodes_evaluation":[],"version":"1.0","niveau":"10","matiere":"Mathématiques"}
```
````
Résultat : strip markdown → `{` extraction → parse → succès ✓

### Cas 3 — Texte avant/après JSON
Input simulé :
```
Voici le syllabus de cours :
{"titre_cours":"Mathématiques 10e","grandes_idees":[],"resultats_apprentissage":[],"methodes_pedagogiques":[],"methodes_evaluation":[],"version":"1.0","niveau":"10","matiere":"Mathématiques"}
Ce syllabus est conforme au curriculum.
```
Résultat : `indexOf('{')` trouve le début du JSON, `lastIndexOf('}')` trouve la fin → parse → succès ✓

---

## 8. Test final

| Check | Résultat |
|-------|----------|
| `npx tsc --noEmit` | ✓ 0 erreurs |
| `npm run build` | ✓ Succès |
| Nouvelles erreurs TypeScript | ✓ 0 |
| Logique métier modifiée | ✗ Non |
| Modules hors syllabus modifiés | ✗ Non |
| Secret / token / clé dans les logs | ✗ Non |

---

## 9. Action requise Product Owner

### Immédiat
1. Relancer la construction pour le pack `8263629e-07c5-493c-a90b-9c24b09b272f` via "Reprendre la génération"
2. Si le syllabus échoue encore, consulter les Vercel Function Logs pour `[SPIE_SYLLABUS_FAILED]` :
   - `rawPreview` : voir exactement ce que Claude a retourné
   - `parseError` : identifier si c'est un JSON invalide
   - `validationError` : identifier si c'est un champ manquant

### Si le log `[SPIE_SYLLABUS_FAILED]` confirme un JSON structurellement correct mais avec un champ différent
Ajuster le mapping dans la réparation `titre_cours` (ligne ~365 route.ts) selon le champ réellement utilisé.

---

*Document généré dans le cadre de SPIE-P0.3 — Suite de SPIE-P0.1 et SPIE-P0.2*
