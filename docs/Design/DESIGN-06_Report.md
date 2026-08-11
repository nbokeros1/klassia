# DESIGN-06 Report
## Invisible Intelligence — Bilan d'implémentation

**Date :** 2026-08-10
**Version Design System :** 2.0
**Phase :** DESIGN-06 (après DESIGN-05 Teacher Journey)

---

## Résumé

DESIGN-06 transforme la présence de l'IA dans ScorgIA en une présence invisible, contextuelle et non intrusive. L'enseignant ressent l'intelligence du logiciel sans la voir.

---

## Changements de code

### globals.css (+~80 lignes)

- `.ii-context-bar` — Context Bar 28px sous le header workspace
- `.ii-suggestion-strip` — Suggestion Strip Level 1 discrète
- `.ii-toast-quiet` — Toast succès silencieux
- `.ii-level-1/2/3` — Classes de niveau AI Visibility
- `.ii-smart-empty` — Smart empty states workspace

### WorkspaceHeader.tsx

**Supprimés :**
- `IaRing` — composant SVG crédits IA, mort code, jamais rendu
- `creditsIa` — prop morte `{ used: 0, total: 20 }`, jamais affichée

**Ajoutés :**
- `contextBar?: string | null` — Barre de contexte M1
- `suggestion?` — Strip de suggestion M3
- `onApplySuggestion?` / `onIgnoreSuggestion?` — Callbacks suggestion
- Return fragmenté `<>header + contextBar + suggestionStrip</>`

### AIAssistantPanel.tsx

**Supprimés :**
- `QUICK_ACTIONS` (6 items génériques)

**Ajoutés :**
- `DEFAULT_ACTIONS` (4 items pédagogiques)
- `CONTEXTUAL_ACTIONS` (map docType → 4 actions contextuelles)
- `docType?: string | null` prop
- `visibleActions` — sélection automatique selon docType

### preparer/page.tsx

**Modifiés :**
- `aiPanelOpen` — init depuis `localStorage.getItem('ws_copilot_open')`
- `handleToggleAssistant` — nommé, persiste en localStorage
- `onToggleAssistant` → `handleToggleAssistant`
- `onClose` de AIAssistantPanel — persiste `ws_copilot_open = false`

**Ajoutés :**
- `contextBar` — useMemo depuis classe + matiereEffective
- `docType` — depuis `lastExportableMsg.action_sug.type_contenu`
- `ignoredSuggestionDocType` / `rawSuggestion` / `activeSuggestion` — M3
- `onApplySuggestion` / `onIgnoreSuggestion` passés au WorkspaceHeader

**Supprimés :**
- `creditsIa={{ used: 0, total: 20 }}` — prop morte

### dashboard/page.tsx

**Modifié :**
- `✨ Préparer…` → `Préparer…` — Suppression emoji décoratif (M20)

---

## TypeScript

`npx tsc --noEmit` → **0 erreur**

---

## Métriques DESIGN-06

| Métrique | Avant | Après |
|----------|-------|-------|
| Code mort (IaRing, creditsIa) | Présent | Supprimé |
| Actions rapides (génériques) | 6 | 4 (contextuelles) |
| Copilot ouvert par défaut | Non (mais sans persistence) | Non + localStorage |
| Context Bar | Absent | Présent si classe active |
| Suggestion Strip | Absent | Présent selon docType |
| Emoji décoratif IA | ✨ dans CTA | Supprimé |

---

## Nouveau localStorage

| Clé | Valeur | Usage |
|-----|--------|-------|
| `ws_copilot_open` | `'true'` / `'false'` | Préférence copilot M6 |

---

## Voir aussi

- [AI_Visibility_Levels.md](AI_Visibility_Levels.md)
- [Context_Bar.md](Context_Bar.md)
- [Contextual_AI_System.md](Contextual_AI_System.md)
- [DESIGN-06_Invisible_Intelligence.md](DESIGN-06_Invisible_Intelligence.md)
