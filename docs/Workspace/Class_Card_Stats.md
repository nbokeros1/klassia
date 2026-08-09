# Cartes Classe — Statistiques
**ScorgIA · RELEASE-P0.2 · 2026-08-09**

---

## Problème identifié (RELEASE-P0.2 — P1 BLOQUANT)

Avant RELEASE-P0.2, les compteurs sur les cartes classe lisaient uniquement la table `lecons`.

Le pipeline "Construire mon année" écrit dans `fichiers_dossier`, **jamais dans `lecons`**.

**Résultat** : après un build complet, toutes les cartes affichaient **0 leçon, 0 prêtes, 0%**.

---

## Correction appliquée

Les cartes lisent maintenant depuis 3 sources :

### 1. `lecons` (éditeur de leçon)
```ts
await supabase.from('lecons').select('classe_id, statut').in('classe_id', classIds)
```

### 2. `fichiers_dossier` (pipeline build-year)
```ts
const { data: dossiers } = await supabase
  .from('dossiers_systeme').select('id, classe_id').in('classe_id', classIds)
// → JOIN manuel via dossierToClasse map
const { data: fichiers } = await supabase
  .from('fichiers_dossier').select('dossier_id, type_fichier').in('dossier_id', dossierIds)
```

### 3. `teaching_packs` (badge statut)
```ts
await supabase.from('teaching_packs').select('id, classe_id, created_at').in('classe_id', classIds)
```

---

## Calcul des métriques

```ts
const leconsTable    = leconsByClass[cls.id] || []
const fichiers       = fichiersByClass[cls.id] || []
const fichiersLecons = fichiers.filter(f => ['plan_lecon', 'fiche_lecon', 'lecon_complete'].includes(f.type_fichier))
const fichiersQuiz   = fichiers.filter(f => f.type_fichier === 'quiz')

const totalLecons = leconsTable.length + fichiersLecons.length
const pretes      = leconsTable.filter(l => l.statut === 'prete').length + fichiersLecons.length
const enseignees  = leconsTable.filter(l => ['enseignee','complete'].includes(l.statut)).length
const pct         = totalLecons > 0 ? Math.round((enseignees / totalLecons) * 100) : 0
```

> Les fichiers générés par build-year comptent toujours comme "prêts" (statut='prete' à la création).

---

## Badge Teaching Pack

| Condition | Badge | Couleur |
|-----------|-------|---------|
| `pack` existe | "✓ Année construite" | Vert #34D399 |
| `classe.curriculum_charge = true`, pas de pack | "✓ Curriculum" | Vert #34D399 |
| Ni pack ni curriculum | "Sans curriculum" | Jaune #FBC34A |

---

## Grid des stats

| Colonne | Source | Condition d'affichage |
|---------|--------|----------------------|
| 👥 Élèves | `classe.nombre_eleves` | Toujours |
| 📄 Leçons | `totalLecons` | Toujours |
| 🎮 Quiz | `fichiersQuiz.length` | Uniquement si pack |
| ✅ Prêtes | `pretes` | Toujours |
| 📊 Prog. | `pct%` | Toujours |
