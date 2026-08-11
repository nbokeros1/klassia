# Contextual AI System
## Actions rapides contextuelles — DS 2.0 DESIGN-06 M8

**Date :** 2026-08-10
**Fichier :** `src/components/preparer/assistant/AIAssistantPanel.tsx`

---

## Principe

> Remplacer les suggestions génériques par des actions adaptées au document actif.
> Maximum 4 suggestions. Jamais plus.

Les actions rapides ne sont plus génériques (curriculum, leçon, quiz…). Elles dépendent du `docType` — le type du document actuellement généré dans le workspace.

---

## Architecture

```
lastExportableMsg.action_sug.type_contenu → docType
docType → CONTEXTUAL_ACTIONS[docType] ou DEFAULT_ACTIONS
```

```typescript
const visibleActions = (docType && CONTEXTUAL_ACTIONS[docType])
  ? CONTEXTUAL_ACTIONS[docType]
  : DEFAULT_ACTIONS
```

---

## Actions par docType

### DEFAULT (pas de document)

| # | Label | Prompt |
|---|-------|--------|
| 1 | Plan de leçon | Crée un plan de leçon détaillé |
| 2 | Leçon complète | Génère une leçon complète |
| 3 | Quiz formatif | Crée un quiz formatif de 5 questions |
| 4 | Évaluation | Crée une évaluation sommative |

### plan_lecon

| # | Label | Logique |
|---|-------|---------|
| 1 | Développer en leçon | Transformation du plan |
| 2 | Quiz formatif | Basé sur ce plan |
| 3 | Évaluation | Alignée sur ce plan |
| 4 | Différencier | Adaptations élèves à besoins |

### fiche_lecon / lecon_complete / lecon_developpee

| # | Label | Logique |
|---|-------|---------|
| 1 | Quiz formatif | Basé sur cette leçon |
| 2 | Évaluation sommative | Alignée sur les objectifs |
| 3 | Différencier | Activités différenciées |
| 4 | Améliorer | Enrichir le contenu |

### quiz

| # | Label | Logique |
|---|-------|---------|
| 1 | Améliorer le quiz | Diversifier et reformuler |
| 2 | Évaluation | Complémentaire au quiz |
| 3 | Adapter pour tous | Besoins particuliers |
| 4 | Leçon de révision | Basée sur les concepts évalués |

### evaluation

| # | Label | Logique |
|---|-------|---------|
| 1 | Grille de correction | Rubrique détaillée |
| 2 | Améliorer | Clarté et alignement |
| 3 | Différencier | Adapté aux besoins |
| 4 | Quiz préparatoire | Avant l'évaluation |

### activite

| # | Label | Logique |
|---|-------|---------|
| 1 | Quiz formatif | Basé sur l'activité |
| 2 | Évaluation | Alignée sur les objectifs |
| 3 | Différencier | Variantes pour tous niveaux |
| 4 | Améliorer | Instructions et exemples |

---

## Règles

1. **Maximum 4 actions** — jamais plus, jamais moins (sauf liste vide = impossible)
2. **Toujours basées sur le document actif** — pas de suggestions hors contexte
3. **Pas d'action IA marketing** — "Générer avec l'IA" est banni. Actions en verbe pédagogique
4. **Section "Réviser le contenu"** — reste visible si `messages.length > 0`, complément des actions

---

## Extension — Ajouter un nouveau docType

1. Ajouter une entrée dans `CONTEXTUAL_ACTIONS` (exactement 4 actions)
2. Choisir des prompts en français naturel sans jargon
3. Si `docType` est un alias (ex: `lecon_developpee` = `fiche_lecon`), l'assigner directement :
   ```typescript
   CONTEXTUAL_ACTIONS['alias'] = CONTEXTUAL_ACTIONS['original']
   ```
