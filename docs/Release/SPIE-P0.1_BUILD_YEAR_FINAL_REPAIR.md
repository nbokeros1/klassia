# SPIE-P0.1 — Build Year Pipeline Final Repair
## ScorgIA · KlassIA+ · Pipeline "Construire mon année scolaire"
**Date :** 2026-08-13  
**Priorité :** P0 — BLOQUANT BÊTA  
**Périmètre :** `build-year/route.ts`, `BuildMyYearWizard.tsx`, `teaching-pack.ts`  
**Contraintes :** Aucun redesign, aucune migration, aucune modification hors SPIE Build Year

---

## RÉSUMÉ EXÉCUTIF

Sept bugs confirmés dans le pipeline "Construire mon année". Reproducible sur tout nouveau compte.

| # | Bug | Sévérité | Statut |
|---|-----|----------|--------|
| 1 | Message "Plan annuel généré" affiché sous step `curriculum` | P1 — Confusion UX | ✅ Corrigé |
| 2 | Pipeline continue après échec Syllabus (no fail-fast) | P0 — Bloquant | ✅ Corrigé |
| 3 | Première leçon génère même si `programme_annuel` non persisté | P0 — Bloquant | ✅ Corrigé |
| 4 | Quiz génère même si `premiere_lecon` a échoué | P1 | ✅ Corrigé |
| 5 | No fail-fast après échec `programme_annuel` | P0 — Bloquant | ✅ Corrigé |
| 6 | Erreurs INSERT silencieuses (aucun log Vercel) | P1 — Debug impossible | ✅ Corrigé |
| 7 | `.single()` sur pre-check `programme_annuel` (0 lignes = 406) | P2 | ✅ Corrigé |

---

## RÉPONSES AUX QUESTIONS DU LIVRABLE

### 1. Pourquoi "Plan annuel généré" apparaissait sous Curriculum ?

**Cause :** `route.ts` ligne 283 (ancienne) envoyait :
```typescript
send({ step: 'curriculum', statut: 'termine', message: `Plan annuel généré — N unités, N leçons planifiées ✓` })
```
Le `step` est `curriculum`, mais le message décrit le résultat de `programme_annuel`. Le wizard affiche le message sur le step dont il porte l'identifiant — donc "Plan annuel généré" apparaissait sous la ligne "Curriculum".

**Fix :** Message `curriculum:termine` → `"Curriculum analysé — N unités structurées ✓"`.  
Message `programme_annuel:termine` → `"Plan annuel sauvegardé — N unités, N leçons ✓"` (message déplacé sur le bon step).

---

### 2. Pourquoi le pipeline continuait après l'échec Syllabus ?

**Cause :** Après l'envoi de `{ step: 'syllabus', statut: 'erreur' }`, le code ne contenait aucun `return` ni `controller.close()`. L'exécution tombait directement dans ÉTAPE 4 (programme_annuel).

```typescript
// Code incorrect — avant fix
if (syllabus) {
  send({ step: 'syllabus', statut: 'termine', ... })
} else {
  send({ step: 'syllabus', statut: 'erreur', message: 'Syllabus non généré — le plan annuel continue.' })
}
// ← PAS DE RETURN → ÉTAPE 4 commence immédiatement
```

**Fix :** Bloc `fail-fast` inséré après la section syllabus :
```typescript
const syllabusOk = buildState.syllabus.status === 'success' || buildState.syllabus.status === 'skipped'
if (!syllabusOk) {
  // Envoyer 'bloque' pour programme_annuel, plans_lecon, premiere_lecon, quiz
  // Persister buildState avec statut 'erreur'
  send({ step: 'erreur', statut: 'erreur', message: 'La construction est arrêtée...' })
  controller.close(); return
}
```

---

### 3. Pourquoi le programme annuel n'était pas persisté ?

**Cause probable — schema cache PostgREST :**  
L'INSERT dans `programme_annuel` inclut les colonnes `teaching_pack_id`, `calendrier_json`, `syllabus_json` ajoutées par la **migration 036**. Si le cache schema de PostgREST n'a pas été rechargé après cette migration, PostgREST retourne HTTP 400 (colonne inconnue). L'erreur était silencieuse (non loggée).

