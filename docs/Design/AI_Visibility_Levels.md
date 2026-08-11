# AI Visibility Levels
## Design Language — DS 2.0 DESIGN-06 M21

**Date :** 2026-08-10

---

## Concept

Quatre niveaux définissent comment l'IA se manifeste dans l'interface. L'enseignant ne doit jamais dépasser le Level 2 sans avoir initié une action volontaire.

---

## Levels

### Level 0 — Invisible

L'IA travaille en silence. Aucun indicateur visible.

**Exemples :**
- Indexation d'un document en arrière-plan
- Calcul de recommandations non encore affichées
- Mise à jour des insights comportementaux

**CSS :** aucune classe — l'absence est la règle

---

### Level 1 — Suggestion

L'IA propose discrètement. L'enseignant peut ignorer sans friction.

**Exemples :**
- Context Bar (ii-context-bar)
- Suggestion Strip (ii-suggestion-strip)
- Recommandations dans le dashboard (tj-rec-card)

**CSS :** `.ii-level-1` — opacity: 0.85, font-size: 11px

**Règles :**
- Toujours ignorable (bouton ✕ ou absence d'interaction)
- Jamais obstructif
- Maximum 1 suggestion active à la fois par zone

---

### Level 2 — Assistant

L'utilisateur ouvre volontairement le panneau. L'IA peut parler librement.

**Exemples :**
- AIAssistantPanel ouvert
- Assistant flottant (AssistantFlottant)
- Actions rapides contextuelles

**CSS :** `.ii-level-2` — opacity: 1

**Règles :**
- Toujours refermable
- Jamais ouvert automatiquement (hors focus mode)

---

### Level 3 — Generation

L'enseignant a initié explicitement une génération. L'IA peut occuper l'espace.

**Exemples :**
- Streaming d'une leçon dans le document
- Génération d'un plan annuel (BuildMyYear)
- Exportation en cours

**CSS :** `.ii-level-3` — opacity: 1, font-weight: 600

**Règles :**
- Toujours stoppable (bouton Arrêter)
- Jamais démarré sans action utilisateur
- Progression toujours visible

---

## Ne jamais dépasser Level 1 sans action utilisateur

```
Level 0 → Level 1 : automatique si valeur réelle détectée
Level 1 → Level 2 : action utilisateur (clic "Ouvrir")
Level 2 → Level 3 : action utilisateur (clic "Générer", "Créer", etc.)
```

---

## Application dans le workspace

| Zone | Level par défaut | Level max |
|------|-----------------|-----------|
| Context Bar | 1 | 1 |
| Suggestion Strip | 1 | 1 |
| Assistant Panel fermé | 0 | 0 |
| Assistant Panel ouvert | 2 | 2 |
| Streaming actif | 3 | 3 |
| Explorer séquences (BuildDots) | 0 | 1 |
| Dashboard recommandations | 1 | 1 |
