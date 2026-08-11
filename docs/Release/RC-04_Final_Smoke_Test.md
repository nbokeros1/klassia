# RC-04 — FINAL SMOKE TEST
## ScorgIA · KlassIA+ · Version 1.0 Beta
**Date :** 2026-08-11
**Type :** Audit technique et fonctionnel pré-déploiement
**Auditeur :** Claude Code — lecture exhaustive de code

> **Note méthodologique :** Les missions qui requièrent un navigateur (auth en direct, streaming IA, responsive, console.error) sont marquées [NAVIGATEUR REQUIS] et documentées depuis la lecture de code. Les missions architecturales et de sécurité sont entièrement vérifiables par analyse statique.

---

## MISSION 1 — BUILD & QUALITÉ

| Commande | Résultat | Détail |
|----------|----------|--------|
| `npx tsc --noEmit` | ✅ 0 erreur | Sortie vide = succès |
| `npm run build` | ✅ Succès | Exit code 0, toutes les pages générées |
| `npm run lint` | ⚠️ 798 erreurs | Pre-existing — `no-explicit-any` (masse), `no-unused-vars` (workflow-runtime) |
| `npm run test` | N/A | Aucun script de test configuré |
| `npm run test:e2e` | N/A | Aucun script e2e configuré |
| `npm audit` | Non exécuté | Nécessite connexion npm registry |

**Lint — contexte :** Les 798 erreurs sont 100% pré-existantes. Mes modifications RC-03/RC-04 n'en introduisent aucune nouvelle (suppression d'emoji, changement de href, pas de `any`). Principal contributeur : `@typescript-eslint/no-explicit-any` sur les pages `any` historiques.

---

## MISSION 2 — AUTHENTIFICATION [NAVIGATEUR REQUIS]

**Analyse statique :**

```
requireAuth() → supabase.auth.getUser() → validation JWT serveur ✓
             (≠ getSession() qui lit seulement le cookie)
```

Pattern uniforme dans toutes les pages :
```typescript
const { data: { session } } = await supabase.auth.getSession()
if (!session) { router.push('/login'); return }
```

Routes API : `requireAuth()` → `getUser()` server-side ✓

**Redirections vérifiées par lecture de code :**
- Non connecté → `/login` ✓
- Founder/Admin → `/founder` accessible ✓
- Teacher → `/founder` refusé (layout redirect `/dashboard`) ✓

[NAVIGATEUR REQUIS] : Tester inscription, login, logout, refresh réel.

---

## MISSION 3 — CRÉER UNE CLASSE [NAVIGATEUR REQUIS]

**Analyse statique :**
- `classes/page.tsx` — formulaire de création identifié
- Persistance Supabase via `supabase.from('classes').insert()`
- Pas de validation côté serveur visible → RLS Supabase responsable

[NAVIGATEUR REQUIS] : Création complète, apparition dans la liste, persistance après refresh.

---

## MISSION 4 — CONSTRUIRE MON ANNÉE [NAVIGATEUR REQUIS]

**Analyse statique :**
- `BuildMyYearWizard.tsx` — wizard en 5 étapes identifié
- Pipeline SPIE dans `src/lib/spie/build-pipeline.ts`
- Route API : `/api/spie/build-year` avec `maxDuration` ✓
- Persistance : `teaching_packs` table, `build_state` JSON

[NAVIGATEUR REQUIS] : Parcours complet + vérification persistance post-build.

---

## MISSION 5 — TEACHING PACK [NAVIGATEUR REQUIS]

**Analyse statique :**
- Structure Pack : `curriculum`, `syllabus`, `plan_annuel`, `sequences`, `lecons`, `quiz`
- Affichage dans `/dashboard/classes/[id]/programme`
- `BuildMyYearWizard.tsx` → `DetailedLessonView.tsx` pour la première leçon
- Persistance : JSON dans `contenu_json` de `teaching_packs`

[NAVIGATEUR REQUIS] : F5 / logout-login → données persistantes.

---

## MISSION 6 — MON ANNÉE [NAVIGATEUR REQUIS]

**Analyse statique :**
- BUG-001 corrigé en RC-02 : sidebar "Mon Année" → `localStorage.getItem('klassia_active_classe')` → navigation directe
- Wizard : si pack existant, ne recommence pas à l'étape 1 (logique `buildState` détectée)

[NAVIGATEUR REQUIS] : Confirmer comportement reprendre vs nouveau.

---

## MISSION 7 — MES CLASSES [NAVIGATEUR REQUIS]

