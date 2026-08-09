# WORKSPACE-2.0 — AI Copilot Architecture (Zone 3)
**ScorgIA · 2026-08-08**

---

## Rôle du panneau IA

Le panneau IA n'est plus une conversation.

C'est un **copilote invisible** qui observe le document actif et propose :
- Des actions rapides contextuelles
- L'historique des actions IA sur ce document
- Des suggestions d'amélioration
- Des adaptations provinciales
- Des ressources liées

---

## Composant actuel

`src/components/preparer/assistant/AIAssistantPanel.tsx`

Props :
```tsx
interface AIAssistantPanelProps {
  messages:      ChatMessage[]
  contextFiles:  { id: string; nom: string }[]
  isFr:          boolean
  isStreaming:   boolean
  onQuickAction: (prompt: string) => void
  onClose:       () => void
}
```

---

## Tabs du panneau (cible)

### Tab 1 — Actions rapides
Affiche les suggestions contextuelles basées sur le type du document actif.

```
Document actif : Plan de leçon
─────────────────────────────
✦ Développer les activités
✦ Ajouter une différenciation
✦ Créer le quiz associé
✦ Adapter pour Alberta
✦ Rédiger l'email aux parents
```

### Tab 2 — Historique IA
Chronologie des actions IA sur le document ouvert :

```
09:12  Créer la leçon
09:25  Développer les activités
09:31  Ajouter un quiz
        [Voir] [Comparer] [Restaurer]
```

### Tab 3 — Améliorer
Propositions générées par l'IA après lecture du document :
- Points forts détectés
- Lacunes pédagogiques
- Alignement curriculum
- Différenciation manquante

---

## Composants existants dans le dossier `assistant/`

| Composant                  | Rôle                           |
|----------------------------|--------------------------------|
| `AIAssistantPanel.tsx`     | Conteneur principal Zone 3     |
| `AISuggestionsTab.tsx`     | Actions rapides + suggestions  |
| `AIGenerateTab.tsx`        | Génération directe par type    |
| `AIHistoryTab.tsx`         | Historique IA (futur)          |
| `AIGeneratingIndicator.tsx`| Indicateur de génération       |

---

## Actions rapides par type de document

| Type de document  | Actions rapides disponibles                              |
|-------------------|----------------------------------------------------------|
| curriculum        | Générer plan annuel · Extraire résultats d'apprentissage |
| plan_annuel       | Créer séquences · Créer plans de leçon · Vue calendrier  |
| plan_lecon        | Développer · Ajouter quiz · Adapter province · Exporter  |
| lecon_complete    | Créer activités · Ajouter différenciation · Quiz rapide  |
| quiz              | Correction automatique · Variante · Exporter             |
| evaluation        | Grille de correction · Rubrique · Exporter               |
| email_parents     | Traduire · Adapter ton · Envoyer                         |

---

## Comportement toggle

- Bouton "Assistant" dans le `WorkspaceHeader` → `setAiPanelOpen(v => !v)`
- Quand ouvert : la Zone 3 s'affiche à droite (width 300px)
- Quand fermé : la Zone 2 prend tout l'espace disponible
- Bouton × dans le panneau ferme également

---

## Différentiation Inspecteur vs Copilote

| Panneau Inspecteur                       | Panneau Copilote IA                      |
|------------------------------------------|------------------------------------------|
| Métadonnées passives (qui, quand, quoi)  | Actions actives (faire, améliorer, créer)|
| Statut, version, historique de sauvegardes | Suggestions IA, adaptations, ressources |
| Ouvert seulement si document généré      | Toujours disponible                      |
