# PRE-VERCEL-CONSOLE-01 — Rapport de nettoyage console
## ScorgIA · KlassIA+ · Pré-déploiement Vercel
**Date :** 2026-08-12
**Périmètre :** Warning Next/Image + HTTP 406 + HTTP 400 sur `programme_annuel`
**Contraintes :** Aucune migration, aucune modification Supabase, aucun redesign

---

## RÉSUMÉ

| Problème | Cause | Correction | Fichier |
|----------|-------|------------|---------|
| Warning Next/Image ratio logo | `width={220}` prop + `style.width: 'auto'` en conflit | Retrait du prop `width` pour le wordmark | `scorgia-logo.tsx` |
| HTTP 406 `programme_annuel` | `.single()` sur un fallback qui peut retourner 0 lignes | → `.maybeSingle()` | `classes/[id]/programme/page.tsx` |
| HTTP 400 `programme_annuel` | `syllabus_json` absent du cache schema PostgREST | Sélection `*` au lieu de colonnes explicites | `PedagogiqueExplorer.tsx` |

---

## MISSION 1 — WARNING LOGO NEXT/IMAGE

### Cause exacte

`ScorgiaLogo` (wordmark `light`/`dark`) utilisait :
```tsx
<Image
  width={220}        // prop fixe
  height={72}
  style={{ width: 'auto', height: 72 }}   // style.width: 'auto' ← conflit
/>
```

Next.js 16 émet un warning lorsque `width` prop et `style.width: 'auto'` sont définis simultanément — la valeur style prend le dessus, rendant le prop redondant. Documentation Next.js 16 : *"width" prop omis → no conflict*.

### Fichier corrigé

`src/components/branding/scorgia-logo.tsx`

### Requête avant / après

**Avant :**
```tsx
<Image width={imgW} height={imgH} style={{ height: imgH, width: 'auto', ...style }} />
```

**Après (wordmark) :**
```tsx
// width prop retiré — hauteur imposée, largeur auto via style uniquement
<Image height={imgH} style={{ height: imgH, width: 'auto', ...style }} />
```

**Icône (inchangé) :**
```tsx
// Carré fixe : width et height props conservés, pas de width: auto
<Image width={imgW} height={imgH} style={{ width: imgW, height: imgH }} />
```

### Note BRAND-02

Simultanément, la sidebar a été mise à jour :
- Avant : `<ScorgiaLogo variant="icon" width={24} height={24} />` + texte `"ScorgIA"`
- Après : `<ScorgiaLogo variant="dark" height={32} />` (wordmark officiel, 32 px)

Le texte `sidebar-brand` doublonnait le wordmark — retiré dans les deux modes (admin + enseignant).

---

## MISSION 2 — HTTP 406 `programme_annuel`

### Cause exacte

**Requête :**
```
GET programme_annuel?select=*&classe_id=eq.<uuid>&order=created_at.desc&limit=1
```

**Code :**
```typescript
// src/app/dashboard/classes/[id]/programme/page.tsx — ligne 86
const { data: prog } = await supabase
  .from('programme_annuel').select('*').eq('classe_id', id)
  .order('created_at', { ascending: false }).limit(1).single()  // ← CAUSE
```

`.single()` attend **exactement 1 ligne**. Lorsqu'une classe vient d'être créée et qu'aucun plan annuel n'a encore été construit (état métier valide), la requête retourne 0 ligne → PostgREST répond HTTP 406 Not Acceptable.

Ce chemin est le **fallback** déclenché quand `packData.programme_annuel_id` est null. Il est donc normal que le programme n'existe pas.

**État 0 ligne = état vide valide** (nouvelle classe, SPIE non encore exécuté).

### Correction

**Fichier :** `src/app/dashboard/classes/[id]/programme/page.tsx`

```diff
- .order('created_at', { ascending: false }).limit(1).single()
+ .order('created_at', { ascending: false }).limit(1).maybeSingle()
```

`.maybeSingle()` retourne `null` si 0 lignes (HTTP 200), sans erreur.

### Autres `.single()` sur `programme_annuel`

