# Timeline_System.md
## Système Timeline Pédagogique — ScorgIA DS 2.0

**Date :** 2026-08-10  
**Référence :** DESIGN-05 Mission 5

---

## Concept

La timeline pédagogique représente la journée d'un enseignant dans le temps :

```
Passé ←————————— Maintenant ————————→ Futur

● gris        ● vert (halo)         ● violet
08h00         10h30                  14h15
Math G9       Français G10           Science G11
[Consulter]   [Enseigner] ← Prochain
```

---

## Timeline "Aujourd'hui" (Dashboard)

Affichée dans la section "Aujourd'hui" de `/dashboard`.

### Données source

```typescript
supabase.from('cours_semaine')
  .select('*')
  .eq('enseignant_id', profil.id)
  .eq('jour', todayJour)
  .order('heure_debut', { ascending: true })
```

### Logique d'état

```typescript
const isPast = c.heure_debut < heureNow      // gris, "Consulter"
const isNext = prochainCours?.id === c.id    // vert + halo, "Enseigner"
// else: violet, "Préparer" / "Enseigner"
```

### Structure visuelle

```tsx
<div style={{ position: 'relative', paddingLeft: 22 }}>
  {/* Ligne verticale */}
  <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 2,
    background: 'linear-gradient(to bottom, var(--violet), rgba(108,92,231,0.06))' }} />

  {coursAujourdhui.map(c => (
    <div style={{ position: 'relative' }}>
      {/* Dot */}
      <div style={{
        position: 'absolute', left: -18, top: 5,
        width: isNext ? 11 : 9, height: isNext ? 11 : 9,
        borderRadius: '50%',
        background: isPast ? '#94A3B8' : isNext ? '#10B981' : 'var(--violet)',
        border: '2px solid white',
        boxShadow: isNext ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
      }} />
      {/* Contenu */}
    </div>
  ))}
</div>
```

---

## Timeline Pédagogique de l'Année (Explorer)

Affichée dans `PedagogiqueExplorer` via les BuildDots.

### Représentation

```
Séquence 1  ● pret     → développée
Séquence 2  ◐ partial  → en cours
Séquence 3  ◌ active   → génération
Séquence 4  ● todo     → à faire
Séquence 5  ● todo     → à faire
```

L'enseignant voit instantanément où il en est dans son année scolaire.

---

## Extension — IATimeline (DESIGN-01)

Le composant `IATimeline` (`src/components/ui/IATimeline.tsx`) représente les étapes du pipeline IA pendant la génération :

| État | Dot | Description |
|------|-----|-------------|
| `done` | ● vert ✓ | Étape terminée |
| `active` | ○ violet + spinner | Étape en cours |
| `pending` | ○ vide | En attente |
| `error` | ● rouge ✕ | Erreur |
| `skipped` | ○ gris | Ignorée |

---

## CSS de la timeline dashboard

Les styles sont inline dans `dashboard/page.tsx`. Ils correspondent aux design tokens DS 2.0 :

| Élément | Valeur |
|---------|--------|
| Ligne verticale | `width: 2px`, gradient violet → transparent |
| Dot normal | `9px × 9px`, `border-radius: 50%`, `border: 2px solid white` |
| Dot prochain | `11px × 11px`, `box-shadow: 0 0 0 3px rgba(16,185,129,0.2)` |
| Dot passé | `background: #94A3B8` |
| Dot prochain | `background: #10B981` (vert) |
| Dot futur | `background: var(--violet)` |

---

## Règles d'extension

1. **Nouvel état de cours** (ex: en ligne, annulé) : ajouter une condition dans la logique `isPast / isNext`
2. **Nouvelle source de données** : uniquement `cours_semaine` — ne pas combiner avec d'autres tables sans validation PO
3. **Heure de bascule** : `heureNow = new Date().toTimeString().substring(0, 5)` — comparaison string `"08:30" < "10:15"` correcte en format 24h