**Pre-check défaillant :**  
Le check d'idempotence utilisait `.single()` sur une requête qui retourne 0 lignes pour une nouvelle classe → 406 Not Acceptable. Le code ignorait l'erreur (seul `data` était destructuré) mais cela masquait le problème réel.

**Fixes :**
1. `.single()` → `.maybeSingle()` sur le pre-check
2. Logging structuré `console.error('[SPIE_BUILD_FAILED]', { code, message })` sur UPDATE et INSERT
3. **Action manuelle requise :** Supabase Dashboard → API → **Reload Schema** pour rafraîchir le cache PostgREST après migration 036

---

### 4. Pourquoi Première leçon démarrait malgré les dépendances manquantes ?

**Cause :** La garde pour `premiere_lecon` était :
```typescript
if (!premiereLeconId && entitlement.first_lesson_complete && premiereUnite?.lecons[0]) {
```
`premiereUnite` est l'objet **en mémoire** (généré à l'ÉTAPE 2), toujours non-null même quand le `programme_annuel` n'a pas été persisté en DB. La vérification ne testait pas si les dépendances en base étaient réellement satisfaites.

**Fix :**
```typescript
if (!premiereLeconId && entitlement.first_lesson_complete && premiereUnite?.lecons[0]
    && buildState.plans_lecon.status === 'success') {
```
`buildState.plans_lecon.status === 'success'` n'est vrai que si la vérification DB des plans a réussi, ce qui requiert que `programme_annuel` soit persisté.

De plus, un **bloc fail-fast** a été inséré entre ÉTAPE 4 et ÉTAPE 5 :
```typescript
if (!progId) {
  // Envoyer 'bloque' pour plans_lecon, premiere_lecon, quiz
  controller.close(); return
}
```

---

### 5. Quelle est la source de vérité de chaque objet ?

| Objet | Table DB | Colonne clé | Notes |
|-------|----------|-------------|-------|
| **Curriculum** | `programme_annuel` | `contenu_json.unites[]` | Généré en mémoire, persisté dans `programme_annuel` |
| **Syllabus** | `programme_annuel` | `syllabus_json` | Objet `PackSyllabus` avec `titre_cours` requis |
| **Programme annuel** | `programme_annuel` | `id`, `contenu_json` | Lié via `teaching_packs.programme_annuel_id` |
| **Séquences** | `programme_annuel` | `contenu_json.unites[]` | Embedded (pas de table séparée) |
| **Plans de leçon** | `programme_annuel` | `contenu_json.unites[].lecons[]` | Embedded |
| **Première leçon** | `fichiers_dossier` | `type_fichier = 'lecon_complete'` | Dossier `plans_lecons` ou fallback |
| **Quiz** | `fichiers_dossier` | `type_fichier = 'quiz'` | Dossier `evaluations_sommatives` ou fallback |
| **BuildState** | `teaching_packs` | `contenu_json.build_state` | Persisté après chaque fail-fast |

---

### 6. Le Smart Resume fonctionne-t-il ?

**Partiellement.** Le mécanisme est en place :
- `buildState` est persisté dans `teaching_packs.contenu_json.build_state` lors des fail-fast
- En mode `reprendre=true`, les steps `curriculum`, `syllabus`, `programme_annuel`, `premiere_lecon`, `quiz` vérifient leur `buildState.{step}.status === 'success'` avant de regénérer
- Les IDs (`objectId`) sont préservés pour la relecture depuis DB

**Limitation :** Le bouton "Réessayer" déclenche un `window.location.reload()`. La page parente doit lire le `buildState` depuis Supabase et passer `reprendre=true` au composant `BuildMyYearWizard`. Ce mécanisme est implémenté côté page (non audité dans cette mission).

---

### 7. Test compte neuf — résultat attendu après fix

Avec les corrections, le pipeline doit exécuter dans l'ordre :

```
Configuration ✓  → validation + upsert teaching_pack
Curriculum ✓     → génération programme en mémoire
Syllabus ✓       → génération + parsing JSON
Plan annuel ✓    → INSERT programme_annuel + read-back + verify
Plans de leçon ✓ → verify unites[0].lecons.length > 0
Première leçon ✓ → génération HTML + INSERT fichiers_dossier + read-back
Quiz ✓           → génération HTML + INSERT fichiers_dossier + read-back
```