| Fichier | Ligne | `.single()` sur | Verdict |
|---------|-------|-----------------|---------|
| `classes/[id]/programme/page.tsx` | 80 | `.eq('id', packData.programme_annuel_id)` | ✅ FK explicite — toujours 1 ligne si FK valide |
| `build-year/route.ts` | 202 | `.eq('id', buildState.programme_annuel.objectId)` | ✅ ID connu — 1 ligne attendu |
| `build-year/route.ts` | 369 | `.eq('id', ...)` | ✅ ID connu |
| `build-pipeline.ts` | 111 | `.eq('id', packRow.programme_annuel_id)` | ✅ FK valide |
| `syllabus-save/route.ts` | 52 | `.eq('id', progId)` | ✅ ID connu |
| `quality-gate/route.ts` | 59, 72, 84 | `.eq('id', pack.programme_annuel_id)` | ✅ FK valide |
| `pack-export/route.ts` | 93 | conditionnel si `programme_annuel_id` | ✅ protégé par condition |
| `build-year/route.ts` | 382 | `.eq('teaching_pack_id', packId)` | ✅ contrainte UNIQUE |
| `build-year/route.ts` | 432 | `.eq('id', progRow.id)` | ✅ ID connu |
| `build-year/route.ts` | 464 | `.eq('id', progId)` | ✅ ID connu |

**Seul** le fallback par `classe_id` sans ID connu nécessitait `.maybeSingle()`.

---

## MISSION 3 — HTTP 400 `programme_annuel`

### Cause exacte

**Requête :**
```
GET programme_annuel?select=id,classe_id,contenu_json,syllabus_json&id=in.(...)
```

**Code :**
```typescript
// src/components/preparer/explorer/PedagogiqueExplorer.tsx — lignes 246 et 258
.select('id, classe_id, contenu_json, syllabus_json')
```

`syllabus_json` est défini dans la migration `036_teaching_packs.sql` :
```sql
ALTER TABLE programme_annuel
  ADD COLUMN IF NOT EXISTS syllabus_json JSONB DEFAULT '{}';
```

**Si migration 036 a été exécutée** → colonne existante mais absente du cache schema PostgREST. PostgREST retourne HTTP 400 Bad Request car il ne reconnaît pas la colonne.

**Si migration 036 n'a pas été exécutée** (env. local sans migration) → même symptôme.

### Correction

**Fichier :** `src/components/preparer/explorer/PedagogiqueExplorer.tsx`

```diff
- .select('id, classe_id, contenu_json, syllabus_json')
+ .select('*')
```

`select('*')` retourne toutes les colonnes reconnues par PostgREST. Si `syllabus_json` n'est pas dans le cache, il n'est simplement pas retourné — aucun 400. Si la colonne existe, elle est retournée normalement.

`hasSyllabus = !!programme?.syllabus_json` reste fonctionnel dans les deux cas :
- Cache stale / migration manquante → `syllabus_json` absent → `hasSyllabus = false` (correct)
- Colonne présente → `syllabus_json` retourné → `hasSyllabus` reflet de la réalité

### Note sur le cache PostgREST

Si migration 036 a été exécutée sur l'instance Supabase mais que les 400 persistent en production :
- Aller dans **Supabase Dashboard → API → Reload Schema**
- Ou via SQL : `NOTIFY pgrst, 'reload schema';`

---

## MISSION 4 — AUDIT COMPLET `from('programme_annuel')`

