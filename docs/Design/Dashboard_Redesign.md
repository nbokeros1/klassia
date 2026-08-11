# Dashboard_Redesign.md
## Dashboard Personnel — Refonte DESIGN-05

**Date :** 2026-08-10  
**Route :** `/dashboard`  
**Fichier :** `src/app/dashboard/page.tsx`

---

## Avant / Après

| Élément | Avant | Après |
|---------|-------|-------|
| Sous-titre | "Voici l'essentiel pour votre journée." | Dynamique (cours / tâches / "Tout est à jour") |
| CTA header | 2 boutons (identiques, même route) | 1 bouton (contextualisé selon prochain cours) |
| Leçons récentes : statut | `color` inline | `.tj-status--*` classe unifiée |
| Leçons récentes : CTA | "Reprendre →" (span) → bibliothèque | "Continuer →" (`.tj-doc-link`) → workspace avec classe |
| Activité récente : rendu | Liste plate (`gap: 8`) | `.tj-feed` timeline avec dots et ligne de connexion |
| Recommandations | Fetchées mais non affichées (discarded state) | Affichées dans "ScorgIA suggère" si disponibles |

---

## Structure du layout

```
Dashboard
├── Header
│   ├── H1 : Bonjour, {prénom}
│   ├── Sous-titre dynamique
│   └── CTA unique contextualisé
│
├── Colonne principale
│   ├── Section "Aujourd'hui" (timeline du jour)
│   ├── Section "Reprendre le travail" (leçons récentes)
│   └── Section "Aperçu pédagogique" (stats + graphique)
│
└── Colonne secondaire
    ├── MissionDuJour (Next Best Action)
    ├── Carte "Prochain cours" (si pas de mission)
    ├── "Commencer" (si 0 classe)
    ├── Section "À faire" (tâches)
    ├── Section "Accès rapides"
    ├── "Activité récente" (si données)  ← tj-feed
    └── "ScorgIA suggère" (si recommandations)  ← nouveau
```

---

## Données chargées

### Chargement principal (bloquant)

```typescript
Promise.all([
  supabase.from('classes').select('*'),
  supabase.from('taches_enseignant').select('*'),
  supabase.from('cours_semaine').select('*'),  // aujourd'hui
  supabase.from('notifications').select('id'),
  supabase.from('cours_semaine').select('*'),  // prochain
  supabase.from('cours_semaine').select('*'),  // demain
])
```

### Chargement secondaire (non-bloquant)

```typescript
fetchMissions()           → missionActive
fetchWorkflowSummary()    → workflowSummary
/api/activity/timeline    → recentActivity (tj-feed)
/api/recommendations      → recommendations  ← DESIGN-05 débloqué
/api/insights             → behavioralInsights
```

---

## Composants de statut de leçon

Mapping `STATUT_META` → `.tj-status--*` :

```typescript
const statusClass =
  l.statut === 'prete' || l.statut === 'complete' ? 'done'
  : l.statut === 'en_cours' ? 'active'
  : l.statut === 'enseignee' ? 'published'
  : l.statut === 'a_revoir' ? 'review'
  : l.statut === 'archivee' ? 'archived'
  : 'todo'
```

---

## Navigation "Documents reliés" (M7)

```typescript
// Sur clic d'une leçon récente
localStorage.setItem('klassia_active_classe', l.classe_id)
router.push('/dashboard/gerer/preparer')
// → Le workspace lit klassia_active_classe au montage
// → La classe est pré-sélectionnée automatiquement
```

---

## Panneau "ScorgIA suggère" (Recommandations)

Affiché uniquement si `recommendations.length > 0`.

```tsx
<div className="tj-rec-card">
  <div className={`tj-rec-priority tj-rec-priority--${rec.priority}`} />
  <div>
    <div>{rec.title}</div>
    <div>{rec.description}</div>
  </div>
</div>
```

La priorité est indiquée par une ligne verticale colorée :
- `HIGH` → violet
- `MEDIUM` → ambre
- `LOW` / `INFORMATION` → gris discret

---

## États du dashboard

| État | Condition | Affichage |
|------|-----------|-----------|
| Chargement | `loading === true` | `<LoadingScreen />` |
| Données OK | `dataLoaded` | Layout complet |
| Aucune classe | `classes.length === 0` | Carte "Commencer" + CTA créer classe |
| Aucune leçon récente | `leconsRecentes.length === 0` | Section "Reprendre" masquée |
| Aucune mission | `!missionActive && !missionsLoading` | Carte prochain cours ou état vide |
| Mission engine indisponible | `missionsError === 'unavailable'` | Section mission masquée silencieusement |