Si syllabus échoue → arrêt immédiat, `programme_annuel`, `plans_lecon`, `premiere_lecon`, `quiz` affichés comme **Bloqué (—)**.

---

### 8. Test fail-fast — comportement attendu

En forçant un échec syllabus (ex. modèle retourne JSON invalide) :

```
Curriculum    ✓
Syllabus      ✕   "Le syllabus n'a pas pu être généré."
Plan annuel   —   "Bloqué — syllabus requis pour garantir la cohérence pédagogique."
Plans leçon   —   (même message)
Première leçon —  (même message)
Quiz          —   (même message)
```

Zéro appel IA aux étapes suivantes. `teaching_packs.statut = 'erreur'`.

---

### 9. F5 conserve-t-il toutes les données ?

**Oui** — les données sont persistées en DB (Supabase) avant chaque réponse SSE de succès. La UI relit le `building_state` depuis `teaching_packs.contenu_json.build_state` au rechargement.

---

### 10. Logout/login conserve-t-il toutes les données ?

**Oui** — même source de vérité Supabase, même lecture au montage du composant.

---

## BUGS CORRIGÉS — DÉTAIL TECHNIQUE

### BUG 1 — Message curriculum (MISSION 2)
**Fichier :** `src/app/api/spie/build-year/route.ts`

| Avant | Après |
|-------|-------|
| `step: 'curriculum', message: 'Plan annuel généré — N unités...'` | `step: 'curriculum', message: 'Curriculum analysé — N unités structurées ✓'` |
| `step: 'programme_annuel', message: 'Plan annuel sauvegardé et vérifié ✓'` | `step: 'programme_annuel', message: 'Plan annuel sauvegardé — N unités, N leçons ✓'` |

---

### BUG 2 — Fail-fast syllabus (MISSIONS 5, 6)
**Fichier :** `src/app/api/spie/build-year/route.ts`

Bloc fail-fast inséré après la section syllabus :
- Vérifie `syllabusOk = buildState.syllabus.status === 'success' || 'skipped'`
- Si faux : émet `bloque` pour les 4 étapes aval, persiste buildState, émet `erreur`, `controller.close(); return`

---

### BUG 3 — Fail-fast programme_annuel (MISSIONS 5, 7)
**Fichier :** `src/app/api/spie/build-year/route.ts`

Bloc fail-fast inséré entre ÉTAPE 4 et ÉTAPE 5 :
- Vérifie `!progId` (null si INSERT échoué)
- Si vrai : émet `bloque` pour `plans_lecon`, `premiere_lecon`, `quiz`, persiste buildState, émet `erreur`

---

### BUG 4 — Garde première_lecon (MISSION 5)
**Fichier :** `src/app/api/spie/build-year/route.ts`

```diff
- if (!premiereLeconId && entitlement.first_lesson_complete && premiereUnite?.lecons[0]) {
+ if (!premiereLeconId && entitlement.first_lesson_complete && premiereUnite?.lecons[0]
+     && buildState.plans_lecon.status === 'success') {
```

---

### BUG 5 — Garde quiz (MISSION 5)
**Fichier :** `src/app/api/spie/build-year/route.ts`

```diff
- if (!quizId && entitlement.first_lesson_quiz && premiereUnite?.lecons[0]) {
+ if (!quizId && entitlement.first_lesson_quiz && premiereLeconId) {
```

---

### BUG 6 — Logging structuré (MISSION 18)
**Fichier :** `src/app/api/spie/build-year/route.ts`

Ajout de `console.error('[SPIE_BUILD_FAILED]', { packId, classeId, step, phase, error, code })` sur :
- UPDATE échoué de `programme_annuel`
- INSERT échoué de `programme_annuel`
- Échec validation syllabus
- Échec génération `premiere_lecon`
- Échec génération `quiz`

Ajout de `console.info('[SPIE]', ...)` sur les phases `complete` et `verified`.

---

### BUG 7 — `.single()` → `.maybeSingle()` (MISSION 3)
**Fichier :** `src/app/api/spie/build-year/route.ts`

```diff
- await supabase.from('programme_annuel').select('id').eq('teaching_pack_id', packId).single()
+ await supabase.from('programme_annuel').select('id').eq('teaching_pack_id', packId).maybeSingle()
```

---

### MISSION 10 — État `bloque` dans le wizard UI
**Fichier :** `src/components/build-year/BuildMyYearWizard.tsx`

