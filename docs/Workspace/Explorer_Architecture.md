# WORKSPACE-2.0 — Explorer Architecture
**ScorgIA · 2026-08-08**

---

## Fichier

`src/components/preparer/explorer/PedagogiqueExplorer.tsx`

Remplace `src/components/preparer/HistoriquePreparer.tsx` (conservé pour compatibilité historique).

---

## Props

```tsx
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

---

## Arborescence UI

```
┌────────────────────────────────┐
│  ScorgIA  Mon Espace    [◁]    │  ← Header (logo + collapse)
├────────────────────────────────┤
│  📚 Construire mon année        │  ← CTA principal
├────────────────────────────────┤
│  🔍 Rechercher un document…    │  ← Search bar
├────────────────────────────────┤
│  MES CLASSES                   │  ← Section label ou "N résultats"
├────────────────────────────────┤
│  📂 5e Année B          [12 ▾] │  ← Classe header
│  ├── 📘 Curriculum      [ 1 ▾] │  ← Dossier type (collapsed)
│  │     └── Document 1          │  ← Document item
│  ├── 📅 Plan annuel     [ 0 ▸] │  ← Dossier vide (collapsed)
│  │     └── [Aucun... + Créer]  │  ← Empty state avec CTA (quand ouvert)
│  ├── 📝 Plans de leçon  [ 3 ▾] │
│  │     ├── Document 1          │
│  │     ├── Document 2          │
│  │     └── Document 3          │
│  └── + Nouveau document        │  ← CTA classe
│                                │
│  ▸ 4e Année — Français  [ 5 ▸] │  ← Classe fermée
└────────────────────────────────┘
```

---

## État et persistance

### Clé localStorage
`scorgia_explorer_expanded` → JSON array des clés d'expansion actives

### Initialisation
1. Au chargement, lire `scorgia_explorer_expanded` depuis localStorage
2. Après chargement des conversations, auto-expand les classes qui ont des documents

### Toggle
Chaque clic sur un nœud de classe ou de dossier appelle `toggle(key)` qui :
1. Ajoute ou retire la clé du Set
2. Sauvegarde le Set dans localStorage
3. Déclenche un re-render

---

## Flux de données

```
supabase.from('conversations_ia')
  .select('id, classe_id, type_contenu, titre, updated_at, ...')
  .eq('enseignant_id', profil.id)
  .eq('est_archivee', false)
  .order('updated_at', { ascending: false })
  .limit(300)

→ groupé en :
{
  [classeId]: {
    [folderId]: ConversationIAResume[]
  }
}
```

---

## Comportement de collapse

La largeur est contrôlée par la prop `explorerOpen` :
- `true` → `width: 272px` (CSS transition 0.22s)
- `false` → `width: 0px, overflow: hidden`

Le `WorkspaceLayout` ajuste son `marginLeft` en miroir (même transition).

Quand l'explorateur est fermé, un petit bouton ▷ apparaît sur le bord gauche du workspace pour le rouvrir.

---

## Couleurs de dossiers

| Dossier          | Couleur           |
|------------------|-------------------|
| Curriculum       | `#60A5FA`         |
| Plan annuel      | `#A78BFA`         |
| Plans de leçon   | `#34D399`         |
| Leçons           | `#FBC34A`         |
| Quiz             | `#FB923C`         |
| Évaluations      | `#F87171`         |
| Emails parents   | `#F472B6`         |
| Brouillons       | `rgba(255,255,255,0.35)` |

---

## Évolutions prévues

1. **Séquences** — nœud intermédiaire entre Classe et les dossiers de type (nécessite migration DB)
2. **Drag & drop** — réordonner les documents dans un dossier
3. **Renommer** — double-clic sur un titre de document pour le renommer inline
4. **Corbeille** — dossier "Archivés" avec restauration
5. **Favoris** — épingler des documents en haut de l'explorateur
6. **Multi-sélection** — sélectionner plusieurs documents pour export ou archivage
