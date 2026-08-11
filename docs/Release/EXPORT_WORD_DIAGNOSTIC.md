# EXPORT WORD — DIAGNOSTIC COMPLET
## ScorgIA · KlassIA+ · Bug "tableaux vides"
**Date :** 2026-08-11
**Statut :** DIAGNOSTIC UNIQUEMENT — aucune modification de code, aucun commit, aucun push

---

## SYMPTÔME

> Le plan de leçon est généré correctement. Le contenu est visible dans Workspace.
> La sauvegarde fonctionne. Lorsque l'utilisateur clique sur Exporter Word,
> Word s'ouvre, le document est créé, **MAIS les tableaux sont presque entièrement vides.**

---

## PIPELINE COMPLET : IA → Supabase → DOCX

```
[1] GÉNÉRATION IA
    User → POST /api/ia/assistant
         ← Claude Sonnet SSE stream → Markdown plan de leçon
         ← __ACTION__ JSON appended:
            { type_contenu, titre, dossier_suggere, contenu: fullMarkdown }
    ⚠️  ABSENT dans ACTION : contenu_json (non généré ici)

[2] ÉTAT CLIENT (preparer/page.tsx)
    message.content       = Markdown affiché (sans le tag __ACTION__)
    message.action_sug    = ActionSuggestion { contenu: fullMarkdown, type_contenu, titre... }
    message.contenu_json  = undefined  ← PAS ENCORE DÉFINI

[3] AUTO-SAUVEGARDE (feu-et-oubli, asynchrone)
    → POST /api/ia/action :
       { action: "sauvegarder", classe_id, type_contenu, titre, contenu: Markdown }
    
    DANS /api/ia/action :
    ├── INSERT fichiers_dossier (contenu_html = Markdown)
    ├── extraireContenuLecon(Markdown)  ← appel Claude Haiku
    │   ├── Si succès + résultat a { avant_amorce OU pendant_modelisation OU intention }
    │   │   → contenuJsonExtrait = ContenuLecon complet ✓
    │   └── Si échec (erreur API, timeout, JSON malformé, champs absents)
    │       → contenuJsonExtrait = { intention: Markdown }  ← FALLBACK PARTIEL ⚠️
    ├── INSERT lecons (contenu_json = contenuJsonExtrait)
    └── Retourne { fichier_id, contenu_json: contenuJsonExtrait }

[4] MISE À JOUR MESSAGE
    message.autosave_fichier_id = data.fichier_id
    message.contenu_json        = data.contenu_json
                                  = ContenuLecon complet   (si Haiku OK)
                                  = { intention: "..." }   (si Haiku KO) ⚠️
                                  = null                   (si pas de classe_id)

[5] EXPORT WORD (bouton WorkspaceHeader)
    lastExportableMsg = dernier message IA avec action_sug && !isStreaming
    → handleExportWord(lastExportableMsg.action_sug, lastExportableMsg.contenu_json)
    → POST /api/export/docx :
       {
         contenu:      action_sug.contenu,        // Markdown depuis ACTION payload
         contenu_json: message.contenu_json,      // ContenuLecon (complet, partiel, ou null)
         type_contenu, titre, ...
       }

[6] GÉNÉRATION DOCX (/api/export/docx)
    contenuJsonEffectif = contenu_json  (passé par le client)

    SI estPlanLecon ET !contenuJsonEffectif ET contenu :
        → extraireContenuLeconPourDocx(contenu)  ← Haiku re-extraction DOCX

    aContenuJson = contenuJsonEffectif &&
      (contenuJsonEffectif.avant_amorce ||
       contenuJsonEffectif.pendant_modelisation ||
       contenuJsonEffectif.intention)          ← ⚠️ INTENTION INCLUSE ICI

    SI estPlanLecon ET aContenuJson :
        → contenuLeconVersMarkdownUSJ(contenuJsonEffectif) → 7 tables Markdown
        → genererGabaritPlanLecon(7tables) → DOCX
    SINON SI estPlanLecon :
        → genererGabaritPlanLecon(contenu) → parsing positionnel du Markdown IA
        → tables[4,5,6] = undefined si < 7 tables → LIGNES VIDES
```

---

## SOURCE OFFICIELLE DES DONNÉES