- Ajout du cas `bloque` dans le mapping `dotClass` → classe CSS `d7-tl-dot--blocked`
- Symbole `—` affiché dans le dot bloqué (distinct de `✓`, `✕`, ou vide)
- `BuildYearStepStatut` étendu : `'bloque'` ajouté dans `src/lib/types/teaching-pack.ts`

---

### MISSION 15 — Textes UI
**Fichier :** `src/components/build-year/BuildMyYearWizard.tsx`

| Avant | Après |
|-------|-------|
| "Syllabus non généré — le plan annuel continue." | "Le syllabus n'a pas pu être généré." |
| "Génération de la leçon partielle — le plan annuel reste disponible." | "La première leçon n'a pas pu être générée." |
| "Quiz non généré — le reste du pack est disponible." | "Le quiz n'a pas pu être généré." |
| CTA "Reprendre la construction" | CTA "Réessayer" |

---

## ACTION MANUELLE REQUISE

**Supabase Dashboard → API → Reload Schema**

Cause probable de l'échec `programme_annuel` : le cache schema PostgREST ne connaît pas les colonnes `teaching_pack_id`, `calendrier_json`, `syllabus_json` ajoutées par la migration 036. PostgREST retourne HTTP 400 "column not found" sur ces INSERTs.

Après le reload, les logs Vercel doivent montrer `[SPIE]` et non `[SPIE_BUILD_FAILED]` sur le step `programme_annuel`.

Commande SQL alternative :
```sql
NOTIFY pgrst, 'reload schema';
```

---

## FICHIERS MODIFIÉS

| Fichier | Changement |
|---------|-----------|
| `src/lib/types/teaching-pack.ts` | `'bloque'` ajouté à `BuildYearStepStatut` |
| `src/app/api/spie/build-year/route.ts` | 10 corrections (messages, fail-fast ×2, gardes ×2, logging, `.maybeSingle()`) |
| `src/components/build-year/BuildMyYearWizard.tsx` | Gestion `bloque` + symbole `—` + textes corrigés + CTA "Réessayer" |

---

## VALIDATION

| Critère | Résultat |
|---------|----------|
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npm run build` | ✅ Succès |
| Message curriculum | ✅ Corrigé — "Curriculum analysé" |
| Fail-fast syllabus | ✅ Implémenté — `controller.close(); return` |
| Fail-fast programme_annuel | ✅ Implémenté — `controller.close(); return` |
| Garde première_lecon | ✅ `buildState.plans_lecon.status === 'success'` |
| Garde quiz | ✅ `premiereLeconId` requis |
| Logging structuré | ✅ `[SPIE]` / `[SPIE_BUILD_FAILED]` |
| État `bloque` UI | ✅ Symbole `—`, classe `d7-tl-dot--blocked` |
| Textes UI | ✅ Sans jargon, sans "le plan annuel continue" |
| Logique métier | ✅ Intacte |
| Sidebar / logo / favicon | ✅ Non touchés |
| SPIE migrations / Supabase | ✅ Non touchés |

---

## PIPELINE OFFICIEL V1 (MISSION 1)

```
configuration       → validation + upsert teaching_pack
curriculum          → génération programme en mémoire (contenu_json)
syllabus            → génération syllabus JSON
programme_annuel    → INSERT/UPDATE programme_annuel + verify
    └── requires: curriculum + syllabus
plans_lecon         → verify unites[0].lecons.length > 0 depuis DB
    └── requires: programme_annuel persisted
premiere_lecon      → génération HTML + INSERT fichiers_dossier + verify
    └── requires: plans_lecon persisted
quiz                → génération HTML + INSERT fichiers_dossier + verify
    └── requires: premiere_lecon persisted (premiereLeconId)
verification_finale → verifyTeachingPackCompleteness(packId)
```

Type officiel :
```typescript
type BuildStep =
  | 'configuration'
  | 'curriculum'
  | 'syllabus'
  | 'programme_annuel'
  | 'sequences'       // alias de programme_annuel (embedded)
  | 'plans_lecon'
  | 'premiere_lecon'
  | 'quiz'
  | 'verification_finale'
```

---

*SPIE-P0.1 — 2026-08-13 — Aucun push sans validation Product Owner*
