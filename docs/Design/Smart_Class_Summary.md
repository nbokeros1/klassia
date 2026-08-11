# Smart Class Summary
## Logique CTA et statut pédagogique — DS 2.0 DESIGN-08

**Date :** 2026-08-10

---

## Concept

> Chaque classe a une « prochaine action évidente ». La carte la détecte automatiquement et la présente comme un bouton unique.

L'enseignant ne choisit pas parmi plusieurs actions — la plateforme choisit pour lui, basée sur l'état réel de la classe.

---

## Arbre de décision du Smart CTA (M3)

```
cls.curriculum_charge ?
  └─ NON && !pack → "Construire mon année"    [violet primaire]
                     → /dashboard/classes/[id]/programme

  └─ OUI ou pack
      totalLecons > 0 ?
        └─ OUI → "Continuer"                  [couleur accent]
                  → localStorage + /preparer

        └─ NON
            pack existe ?
              └─ OUI → "Ouvrir mon année"     [couleur accent]
                         → localStorage + /preparer

              └─ NON → "Préparer une leçon"   [couleur accent]
                         → localStorage + /preparer
```

### Implémentation

```typescript
let ctaLabel = 'Préparer une leçon'
const ctaIsPrimary = !pack && !cls.curriculum_charge

if (!pack && !cls.curriculum_charge) {
  ctaLabel = 'Construire mon année'
} else if (totalLecons > 0) {
  ctaLabel = 'Continuer'
} else if (pack) {
  ctaLabel = 'Ouvrir mon année'
}

const ctaAction = () => {
  if (!pack && !cls.curriculum_charge) {
    router.push(`/dashboard/classes/${cls.id}/programme`)
  } else {
    localStorage.setItem('klassia_active_classe', cls.id)
    router.push('/dashboard/gerer/preparer')
  }
}
```

### Style du CTA

- **Primaire** (Construire mon année) : `background: var(--violet); color: #fff`
- **Secondaire** (tous les autres) : `background: ${accent}18; border: 1px solid ${accent}30; color: ${accent}`

Le style secondaire utilise la couleur de la classe — chaque CTA est unique visuellement sans être générique.

---

## Statut pédagogique (M2, M5)

La rangée de statut pédagogique affiche des **indicateurs discrets**, jamais des badges intrusifs.

### Indicateurs

| Symbole | Signification | CSS |
|---------|---------------|-----|
| `✓` vert | Élément présent et complet | `c8-ped--ok` (#10B981) |
| `○` gris | Élément absent | `c8-ped--empty` (text-muted) |
| `●` neutre | Compteur (leçons, quiz) | `c8-ped--neutral` (text-secondary) |
| `!` orange | Attention requise | `c8-ped--warn` (#F97316) |

### Logique d'affichage

```tsx
<span className={`c8-ped-item ${cls.curriculum_charge ? 'c8-ped--ok' : 'c8-ped--empty'}`}>
  {cls.curriculum_charge ? '✓' : '○'} Curriculum
</span>

<span className={`c8-ped-item ${pack ? 'c8-ped--ok' : 'c8-ped--empty'}`}>
  {pack ? '✓' : '○'} Année
</span>

{totalLecons > 0 && (
  <span className="c8-ped-item c8-ped--neutral">
    ● {totalLecons} leçon{totalLecons !== 1 ? 's' : ''}
  </span>
)}

{fichiersQuiz.length > 0 && (
  <span className="c8-ped-item c8-ped--neutral">
    ● {fichiersQuiz.length} quiz
  </span>
)}
```

**Règle :** Afficher uniquement les compteurs non-nuls. Un total à 0 leçons n'est pas affiché (l'absence est déjà communiquée par `○ Année`).

---

## Activité récente (M4)

### Source de données

```typescript
// Dans useEffect init() :
const { data: lecons } = await supabase
  .from('lecons').select('classe_id, statut, updated_at').in('classe_id', classIds)
```

### Calcul de la dernière activité

```typescript
const lastActivityByClass = useMemo(() => {
  const map: Record<string, Date | null> = {}
  for (const cls of classes) {
    const lecons = leconsByClass[cls.id] || []
    const dates = lecons
      .map((l: any) => l.updated_at ? new Date(l.updated_at) : null)
      .filter((d): d is Date => d !== null)
    map[cls.id] = dates.length > 0
      ? new Date(Math.max(...dates.map(d => d.getTime())))
      : null
  }
  return map
}, [classes, leconsByClass])
```

### Affichage relatif

```typescript
function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours   = Math.floor(diff / 3600000)
  const days    = Math.floor(diff / 86400000)
  if (minutes < 2)  return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  if (hours < 24)   return `il y a ${hours} h`
  if (days === 1)   return 'hier'
  if (days < 7)     return `il y a ${days} j`
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
}
```

### Fallback

Si aucune leçon n'a de `updated_at` → afficher `{nb_eleves} élève(s)` pour maintenir la cohérence spatiale de la carte. Si pas d'élèves non plus → ligne invisible (`opacity: 0`) pour préserver la hauteur.

---

## Tri des classes (M6)

Le tri est calculé en `useMemo` — aucun appel réseau.

| Option | Algorithme |
|--------|-----------|
| Récentes | Ordre Supabase (`created_at DESC`), aucun sort JS |
| Activité | Max `updated_at` des leçons, `null` en dernier |
| Progression | `getPct(b) - getPct(a)` (descendant) |
| Nom | `localeCompare('fr')` |

### `getPct` — calcul de progression

```typescript
const getPct = useCallback((cls: any): number => {
  const leconsTable    = leconsByClass[cls.id] || []
  const fichiers       = fichiersByClass[cls.id] || []
  const fichiersLecons = fichiers.filter((f: any) =>
    ['plan_lecon', 'fiche_lecon', 'lecon_complete'].includes(f.type_fichier)
  )
  const totalLecons = leconsTable.length + fichiersLecons.length
  const enseignees  = leconsTable.filter((l: any) =>
    ['enseignee', 'complete'].includes(l.statut)
  ).length
  return totalLecons > 0 ? Math.round((enseignees / totalLecons) * 100) : 0
}, [leconsByClass, fichiersByClass])
```

---

## Règles absolues

1. **Jamais de pourcentage inventé** — `pct` ne s'affiche que si `totalLecons > 0`
2. **Jamais de norme provinciale inventée** — la carte ne cite aucun curriculum
3. **Jamais "Powered by Claude"** — aucune mention IA dans la carte de classe
4. **Un seul CTA** — la logique Smart CTA ne peut pas produire deux boutons primaires
5. **Données uniquement depuis Supabase** — aucune valeur hardcodée pour les compteurs