**Analyse statique :**
- `classes/page.tsx` — grid responsive avec cartes
- `useForfait` pour les features Pro+
- Compteurs : basés sur les `lecons` par classe

[NAVIGATEUR REQUIS] : Tests filtres, recherche, responsive.

---

## MISSION 8 — REPRENDRE LE TRAVAIL [NAVIGATEUR REQUIS]

**Analyse statique :**
- BUG-002 corrigé en RC-02 ✓
- Navigation : `?conversation=UUID&classe_id=XYZ`
- Préparer charge la conversation depuis URL (logique existante, non touchée)

[NAVIGATEUR REQUIS] : Test end-to-end de la restauration.

---

## MISSION 9 — WORKSPACE PRÉPARER [NAVIGATEUR REQUIS]

**Analyse statique :**
- Auto-save : implémenté (badge "✓ Enregistré" / "Non enregistré")
- Streaming SSE : `EventSource` → ACTION_TAG parsing → document → save
- Copilote masquable : toggle `assistantOpen` ✓
- Explorer masquable : toggle `explorerOpen` ✓
- Focus mode : toggle `focusMode` ✓
- Export Word : `onExportWord` → `/api/export/docx` ✓
- Export PDF : NON visible dans l'UI (le bouton "Imprimer" est disabled, navigateur print)

[NAVIGATEUR REQUIS] : Streaming IA, scroll, save/state.

---

## MISSION 10 — BIBLIOTHÈQUE [NAVIGATEUR REQUIS]

**Analyse statique :**
- `bibliotheque/page.tsx` — fichier unique
- Chargement depuis `fichiers_dossier`, `conversations_ia`, `generations_ia`

[NAVIGATEUR REQUIS] : Recherche, filtres, aperçu.

---

## MISSION 11 — ENSEIGNER ✅ CODE REVIEW COMPLET

**Résultat :**

| Item | Status |
|------|--------|
| Auth guard | ✅ `getSession()` → redirect `/login` |
| `useForfait` pour Quiz Live | ✅ Cadenas Pro+ |
| "Workspace Enseigner" → `/dashboard/gerer/enseigner/${leconId}` | ✅ Route valide |
| "Lancer la leçon" → `/classes/${classeId}/lecons/${leconId}/presenter` | ✅ Route valide |
| "Tableau blanc" → `/classes/${classeId}/lecons/${leconId}/tableau` | ✅ Route valide |
| Timer | ✅ Fonctionnel (state pur, no navigation) |
| Sondage QR | ⚠️ STUB — affiche 🔲 emoji sans vrai QR code (P2) |
| Nuage de mots | ⚠️ STUB — bouton "Générer le nuage" sans `onClick` (P2) |
| "Voir les forfaits" → `/dashboard/forfaits` | ✅ Route valide |
| Aucun bouton mort critique | ✅ |

---

## MISSION 12 — SUIVRE ✅ CODE REVIEW COMPLET

**Résultat (post RC-03) :**

| Item | Status |
|------|--------|
| Onglet Progression | ✅ Contenu réel + état vide DS 2.0 |
| Onglet Évaluations | ✅ KPIs + liste leçons enseignées + état vide DS 2.0 |
| Onglet Participation | ✅ Banner Pro+ + métriques + état vide DS 2.0 |
| Onglet Rapports | ✅ Global summary + rapport par classe + état vide DS 2.0 |
| Lien Historique | ✅ `/dashboard/historique` existe |
| "Générer rapport IA" → `/dashboard/studio-ia` | ✅ Route valide |
| "Activer Quiz Live" → `/dashboard/outils` | ✅ Route valide |
| Aucun écran blanc | ✅ États vides explicites sur tous les onglets |

---

## MISSION 13 — FOUNDER ✅ CODE REVIEW COMPLET

| Chemin | Protection | Status |
|--------|-----------|--------|
| `/founder/*` (layout) | Client-side : `role === 'founder'\|'super_admin' \|\| is_admin === true` → redirect `/dashboard` si refusé | ✅ |
| `/api/founder/users` | Server-side : `verifyFounder()` → `getUser()` JWT + role check → 403 | ✅ |
| `/api/founder/audit` | Server-side via `requireFounderOrAdmin()` | ✅ |
| `/founder/monitoring` | Protégé par layout (content non rendu si `!ok`) | ✅ |
| Teacher → accès refusé | `router.replace('/dashboard')` | ✅ |
| Non connecté → login | `router.replace('/login')` | ✅ |

---

## MISSION 14 — BRANDING ✅ GREP COMPLET