| Champ | Source | Stocké dans |
|-------|--------|-------------|
| Markdown affiché | Stream SSE de `/api/ia/assistant` | `message.content` (React state) |
| `action_sug.contenu` | `fullText` avant `__ACTION__` tag | `message.action_sug.contenu` (React state) |
| `contenu_json` | Extraction Haiku via `/api/ia/action` | `lecons.contenu_json` (Supabase) + `message.contenu_json` (React state) |
| Export DOCX source | `action_sug.contenu` (Markdown) + `message.contenu_json` | `/api/export/docx` |

**Source officielle de la leçon :** `lecons.contenu_json` (Supabase) = ContenuLecon structuré.
**Source pour l'export Word :** `message.contenu_json` (React state) ← copie de `lecons.contenu_json`.

---

## CAUSE EXACTE DES TABLEAUX VIDES

### Scénario principal (cause la plus probable)

L'extraction Haiku dans `/api/ia/action` retourne le fallback `{ intention: Markdown }` au lieu du ContenuLecon complet. Ce fallback est :

1. Stocké dans `lecons.contenu_json` (Supabase)
2. Retourné comme `data.contenu_json` au client
3. Affecté à `message.contenu_json = { intention: "long texte markdown" }`

Quand l'utilisateur clique Export Word, `/api/export/docx` reçoit ce JSON partiel et :

| Étape | Résultat |
|-------|----------|
| `contenuJsonEffectif = { intention: "..." }` | Truthy → la re-extraction DOCX est **sautée** (condition `!contenuJsonEffectif`) |
| `aContenuJson = true` | Car `contenuJsonEffectif.intention` est présente (ligne 714 du route) |
| Chemin JSON-first emprunté | `contenuLeconVersMarkdownUSJ({ intention: "..." })` |
| Sérialisation vers 7 tables | Tables 0-3 partiellement remplies, **tables 4-6 vides** |
| `genererGabaritPlanLecon()` | Produit un DOCX avec structure correcte mais contenu de phases vide |

**Résultat :** Word s'ouvre, le document existe, les tables AVANT/PENDANT/APRÈS sont structurées mais leurs lignes de contenu sont vides — `[['', '', '']]`.

### Scénario secondaire (pas de classe sélectionnée)

Si `classe_id` est absent lors de la génération :
- `/api/ia/action` ne crée pas d'entrée `lecons` (condition `typeDocument && classe_id && fichier?.id`)
- `contenu_json: null` est retourné
- La re-extraction DOCX est tentée (condition `!contenuJsonEffectif` = true)
- Si cette re-extraction échoue aussi → chemin Markdown positionnel → tables vides si le Markdown IA n'a pas 7 tables aux bons indices

### Scénario tertiaire (export avant fin de l'auto-save)

Si l'utilisateur clique Export Word avant que l'auto-save asynchrone ait répondu :
- `message.contenu_json = undefined` (pas encore affecté)
- La re-extraction DOCX est tentée
- Si elle réussit → DOCX correct ; si elle échoue → tables vides

---

## OÙ LES DONNÉES DISPARAISSENT

```
✓ Markdown plan de leçon dans l'IA            → contenu complet présent
✓ action_sug.contenu (Markdown)               → contenu complet présent
✗ extraireContenuLecon() dans /api/ia/action  → PERTE DES PHASES (retourne fallback)
✗ message.contenu_json = { intention: "..." } → fallback partiel stocké
✗ /api/export/docx reçoit fallback truthy     → re-extraction DOCX sautée
✗ contenuLeconVersMarkdownUSJ(fallback)       → phases sérialisées à vide
✗ DOCX généré                                 → tableaux AVANT/PENDANT/APRÈS vides
```

**La donnée complète (Markdown) n'est jamais perdue.** Elle est dans `action_sug.contenu` et dans `fichiers_dossier.contenu_html`. Elle est simplement mal acheminée dans le chemin d'export.

---

## FICHIER RESPONSABLE (BUG)

**Fichier principal :** `src/app/api/export/docx/route.ts`

**Deux lignes en cause :**

