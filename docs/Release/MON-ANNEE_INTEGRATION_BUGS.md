# MON-ANNEE — Registre des bugs — Audit INTEGRATION-01

**Date :** 2026-08-15  
**Audit :** MON-ANNEE-INTEGRATION-01 (V1 → V4)  
**Méthode :** Audit statique — aucun code modifié

---

## Classification

| Niveau | Définition |
|--------|-----------|
| **P0** | Bloquant total — fonctionnalité principale inaccessible |
| **P1** | Bloquant partiel — cas d'usage fréquent cassé, perte de données |
| **P2** | Dégradé significatif — workaround existe, mais UX ou intégrité altérée |
| **P3** | Mineur — edge case, console noise, esthétique |

---

## P0 — Aucun

Aucune régression P0 trouvée. Les flux principaux (Build My Year, Mark-taught, Curriculum Coverage, Smart Syllabus) fonctionnent correctement.

---

## P1 — Aucun

Aucune perte de données confirmée en usage normal. La race condition (BUG-02) est classée P2 en raison de la très faible probabilité d'occurrence en usage mono-utilisateur.

---

## P2 — 2 bugs

### BUG-01 — Mon Année : sélecteur de classe toujours vide

| Champ | Valeur |
|-------|--------|
| **Sévérité** | P2 |
| **Fichier** | [src/app/dashboard/mon-annee/page.tsx](src/app/dashboard/mon-annee/page.tsx) |
| **Ligne** | 182 |
| **Version introduite** | V1 (présent depuis la création de la page) |

**Description**  
`loadClasses` exécute :
```typescript
supabase.from('classes').select('*').eq('enseignant_id', user.id)
```
où `user.id` est le UUID auth (`auth.users.id`). Mais `classes.enseignant_id` référence `utilisateurs.id` (UUID interne, différent). La politique RLS filtre correctement la table, mais le filtre `.eq()` annule les résultats (aucun enregistrement ne match un UUID auth dans la colonne `enseignant_id` interne).

Toutes les autres pages du projet utilisent correctement `profil.id` (utilisateurs.id) :
- `AssistantFlottant.tsx:222` → `.eq('enseignant_id', profil.id)` ✓
- `suivre/page.tsx:33` → `.eq('enseignant_id', p.id)` ✓
- `studio-ia/page.tsx:252` → `.eq('enseignant_id', p.id)` ✓

**Impact**
- `allClasses` → toujours `[]`
- Dropdown de classe en haut de Mon Année → toujours vide
- Un enseignant avec plusieurs classes ne peut pas changer de classe depuis Mon Année
- Workaround : naviguer vers Mon Année depuis une autre page avec `?classeId=<id>` en URL, ou via localStorage (valeur persistée lors de la dernière sélection)

**Correction recommandée**  
Charger le profil avant de charger les classes, puis utiliser `profil.id` :
```typescript
// Option A (refactored load sequence) :
const { data: profilData } = await supabase
  .from('utilisateurs').select('id, prenom, nom, langue').eq('user_id', user.id).single()

const { data: classesData } = await supabase
  .from('classes').select('*').eq('enseignant_id', profilData.id).order('created_at', { ascending: false })

// Option B (supprimer le filtre redondant — RLS suffit) :
supabase.from('classes').select('*').order('created_at', { ascending: false })
```

---

### BUG-02 — Mark-taught : lost-update race condition

| Champ | Valeur |
|-------|--------|
| **Sévérité** | P2 (très faible probabilité — usage mono-utilisateur) |
| **Fichier** | [src/app/api/spie/mark-taught/route.ts](src/app/api/spie/mark-taught/route.ts) |
| **Lignes** | 67–105 |
| **Version introduite** | V4 (MON-ANNEE-V4) |

**Description**  
L'API `PATCH /api/spie/mark-taught` utilise un pattern read-then-write non atomique :
1. READ `programme_annuel.contenu_json` depuis DB
2. Mutate la leçon en mémoire
3. WRITE `contenu_json` complet en DB (UPDATE)

