# Workspace_Component_Map.md
## Carte des composants — Pedagogical Workspace Canvas

**Date :** 2026-08-09  
**Page :** `/dashboard/gerer/preparer`

---

## Arbre des composants

```
page.tsx (PreparerPageInner)
├── LoadingScreen                          ← affiché pendant init
├── PedagogiqueExplorer                   ← Zone 1 (Explorer, fixed, ~272px)
│   ├── ScorgiaLogo
│   ├── BuildDot                          ← DESIGN-04 (état pack)
│   └── DocRow / FolderRow
│       └── ws-quick-menu (séquences)     ← DESIGN-04 (hover actions)
│
└── WorkspaceLayout                       ← Zone 2+3 (Document + Assistant)
    ├── WorkspaceHeader                   ← 52px header
    │   └── ws-focus-btn                  ← DESIGN-04 (Focus Mode)
    │
    ├── [InspectorPanel?]                 ← Zone optionnelle (inspecteur)
    │
    ├── [AIAssistantPanel?]               ← Zone 3 (Assistant, 268px)
    │   ├── QUICK_ACTIONS (actions IA rapides)
    │   └── Dernière génération preview
    │
    └── Zone 2 — Document principal
        ├── NoClassesState                ← Aucune classe
        ├── ClassPickerState              ← Classe non sélectionnée
        ├── LoadingConversationState      ← Chargement conversation
        ├── WelcomeState                  ← Aucun message (welcome)
        ├── [Messages list]               ← Conversation en cours
        │   ├── MarkdownMessage           ← Message IA markdown
        │   ├── PlanLeconView             ← Plan de leçon formaté
        │   └── ActionBar (per-msg)       ← Word / PPT / Sauvegarder
        └── PreparationCanvas             ← Document généré (SC-02F)
            └── PhaseSection / CanvasBlock
```

---

## Composants par zone

### Zone 1 — Explorer (PedagogiqueExplorer)

| Composant | Rôle | État |
|-----------|------|------|
| `BuildDot` | État de construction (●/◐/✓/⚠) | DESIGN-04 |
| `DocRow` | Ligne document (curriculum, syllabus, etc.) | Existant |
| `FolderRow` | Dossier expandable (séquences, leçons, quiz) | Existant |
| `ws-quick-menu` | Actions rapides au hover séquence | DESIGN-04 |
| `ws-pack-context` | Chips province + année + statut | DESIGN-04 |

**Données chargées depuis Supabase :**
- `teaching_packs` : id, classe_id, programme_annuel_id, statut, province, annee_scolaire
- `fichiers_dossier` : id, nom, type_fichier, classe_id, statut, created_at
- `conversations_ia` : id, enseignant_id, classe_id, type_contenu, titre, etc.
- `programme_annuel` : id, classe_id, contenu_json, syllabus_json

### Zone 2 — Document (main area)

| État | Composant | Condition |
|------|-----------|-----------|
| Aucune classe | `NoClassesState` | `classes.length === 0` |
| Classe non sélectionnée | `ClassPickerState` | `!classeId` |
| Chargement conversation | `LoadingConversationState` | `loadingConversation` |
| Bienvenue | `WelcomeState` | `messages.length === 0` |
| Chat en cours | Messages list | `messages.length > 0 && !lastExportableMsg` |
| Document généré | `PreparationCanvas` | `lastExportableMsg?.action_sug` |

### Zone 3 — Assistant (AIAssistantPanel)

| Section | Contenu |
|---------|---------|
| Header | "✦ Assistant IA" + bouton fermer |
| Actions rapides | 6 boutons (Curriculum, Plan de leçon, Leçon, Quiz, Évaluation, Email) |
| Réviser | Améliorer, Adapter, Différencier |
| Contexte | Fichiers KlassIA associés |
| Résumé | Preview du dernier contenu généré |

---

## Flux de données

```
page.tsx (state)
    ├── profil, classes, classeId, messages, isStreaming
    ├── conversationId, conversationRefreshKey
    ├── fichiersJoints, fichiersKlassia
    ├── aiPanelOpen, inspectorOpen, explorerOpen
    └── focusMode                                    ← DESIGN-04
         ↓
    WorkspaceHeader ← focusMode, onToggleFocus       ← DESIGN-04
    PedagogiqueExplorer ← explorerOpen
    AIAssistantPanel ← messages, contextFiles
    InspectorPanel ← lastExportableMsg, classe
```

---

## États du workspace

```
INIT → LOADING → [AUTH_CHECK] → [DATA_LOAD] → READY
                                               ↓
                               READY → NO_CLASSES | CLASS_PICKER | WELCOME | CHAT | CANVAS
                                               ↓
                               CHAT ↔ CANVAS (selon lastExportableMsg)
                               CHAT ↔ LOADING_CONV (chargement conv existante)
```

---

## Interactions cross-composants

| Source | Événement | Destination | Effet |
|--------|-----------|-------------|-------|
| `PedagogiqueExplorer` | `onSelectConversation(conv)` | `page.tsx` | Charge conversation |
| `PedagogiqueExplorer` | `onNewDocument(prompt, classeId)` | `page.tsx` | Set inputValue + focus |
| `PedagogiqueExplorer` | `onToggleExplorer()` | `page.tsx` | Toggle `explorerOpen` |
| `WorkspaceHeader` | `onToggleFocus()` | `page.tsx` | Toggle `focusMode` + `explorerOpen` |
| `WorkspaceHeader` | `onToggleAssistant()` | `page.tsx` | Toggle `aiPanelOpen` |
| `WorkspaceHeader` | `onClasseChange(id)` | `page.tsx` | Reset conversation |
| `AIAssistantPanel` | `onQuickAction(prompt)` | `page.tsx` | `handleSend(prompt)` |
| `ActionBar` | `onAction(prompt)` | `page.tsx` | `handleSend(prompt)` |
| `PreparationCanvas` | `onSuggestPrompt(prompt)` | `page.tsx` | Set inputValue |

---

## CSS classes workspace (DESIGN-04)

Toutes définies dans la section `WORKSPACE CANVAS — DS 2.0 DESIGN-04` de `globals.css`.

```
.ws-build-dot         — Dot état construction
.ws-doc-row           — Conteneur ligne doc (position: relative)
.ws-quick-menu        — Menu hover actions (opacity 0→1)
.ws-quick-btn         — Bouton action rapide
.ws-focus-indicator   — Badge Focus Mode actif
.ws-sheet             — Surface feuille premium
.ws-pack-context      — Zone chips contextuels
.ws-pack-chip         — Chip individuel
.ws-prog              — Texte progression compact
.ws-focus-btn         — Bouton Focus Mode header
```