```typescript
// LIGNE 708 — Condition de re-extraction trop stricte
if (estPlanLecon && !contenuJsonEffectif && contenu) {
// ↑ contenuJsonEffectif = { intention: "..." } est truthy → re-extraction SAUTÉE

// LIGNE 713-714 — Condition aContenuJson trop permissive
const aContenuJson = contenuJsonEffectif &&
  (contenuJsonEffectif.avant_amorce || contenuJsonEffectif.pendant_modelisation || contenuJsonEffectif.intention)
// ↑ || contenuJsonEffectif.intention → fallback partiel déclenche le chemin JSON
```

**Fichier secondaire :** `src/app/api/ia/action/route.ts`

```typescript
// LIGNE 57-81 — extraireContenuLecon() peut retourner un fallback partiel
const fallback = { intention: markdown }
// Ce fallback est retourné si Haiku échoue — il bloque ensuite la re-extraction DOCX
```

---

## CORRECTION RECOMMANDÉE (À VALIDER PAR LE PRODUCT OWNER)

**2 modifications dans `/api/export/docx/route.ts` :**

### Modification 1 — Re-extraction si phases absentes (ligne 708)

```typescript
// AVANT :
if (estPlanLecon && !contenuJsonEffectif && contenu) {

// APRÈS :
const hasPhases = (j: any) => !!(j?.avant_amorce || j?.pendant_modelisation || j?.apres_cloture)
if (estPlanLecon && (!contenuJsonEffectif || !hasPhases(contenuJsonEffectif)) && contenu) {
```

**Effet :** Quand `contenu_json = { intention: "..." }` (fallback partiel), la re-extraction Haiku DOCX est tentée quand même. Si elle réussit → phases complètes → DOCX correct.

### Modification 2 — aContenuJson exige les phases (ligne 713-714)

```typescript
// AVANT :
const aContenuJson = contenuJsonEffectif &&
  (contenuJsonEffectif.avant_amorce || contenuJsonEffectif.pendant_modelisation || contenuJsonEffectif.intention)

// APRÈS :
const aContenuJson = Boolean(contenuJsonEffectif &&
  (contenuJsonEffectif.avant_amorce || contenuJsonEffectif.pendant_modelisation || contenuJsonEffectif.apres_cloture))
```

**Effet :** Le chemin JSON-first n'est pris que si des phases réelles sont présentes. Un ContenuLecon avec seulement `intention` tombe dans le chemin Markdown positionnel (plus robuste pour ce cas).

### Impact des corrections

- Aucune logique métier modifiée — seulement les conditions de routage interne au générateur DOCX
- Aucune nouvelle route, aucun nouvel appel Supabase
- Régression possible : si la re-extraction DOCX échoue aussi, le chemin Markdown positionnel est emprunté. Si l'IA génère du Markdown avec headings au lieu de tables pour les phases → toujours vide. Mais ce chemin existait déjà avant.
- Correction plus profonde possible : fixer `extraireContenuLecon()` dans `/api/ia/action` pour ne jamais retourner le fallback si Haiku a répondu (forcer un retry ou renvoyer `null` pour déclencher la re-extraction DOCX) — mais cela dépasse le périmètre minimal.

---

## RÉSUMÉ EXÉCUTIF

| Question | Réponse |
|----------|---------|
| Workspace affiche le bon contenu ? | ✓ Oui — Markdown complet visible |
| Supabase contient le bon contenu ? | ⚠️ Partiel — `lecons.contenu_json` peut n'avoir que `{ intention: "..." }` |
| Quel champ est utilisé par l'export ? | `action_sug.contenu` (Markdown) + `message.contenu_json` (ContenuLecon) |
| Où les données disparaissent ? | Dans `extraireContenuLecon()` → fallback `{ intention }` bloque la re-extraction DOCX |
| Pourquoi les tables sont créées ? | La structure de gabarit est toujours générée (7 tables hardcodées) |
| Pourquoi les tables sont vides ? | `contenuLeconVersMarkdownUSJ()` sérialise des phases undefined → lignes vides |
| Fichier responsable | `src/app/api/export/docx/route.ts` (lignes 708, 713-714) |
| Cause racine | Condition `aContenuJson` inclut `|| intention` → fallback partiel accepté comme ContenuLecon valide |
| Correction recommandée | 2 lignes dans `/api/export/docx/route.ts` — voir ci-dessus |

---

*EXPORT_WORD_DIAGNOSTIC.md — 2026-08-11*
*Aucun commit. Aucun push. Aucune modification de code. En attente validation Product Owner.*
