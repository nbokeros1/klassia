# Next_Best_Action.md
## Système Next Best Action — Moteur de recommandation d'action principale

**Date :** 2026-08-10  
**Référence :** DESIGN-05 Mission 2

---

## Principe

> Chaque écran affiche UNE action principale. Jamais plusieurs CTA concurrents.

L'enseignant ne doit jamais se demander "et maintenant ?" Le logiciel lui montre naturellement la prochaine meilleure action.

---

## Architecture du système NBA

Le système repose sur 3 couches existantes, orchestrées :

```
┌─────────────────────────────────────────────────────────┐
│              MISSION ENGINE (fetchMissions)              │
│  Analyse l'état complet de l'enseignant →               │
│  Retourne UNE MissionPublic avec titre + CTA            │
└─────────────────────────────────────────────────────────┘
           ↓ (si aucune mission)
┌─────────────────────────────────────────────────────────┐
│              PROCHAIN COURS (cours_semaine)              │
│  Prochain cours du jour → "Préparer {classe}"           │
└─────────────────────────────────────────────────────────┘
           ↓ (si aucun cours)
┌─────────────────────────────────────────────────────────┐
│              FALLBACK (classes.length === 0)             │
│  "Commencez par créer une classe"                       │
└─────────────────────────────────────────────────────────┘
```

---

## Composant MissionDuJour

Fichier : `src/components/dashboard/MissionDuJour.tsx`

Le composant central du NBA. Il affiche :
- L'eyebrow "Prochaine action" (discret, 9px, uppercase)
- Le titre de la mission (14px bold)
- Le CTA primaire (bouton violet)
- Le contexte workflow si disponible

**Props :**
```typescript
{
  mission:          MissionPublic | null
  loading:          boolean
  error:            string | null
  isFr:             boolean
  onAction:         (mission, action) => Promise<MissionPublic | null>
  onNavigate:       (mission) => void
  workflowSummary?: WorkflowSummary | null
  onWorkflowNavigate: (id) => void
}
```

---

## CTA Header contextualisé (DESIGN-05)

Le CTA dans le header du dashboard est maintenant contextualisé :

```typescript
// Logique de sélection du CTA
prochainCours
  ? `✨ Préparer ${prochainCours.nom_classe}`
  : `✨ Préparer une leçon`
```

**Règle :** Le header CTA est toujours secondaire par rapport à MissionDuJour. Si MissionDuJour recommande autre chose, l'enseignant choisit.

---

## Sous-titre dynamique (DESIGN-05)

```typescript
// Logique de sélection du sous-titre
prochainCours
  ? `Prochain cours : ${prochainCours.nom_classe} à ${prochainCours.heure_debut}.`
  : tachesEnRetard.length > 0
  ? `${tachesEnRetard.length} tâche(s) en retard.`
  : taches.length > 0
  ? `${taches.length} tâche(s) en attente.`
  : `Tout est à jour pour aujourd'hui.`
```

---

## Exemples d'actions NBA

| Contexte | Action affichée |
|----------|----------------|
| Pas de plan annuel | "Configurer votre plan annuel" |
| Plan en cours de génération | "Votre plan annuel est en cours de création…" |
| Plan validé, séquences non développées | "Développer la séquence 3 — {titre}" |
| Séquence prête, pas de leçon | "Créer une leçon pour {séquence}" |
| Leçon prête, pas de quiz | "Créer le quiz de {leçon}" |
| Cours demain sans leçon préparée | "Préparer votre cours de demain" |
| Tout est fait | "Explorer vos ressources" |

---

## Règles du NBA

1. **UNE seule action primaire par écran** — ne jamais afficher deux CTA de poids égal
2. **Toujours une sortie** — si pas de mission active, afficher le prochain cours ou la création de classe
3. **Contextuel** — le CTA doit mentionner le nom réel (classe, séquence, leçon) quand disponible
4. **Non bloquant** — si le mission engine est indisponible (`error === 'unavailable'`), afficher un fallback cohérent
5. **IA invisible** — jamais mentionner "IA" dans l'action principale. "Développer la séquence", pas "Générer avec l'IA"

---

## Extension — Ajouter une nouvelle source NBA

1. Définir la priorité (avant ou après `prochainCours` dans la cascade)
2. Ajouter la condition dans `fetchMissions()` côté serveur (`/api/missions`)
3. Mapper vers `MissionPublic` type existant
4. Le composant `MissionDuJour` l'affichera automatiquement

**Ne pas** créer un nouveau composant NBA — utiliser le `MissionDuJour` existant.