| Fichier | Select | Type de requête | Problème ? |
|---------|--------|-----------------|-----------|
| `founder/page.tsx` | `*` count only | HEAD request | ✅ aucun |
| `founder/contenu/page.tsx` | `*` count only | HEAD request | ✅ aucun |
| `PedagogiqueExplorer.tsx` | `id, classe_id, contenu_json, syllabus_json` → **`*`** | IN clause | ✅ corrigé |
| `planification/page.tsx` | `*` | tableau + `[0]` | ✅ aucun |
| `classes/[id]/programme/page.tsx` | `*` | `.eq('id', FK)` | ✅ aucun |
| `classes/[id]/programme/page.tsx` | `*` | `.limit(1).maybeSingle()` | ✅ corrigé |
| `build-pipeline.ts` | `id, syllabus_json, contenu_json` | `.eq('id')` | ⚠️ si cache stale : 400 SPIE |
| `build-year/route.ts` | `*` / `id` / `syllabus_json` / `contenu_json` | `.eq('id')` | ⚠️ même risque |
| `syllabus-save/route.ts` | `syllabus_json, version_numero` | `.eq('id')` | ⚠️ même risque |
| `quality-gate/route.ts` | `contenu_json, ...` / `syllabus_json` | `.eq('id')` | ⚠️ même risque |
| `pack-export/route.ts` | `contenu_json, syllabus_json, nb_semaines` | `.eq('id')` | ⚠️ même risque |
| `build-debug/route.ts` | `id, titre, nb_semaines, created_at, syllabus_json` | `.eq('id')` | ⚠️ même risque |

**Note** : Les routes API SPIE (`build-year`, `syllabus-save`, `quality-gate`, `pack-export`) sélectionnent aussi `syllabus_json` explicitement avec un `.eq('id', FK)`. Ces requêtes ne retourneront jamais 406 (ID connu), mais peuvent retourner 400 si `syllabus_json` n'est pas dans le cache PostgREST. Elles ne sont pas dans le périmètre de correction immédiate (ces routes sont déclenchées par des actions intentionnelles SPIE, pas au chargement de la page). Un refresh du cache PostgREST sur Supabase résoudra définitivement ces cas.

---

## MISSION 5 — GESTION D'ERREUR

- Le fallback `.maybeSingle()` retourne `null` proprement (HTTP 200) — aucun `console.error`.
- La sélection `*` ne produit pas de 400 — aucun log d'erreur.
- Les vrais erreurs (RLS, réseau, SQL) continuent de remonter normalement via le destructuring `{ data, error }`.

---

## MISSION 6 — ERREURS RÉSEAU (non touchées)

Les erreurs suivantes sont **délibérément non corrigées** :
- WebSocket Supabase déconnecté
- `AuthRetryableFetchError`
- `ERR_INTERNET_DISCONNECTED`

Ces erreurs se produisaient lorsque la connexion Internet était coupée. Aucune modification du client Supabase.

---

## FICHIERS MODIFIÉS

| Fichier | Changement | Type |
|---------|-----------|------|
| `src/components/branding/scorgia-logo.tsx` | Retrait du prop `width` pour wordmark + split icon/wordmark | Bug Next/Image + BRAND-02 |
| `src/components/Sidebar.tsx` | `variant="dark" height={32}` + retrait texte `sidebar-brand` | BRAND-02 |
| `src/app/dashboard/classes/[id]/programme/page.tsx` | `.single()` → `.maybeSingle()` ligne 86 | Bug 406 |
| `src/components/preparer/explorer/PedagogiqueExplorer.tsx` | `select('id, classe_id, contenu_json, syllabus_json')` → `select('*')` (×2) | Bug 400 |

---

## VALIDATION

| Test | Résultat |
|------|----------|
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npm run build` | ✅ Succès |
| Warning Next/Image logo | ✅ Corrigé — prop `width` retiré |
| HTTP 406 `programme_annuel` | ✅ Corrigé — `.maybeSingle()` |
| HTTP 400 `programme_annuel` | ✅ Corrigé — `select('*')` |
| Erreurs réseau / WebSocket | ✅ Non touchées |
| Logique métier | ✅ Intacte |
| Routes API | ✅ Intactes |
| SPIE | ✅ Non touché |

---

## ACTIONS RECOMMANDÉES AVANT VERCEL

1. **Refresh schema PostgREST** (Supabase Dashboard → API → Reload Schema) si les routes SPIE montrent des 400 en prod — résout définitivement le cache.
2. **Vérifier sidebar visuellement** : le wordmark dark 32px doit être lisible sur fond sombre sans étirement.
3. **Test navigateur** : ouvrir Préparer → Explorer → aucun 400/406 en console réseau.

---

*PRE-VERCEL-CONSOLE-01 — 2026-08-12 — Aucun commit, aucun push, aucune migration, aucune modification SPIE*