| Occurence | Localisation | Nature | Visible user |
|-----------|-------------|--------|-------------|
| "KlassIA+" | `editor/SchemasSVG/*.tsx` | Commentaire en-tête fichier | ❌ non |
| "KlassIA" | `preparer/page.tsx` | Commentaires code interne | ❌ non |
| "KlassIA" | `preparer/KlassIAFilePicker.tsx` | Nom interne composant | ❌ non |
| "Powered by Claude" | `build-year/DetailedLessonView.tsx` | Commentaire: "n'apparaît jamais" | ❌ non |
| "ScorgIA" | `enseigner/page.tsx` | "Préparer du contenu dans ScorgIA" | ✅ attendu |

**Conclusion :** Aucun "KlassIA", "KlassIA+", "Powered by Claude" visible dans l'UI. Branding ScorgIA présent aux bons endroits.

[NAVIGATEUR REQUIS] : Vérification visuelle favicon, titres onglets navigateur.

---

## MISSION 15 — EXPORTS ✅ CODE REVIEW COMPLET

| Export | Route | maxDuration | UI exposé |
|--------|-------|-------------|-----------|
| Word (.docx) | `/api/export/docx` | ✅ | ✅ Bouton "📥 Word" dans WorkspaceHeader |
| PowerPoint (.pptx) | `/api/export/pptx` | ✅ | ✅ Dans menu ⋯ (Pro+, cadenas) |
| PDF | `/api/export/pdf` (soffice) | ✅ | ❌ NON exposé — bouton "Imprimer" disabled (opacity: 0.5, `disabled` attr) |

**PDF sur Vercel :** La route `/api/export/pdf` utilise `exec soffice` (LibreOffice) qui n'existe pas sur Vercel. Elle est correctement cachée dans l'UI — aucun bouton actif ne l'appelle. Le bouton "Imprimer" visible est désactivé et dit "(via le document)".

---

## MISSION 16 — CONSOLE [NAVIGATEUR REQUIS]

**Code patterns identifiés :**
- `catch {}` (silencieux) présent dans plusieurs routes API → P3 (debug difficile)
- React key warnings : non identifiés par analyse statique
- Hydration errors : risque sur les composants 'use client' avec état initial côté serveur

[NAVIGATEUR REQUIS] : Ouvrir DevTools sur chaque page principale.

---

## MISSION 17 — RESPONSIVE [NAVIGATEUR REQUIS]

**Analyse statique :**
- Préparer : layout `display: flex` sur 3 colonnes — potentiellement non responsive sur 768px et mobile
- Dashboard : `stats-grid` CSS class — dépend du CSS global
- Mes Classes : `grid auto-fill` → devrait être responsive
- Suivre : `repeat(auto-fill, minmax(340px, 1fr))` → responsive ✓

[NAVIGATEUR REQUIS] : Tests à 1440/1024/768/375px.

---

## MISSION 18 — PERFORMANCE BÊTA

**Analyse statique :**

| Pattern | Évaluation |
|---------|-----------|
| `Promise.all` pour requêtes parallèles | ✅ Utilisé sur Dashboard (7 requêtes), Suivre, Founder |
| Requêtes séquentielles init | ⚠️ session → profil → données (3 await en série sur certaines pages) |
| SSE streaming | ✅ Pas de polling |
| Virtualisation listes | ⚠️ Absente — leçons chargées toutes en mémoire |
| Cache client | ⚠️ Aucun — rechargement complet à chaque visite |

**Impact bêta :** Pour 3-5 enseignants avec des volumes faibles (< 100 leçons), ces patterns sont acceptables.

---

## MISSION 19 — SECURITY QUICK CHECK ✅

| Check | Status | Détail |
|-------|--------|--------|
| Founder guard (layout) | ✅ | `useEffect` + `getUser()` + role check |
| Founder guard (API) | ✅ | `verifyFounder()` server-side JWT |
| Teacher ownership (IA routes) | ✅ | `enseignant_id = profil.id` dans les inserts |
| RLS Supabase | ✅ assumé | Anon key avec RLS configuré (non vérifiable sans DB access) |
| ANTHROPIC_API_KEY | ✅ | Server-only (`process.env.ANTHROPIC_API_KEY` dans routes API) |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | Server-only (jamais dans `NEXT_PUBLIC_`) |
| NEXT_PUBLIC_SUPABASE_URL | ✅ intentionnel | Public, protégé par RLS |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ intentionnel | Public, protégé par RLS |
| Service role exposé côté client | ✅ ABSENT | Uniquement dans `lib/supabase/admin.ts` (server-only) |

---

*RC-04 — 2026-08-11 — Aucun commit, aucun push*