Si deux requêtes PATCH arrivent en parallèle pour le même `programmeAnnuelId` (ex : deux onglets ouverts simultanément), le second WRITE écrase le premier. La leçon marquée en premier redevient `'brouillon'`.

**Scénario reproductible**
```
Onglet A : marque leçon 1 → lit contenu_json (L1=brouillon, L2=brouillon)
Onglet B : marque leçon 2 → lit contenu_json (même snapshot)
Onglet A : écrit (L1=enseignée, L2=brouillon)
Onglet B : écrit (L1=brouillon, L2=enseignée) ← écrase le marquage de A
```

**Probabilité** : Très faible. Un enseignant utilisant deux onglets simultanément et marquant deux leçons dans la même seconde. Acceptable pour V4.

**Impact** : Perte silencieuse d'un marquage. L'enseignant devrait re-marquer la leçon.

**Correction V5**  
Migration 041 (teaching_events) : chaque marquage est un INSERT immuable indépendant, pas d'UPDATE JSONB. Pas de lost-update possible.

**Atténuation V4 possible sans migration**  
Utiliser `jsonb_set()` côté Supabase via RPC pour une mutation atomique :
```sql
UPDATE programme_annuel
SET contenu_json = jsonb_set(contenu_json, '{unites, <idx>, lecons, <idx>, statut}', '"enseignee"')
WHERE id = $1
```

---

## P3 — 4 bugs

### BUG-03 — `single()` sur teaching_packs sans pack

| Champ | Valeur |
|-------|--------|
| **Sévérité** | P3 |
| **Fichier** | [src/app/dashboard/mon-annee/page.tsx](src/app/dashboard/mon-annee/page.tsx) |
| **Ligne** | 200 |

**Description**  
```typescript
supabase.from('teaching_packs').select('*').eq('classe_id', cid).single()
```
`.single()` retourne une erreur Supabase si aucune ligne n'est trouvée (code 406 PGRST116). Pour une classe créée avant le lancement de SPIE (sans teaching_pack), cela génère une erreur console visible sans impact fonctionnel (le composant gère `null` correctement via `const tp = packData as TeachingPack | null`).

**Correction** : Remplacer `.single()` par `.maybeSingle()`.

---

### BUG-04 — StatutLecon non validé côté serveur

| Champ | Valeur |
|-------|--------|
| **Sévérité** | P3 |
| **Fichier** | [src/app/api/spie/mark-taught/route.ts](src/app/api/spie/mark-taught/route.ts) |
| **Ligne** | 18–38 |

**Description**  
Le champ `statut` du corps de la requête est validé uniquement par un cast TypeScript (`statut: StatutLecon`). En production, TypeScript ne garantit rien à l'exécution. Un `statut: "hacked"` passerait la validation et serait écrit dans le JSONB.

L'ownership est vérifié (l'enseignant ne peut écrire que ses propres leçons), donc il n'y a pas de risque de compromission d'autres données. Mais la valeur de `statut` pourrait être invalide dans le JSONB.

**Correction** :
```typescript
const VALID_STATUTS: StatutLecon[] = ['brouillon', 'prete', 'en_cours', 'enseignee', 'complete', 'a_revoir', 'archivee']
if (!VALID_STATUTS.includes(statut)) {
  return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
}
```

---

### BUG-05 — `seqCovers` : sur-déclaration de couverture RA

| Champ | Valeur |
|-------|--------|
| **Sévérité** | P3 |
| **Fichier** | [src/lib/spie/curriculum-coverage.ts](src/lib/spie/curriculum-coverage.ts) |

**Description**  
```typescript
const seqCovers = unite.curriculum_outcome_ids?.includes(outcome.id)
const hasTaught = leconsCovering.some(l => l.statut === 'enseignee')
  || (seqCovers && unite.lecons.some(l => l.statut === 'enseignee'))
```

La seconde condition `seqCovers && unite.lecons.some(l => l.statut === 'enseignee')` marque le RA comme enseigné si :
1. Le RA est couvert au niveau de la séquence entière (pas par une leçon spécifique)
2. ET **n'importe quelle** leçon de la séquence est enseignée

