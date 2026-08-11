# Workspace_Canvas_Guidelines.md
## Guide d'implémentation — Pedagogical Workspace Canvas

**Date :** 2026-08-09  
**Fichiers :** `src/app/dashboard/gerer/preparer/`, `src/components/preparer/**`

---

## Architecture des 3 zones

```
┌─────────────────────────────────────────────────────────────┐
│                     WorkspaceHeader (52px)                   │
├──────────────┬────────────────────────────────┬─────────────┤
│              │                                │             │
│  Explorer    │         Document               │  Assistant  │
│  ~272px      │         (flex: 1)              │  268px      │
│  (fixed)     │                                │  (optional) │
│              │                                │             │
└──────────────┴────────────────────────────────┴─────────────┘
```

L'explorateur est `position: fixed, left: 0, top: 0`. Le layout principal utilise `margin-left: 272px`. L'assistant est dans le flux (`flex-shrink: 0, width: 268px`).

---

## Composants

### PedagogiqueExplorer

```typescript
interface Props {
  profil:               any
  classes:              any[]
  activeConversationId: string | null
  refreshKey:           number
  isFr:                 boolean
  explorerOpen:         boolean
  onSelectConversation: (conv: ConversationIAResume) => void
  onNewDocument:        (prompt: string, classeId?: string) => void
  onToggleExplorer:     () => void
  onLogout?:            () => void
  notifCount?:          number
}
```

**État interne de DESIGN-04 :**
- `hoveredSeqKey: string | null` — séquence survolée pour les quick actions

### WorkspaceHeader

```typescript
// Props ajoutées en DESIGN-04
focusMode?:     boolean
onToggleFocus?: () => void
```

### AIAssistantPanel

Largeur réduite : **268px** (était 300px)

---

## BuildDot — États de construction

```tsx
// Usage
<BuildDot statut={pack.statut} />

// Mapping
{
  pret:                 { symbol: '●', state: 'pret',    color: '#34D399' }
  partiellement_genere: { symbol: '◐', state: 'partial', color: '#FBC34A' }
  generation_en_cours:  { symbol: '◌', state: 'active',  color: '#A78BFA' } // pulsant
  erreur:               { symbol: '⚠', state: 'error',   color: '#F87171' }
  brouillon:            { symbol: '●', state: 'todo',    color: rgba(255,255,255,0.18) }
  configuration:        { symbol: '●', state: 'todo',    color: rgba(255,255,255,0.18) }
}
```

CSS : `.ws-build-dot[data-state="active"] { animation: ws-dot-pulse 1.4s infinite }`

---

## Quick Actions — Séquences

Les quick actions apparaissent au survol de chaque séquence dans l'explorateur. Elles utilisent `onNewDocument(prompt, classeId)` avec un prompt contextualisé sur la séquence.

```tsx
// Prompt Leçon
`Développe une leçon complète pour la séquence "${u.titre}".`

// Prompt Quiz
`Crée un quiz formatif pour la séquence "${u.titre}".`
```

**Règle :** Les quick actions n'appellent jamais directement l'API IA. Elles mettent uniquement le prompt dans l'input du workspace.

**Ajout d'une nouvelle action :**
1. Créer le prompt contextualisé
2. Appeler `onNewDocument(prompt, classe.id)`
3. Ajouter le bouton dans la `div.ws-quick-menu`

---

## Focus Mode

```typescript
// État dans page.tsx
const [focusMode, setFocusMode] = useState(() =>
  typeof window === 'undefined' ? false : localStorage.getItem('ws_focus_mode') === 'true'
)
const [explorerOpen, setExplorerOpen] = useState(() =>
  typeof window === 'undefined' ? true : localStorage.getItem('ws_focus_mode') !== 'true'
)

// Toggle handler
const handleToggleFocus = () => {
  setFocusMode(prev => {
    const next = !prev
    localStorage.setItem('ws_focus_mode', String(next))
    if (next) {
      setExplorerOpen(false)
      setAiPanelOpen(false)
    } else {
      setExplorerOpen(true)
    }
    return next
  })
}
```

