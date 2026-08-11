# Build to Workspace Handoff
## Transition Build My Year → Workspace — DS 2.0 DESIGN-07 M14

**Date :** 2026-08-10

---

## Concept

> Cliquer "Ouvrir mon année" doit ouvrir directement le Pedagogical Workspace.

Aucune page intermédiaire. L'explorateur contient déjà le Teaching Pack.

---

## Flux complet

```
1. Construction terminée
     ↓ (event 'termine' reçu dans BuildMyYearWizard)
     ↓ onDone(teachingPackId, progId) appelé
     ↓ handleWizardDone() → loadData() seulement

2. BuildProgressView affiche
   "Votre année est prête."
   + liste de checkpoints ✓
   + CTA "Ouvrir mon année →"

3. L'enseignant clique "Ouvrir mon année →"
     ↓ onOpenWorkspace() appelé
     ↓ handleOpenWorkspace() dans programme/page.tsx :
       → localStorage.setItem('klassia_active_classe', classeId)
       → router.push('/dashboard/gerer/preparer')
       → setShowWizard(false)

4. Workspace ouvert
   - Classe pré-sélectionnée (via 'klassia_active_classe')
   - Explorer contient les documents du Teaching Pack
   - Chat prêt
```

---

## Implémentation

### programme/page.tsx

```typescript
const handleOpenWorkspace = useCallback(() => {
  setShowWizard(false)
  if (typeof window !== 'undefined') localStorage.setItem('klassia_active_classe', id)
  router.push('/dashboard/gerer/preparer')
}, [id, router])
```

Passé à `BuildMyYearWizard` via prop `onOpenWorkspace`.

### BuildMyYearWizard.tsx

```typescript
interface WizardProps {
  // ...
  onOpenWorkspace?: () => void
}
```

Passé à `BuildProgressView` via prop `onOpenWorkspace`.

### BuildProgressView

```tsx
<button onClick={onOpenWorkspace}>
  Ouvrir mon année →
</button>
```

---

## Comportement des reouvertures (M15)

Après construction complète :
- `pack` existe en base → la condition `(!pack && !programme)` est fausse
- Le wizard ne s'ouvre plus automatiquement
- L'accès à "Mon année scolaire" affiche directement le Teaching Pack
- "Reconfigurer" est disponible manuellement (bouton "Reconstruire" → modal confirmation)

---

## Ce qui attend dans le Workspace

Après `loadData()` qui suit la construction, le Workspace contient :
- Classe active pré-sélectionnée (localStorage)
- Explorer : conversations et fichiers liés à cette classe
- Teaching Pack visible dans les onglets de la page programme

---

## Règles

1. **Jamais de page intermédiaire** entre la fin de construction et le workspace
2. **Classe toujours pré-sélectionnée** — utilise `klassia_active_classe` localStorage
3. **L'explorateur est prêt** — les fichiers indexés apparaissent automatiquement
4. **CTA unique** — "Ouvrir mon année →" est le seul CTA sur l'écran de succès