Problème : si la leçon enseignée ne couvre pas ce RA spécifique, le RA est quand même marqué `isTaught = true`. Légère sur-déclaration de couverture dans la matrice curriculum.

**Impact** : Affichage ✓ dans la colonne Enseigné pour un RA potentiellement non encore enseigné. Trompe légèrement l'enseignant sur sa progression.

**Correction** : Supprimer la condition `seqCovers` ou la raffiner pour vérifier que les leçons enseignées couvrent bien le RA.

---

### BUG-06 — `nb_lecons_total` potentiellement dénormalisé

| Champ | Valeur |
|-------|--------|
| **Sévérité** | P3 |
| **Fichier** | [src/app/dashboard/mon-annee/page.tsx](src/app/dashboard/mon-annee/page.tsx) |
| **Ligne** | 37 |

**Description**  
```typescript
const totalLecons = programme?.nb_lecons_total ?? (unites.length > 0 ? unites.reduce(...) : null)
```

`programme?.nb_lecons_total` est un champ dénormalisé calculé lors du build. S'il n'est pas mis à jour si l'utilisateur réorganise des leçons (fonctionnalité future), le pacing indicator serait basé sur un total inexact. En V4, ce champ n'est jamais mis à jour post-build, donc le risque est théorique mais réel en V5.

**Correction** : Toujours calculer depuis `contenu_json` : `unites.reduce((s, u) => s + u.lecons.length, 0)`.

---

## Résumé

| ID | Sévérité | Fichier | Ligne | Statut |
|----|---------|---------|-------|--------|
| BUG-01 | **P2** | `mon-annee/page.tsx` | 182 | **RÉSOLU** — HOTFIX-01 (2026-08-14) |
| BUG-02 | **P2** | `mark-taught/route.ts` | 67-105 | **RÉSOLU** — MON-ANNEE-V5 (2026-08-16) |
| BUG-03 | P3 | `mon-annee/page.tsx` | 200 | **RÉSOLU** — MON-ANNEE-V5 (2026-08-16) |
| BUG-04 | P3 | `mark-taught/route.ts` | 18-38 | **RÉSOLU** — MON-ANNEE-V5 (2026-08-16) |
| BUG-05 | P3 | `curriculum-coverage.ts` | — | **RÉSOLU** — MON-ANNEE-V5 (2026-08-16) |
| BUG-06 | P3 | `mon-annee/page.tsx` | 37 | **RÉSOLU** — MON-ANNEE-V5 (2026-08-16) |

---

## Journal des résolutions

### BUG-01 — HOTFIX-01 (2026-08-14)
Résolu dans `src/app/dashboard/mon-annee/page.tsx` : séquence de chargement rendue séquentielle (profil d'abord), `profilData.id` utilisé pour la requête classes.

### BUG-02 — MON-ANNEE-V5 (2026-08-16)
`PATCH /api/spie/mark-taught` remplacé par `POST` avec `INSERT` append-only dans `teaching_events`. Aucun UPDATE JSONB — pas de lost-update possible.

### BUG-03 — MON-ANNEE-V5 (2026-08-16)
`.single()` remplacé par `.maybeSingle()` dans `loadPackData()`.

### BUG-04 — MON-ANNEE-V5 (2026-08-16)
Validation runtime ajoutée dans la nouvelle route POST : `VALID_EVENT_TYPES` whitelist, bounds check `sequenceIndex`/`lessonIndex`, validation `occurredAt`, longueur `note` <= 2000.

### BUG-05 — MON-ANNEE-V5 (2026-08-16)
`curriculum-coverage.ts` refactorisé : leçon avec `curriculum_outcome_ids` explicites → seules ces leçons comptent pour ce RA. Leçon sans → inférence séquence autorisée. Ajout `coverageConfidence` et `isAssessed` sur `CurriculumCoverageItem`.

### BUG-06 — MON-ANNEE-V5 (2026-08-16)
`totalLecons` calculé depuis `unites.reduce()` dans `deriveData()` — le champ dénormalisé `programme?.nb_lecons_total` n'est plus utilisé.

---

*Tous les bugs de l'audit INTEGRATION-01 sont résolus en V5.*