**Clé localStorage :** `ws_focus_mode` (`'true'` / `'false'`)

---

## Context Chips (province + année)

```tsx
// Chargés depuis teaching_packs SELECT
'id, classe_id, programme_annuel_id, statut, province, annee_scolaire'

// Affichage
{(pack.province || pack.annee_scolaire) && (
  <div className="ws-pack-context">
    {pack.province && <span className="ws-pack-chip">{pack.province}</span>}
    {pack.annee_scolaire && <span className="ws-pack-chip">{pack.annee_scolaire}</span>}
    <span className="ws-pack-chip">
      <BuildDot statut={pack.statut} />
      &nbsp;{/* label statut */}
    </span>
  </div>
)}
```

---

## CSS classes DESIGN-04

| Classe | Rôle |
|--------|------|
| `.ws-build-dot` | Dot d'état de construction |
| `.ws-doc-row` | Wrapper de ligne document (position relative) |
| `.ws-quick-menu` | Menu actions rapides au hover (opacity 0→1) |
| `.ws-quick-btn` | Bouton action rapide compact |
| `.ws-focus-btn` | Bouton Focus Mode dans le header |
| `.ws-pack-context` | Zone chips province/année/statut |
| `.ws-pack-chip` | Chip individuel (province, année, statut) |
| `.ws-prog` | Texte progression (9px, muted) |
| `.ws-sheet` | Surface "feuille premium" (blanc pur) |

---

## Règles d'extension

1. **Nouvel état de construction** : ajouter dans `STATE_MAP` de `BuildDot`
2. **Nouvelle quick action** : ajouter un `ws-quick-btn` dans la `div.ws-quick-menu` des séquences
3. **Nouveau contexte permanent** : ajouter un chip dans `ws-pack-context`
4. **Ne pas** créer de nouvelles sources de données pour le workspace — uniquement réutiliser les données déjà chargées
5. **Ne pas** modifier le layout `position: fixed` de l'explorateur sans valider l'impact sur la transition d'ouverture/fermeture

---

## Principe directeur

> Le document est le héros. L'enseignant est le créateur. L'IA est un assistant discret. Le logiciel doit produire un effet "WOW" par sa simplicité, sa cohérence et son élégance, jamais par des artifices visuels.

---

## DESIGN-06 — Context Bar et comportement copilot

### Context Bar (M1)

Ligne de 28px sous le header workspace. Affiche `classe · niveau · matière`.

- **Conditionnelle** — absente si aucune classe sélectionnée
- **Non interactive** — lecture seule (AI Visibility Level 0)
- **CSS :** `.ii-context-bar`

Rendu depuis `WorkspaceHeader` : `{contextBar && <div className="ii-context-bar">{contextBar}</div>}`

Calcul dans `preparer/page.tsx` :
```typescript
const contextBar = useMemo(() => {
  if (!classeId || !classe) return null
  return [classe.nom, classe.niveau, matiereEffective].filter(Boolean).join(' · ')
}, [classeId, classe, matiereEffective])
```

---

### Copilot comportement (M6)

L'AIAssistantPanel est **fermé par défaut** et mémorise la préférence :
- Clé localStorage : `ws_copilot_open`
- Init : `useState(() => localStorage.getItem('ws_copilot_open') === 'true')`
- Toggle : `handleToggleAssistant` persiste en localStorage
- Fermeture via ✕ : persiste aussi `ws_copilot_open = false`

---

### Suggestion Strip (M3)

Strip 32px sous la Context Bar. Apparaît selon le `docType` du document actif.

- `plan_lecon` → "Ce plan est prêt. Développer en leçon complète ?"
- `fiche_lecon` / `lecon_complete` / `lecon_developpee` → "Votre leçon est prête. Créer un quiz formatif ?"
- Boutons : "Appliquer" | "Voir pourquoi" | ✕
- **CSS :** `.ii-suggestion-strip`, `.ii-suggestion-action`, `.ii-suggestion-why`, `.ii-suggestion-ignore`
- **AI Visibility Level 1** — jamais bloquant, toujours ignorable
