# Context Bar
## Barre de contexte workspace — DS 2.0 DESIGN-06 M1

**Date :** 2026-08-10
**Fichiers :** `WorkspaceHeader.tsx`, `preparer/page.tsx`

---

## Concept

> L'enseignant n'a jamais à se demander sur quoi il travaille.

La Context Bar est une ligne de 28px positionnée directement sous le `<header>` principal du Workspace. Elle affiche le contexte actif en lecture seule.

---

## Rendu

```
[Header principal 52px]
[Context Bar 28px] ← ici
[Suggestion Strip si active]
[Zone document]
```

Exemple affiché :
```
Mathématiques G9 · Algèbre
```

---

## Données sources

```typescript
// preparer/page.tsx
const contextBar = useMemo(() => {
  if (!classeId || !classe) return null
  return [classe.nom, classe.niveau, matiereEffective].filter(Boolean).join(' · ')
}, [classeId, classe, matiereEffective])
```

---

## Rendu dans WorkspaceHeader

```tsx
{contextBar && (
  <div className="ii-context-bar" aria-label={isFr ? 'Contexte actif' : 'Active context'}>
    <span>{contextBar}</span>
  </div>
)}
```

La barre est absente si `contextBar` est null (aucune classe sélectionnée).

---

## CSS

```css
.ii-context-bar {
  height: 28px; display: flex; align-items: center; padding: 0 18px;
  gap: 6px; font-size: 11px; color: var(--text-muted);
  border-bottom: 1px solid rgba(15,35,65,0.05);
  background: rgba(255,255,255,0.88);
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  flex-shrink: 0;
}
```

---

## Règles

1. **Conditionnelle** — absente si aucune classe sélectionnée
2. **Lecture seule** — jamais interactive (pas de clic)
3. **Discrète** — couleur muted, jamais dominante
4. **Visible en Focus Mode** — le contexte reste visible même en concentration totale
5. **Une seule ligne** — jamais de retour à la ligne

---

## AI Visibility Level

Level 0 (Invisible) — La Context Bar n'est pas un élément IA. Elle informe, elle ne suggère pas.
