# DESIGN-05 — Rapport de livraison
## The Teacher Journey — Plateforme proactive ScorgIA

**Statut :** LIVRÉ — En attente de validation Product Owner  
**Date :** 2026-08-10  
**Périmètre :** Navigation, Dashboard, Sidebar, UX globale  
**Contraintes absolues :**
- Ne modifier aucune logique métier
- Ne casser aucune API ni route
- Modifier uniquement : UX, Navigation, Expérience, Lisibilité

---

## Résumé exécutif

DESIGN-05 transforme ScorgIA en **plateforme proactive** : le logiciel ne attend plus que l'enseignant découvre les fonctionnalités — il guide naturellement vers la prochaine meilleure action. Chaque écran répond maintenant à une question claire.

---

## Missions réalisées

### Mission 1 — Parcours officiel

Le parcours A (Créer → Curriculum → Construire → Valider → Séquences → Leçons → Évaluations → Enseigner → Suivre) est maintenant documenté dans [Teacher_Journey.md](Teacher_Journey.md). La Sidebar 3.0 (DESIGN-03) et le Workspace Canvas (DESIGN-04) soutiennent ce parcours de bout en bout.

### Mission 2 — Next Best Action

- Le **MissionDuJour** (déjà intégré via le mission-engine) est LA prochaine meilleure action dans la colonne secondaire du dashboard
- Le **header du dashboard** affiche maintenant UN seul CTA primaire, contextualisé selon le prochain cours : `✨ Préparer {classe}` plutôt que `✨ Préparer une leçon`
- Voir [Next_Best_Action.md](Next_Best_Action.md)

### Mission 3 — Dashboard personnel

Le dashboard répond maintenant "Que dois-je faire aujourd'hui ?" :

- **Sous-titre dynamique** : affiche le prochain cours, les tâches en retard, ou "Tout est à jour"
- **CTA unique contextualisé** : nom de classe si cours à venir
- **Recommandations ScorgIA** : panneau `recommendations[]` débloqué (était fetché mais non affiché)
- Voir [Dashboard_Redesign.md](Dashboard_Redesign.md)

### Mission 4 — Activity Feed premium

L'activité récente passe d'une simple liste plate à un **fil d'activité chronologique** :

- `.tj-feed` + `.tj-feed-item` : timeline verticale avec ligne de connexion entre items
- `.tj-feed-dot` : dot coloré selon la catégorie (IA, succès, document, default)
- `.tj-feed-label` + `.tj-feed-sub` + `.tj-feed-time` : hiérarchie typographique propre
- Voir [ActivityFeed_System.md](ActivityFeed_System.md)

### Mission 5 — Timeline pédagogique

La timeline des cours d'aujourd'hui (section "Aujourd'hui" du dashboard) représente :
- Le passé (cours terminés — dot gris, heure passée)
- Le présent (prochain cours — dot vert avec halo)
- L'avenir (cours à venir — dot violet)

Voir [Timeline_System.md](Timeline_System.md)

### Mission 6 — Langage de statut unifié

Nouveau système CSS `.tj-status--*` partagé :

| Classe | Statut | Couleur |
|--------|--------|---------|
| `.tj-status--todo` | À faire | Gris |
| `.tj-status--active` | En cours | Violet |
| `.tj-status--review` | À valider | Ambre |
| `.tj-status--done` | Terminé | Vert |
| `.tj-status--published` | Publié | Vert foncé |
| `.tj-status--archived` | Archivé | Gris désaturé |

Utilisé dans : dashboard (leçons récentes), extensible à toutes les pages.

### Mission 7 — Documents reliés

Cliquer sur une leçon récente dans le dashboard navigue maintenant vers le **workspace Préparer** avec la classe pré-sélectionnée (`klassia_active_classe` en localStorage), au lieu de naviguer vers la bibliothèque.

Le bouton "Reprendre →" devient **"Continuer →"** (`.tj-doc-link`) — plus intentionnel, plus clair.

### Mission 8 — Actions contextuelles

Les menus existants conservés. La colonne `secTitle` avec "Voir tout →" dans "Reprendre le travail" reste pour accéder à la bibliothèque complète. Les quick actions du workspace (DESIGN-04) complètent ce tableau.

### Mission 9 — Indicateurs silencieux

Nouveau CSS `.tj-silent-dot--*` (error/warning/success/info/muted) disponible pour remplacer des alertes lourdes par des points discrets. Classes prêtes, à intégrer progressivement.

### Mission 10 — Notifications

Architecture existante conservée. Score amélioré via M9 (silent dots disponibles).

### Mission 11 — IA invisible

Les **recommandations** (`/api/recommendations`) sont maintenant affichées dans une section discrète "ScorgIA suggère" — uniquement quand disponibles, jamais intrusif. Titre neutre, pas de "Powered by Claude".

### Mission 12 — Mode Productivité (Sidebar compacte)

**Sidebar compact mode** ajouté :

- Bouton `‹` / `›` en bas de la sidebar
- En mode compact : sidebar `64px` (icônes seulement)
- En mode normal : sidebar `240px`
- `--sidebar-w` mis à jour dynamiquement via `document.documentElement.style.setProperty`
- Mémorisé via `localStorage` clé `sidebar_compact`
- ThemeToggle et AdminToggle masqués en mode compact

### Mission 13 — Audit UX

Voir [Workspace_UX_Audit.md](Workspace_UX_Audit.md) (DESIGN-04) + rapport DESIGN-05 ci-dessous.

---

## Fichiers modifiés

| Fichier | Nature |
|---------|--------|
| `src/app/globals.css` | Section TEACHER JOURNEY DESIGN-05 (~100 lignes) |
| `src/components/Sidebar.tsx` | Compact mode : état, toggle, CSS class, localStorage |
| `src/app/dashboard/page.tsx` | Greeting dynamique, CTA unique, status badges, linked nav, feed premium, recommandations |

---

## Fichiers créés (documentation)

| Fichier | Nature |
|---------|--------|
| `docs/Design/DESIGN-05_Report.md` | Ce rapport |
| `docs/Design/Teacher_Journey.md` | Parcours pédagogique A officiel |
| `docs/Design/Teacher_Experience.md` | Principes de l'expérience enseignant |
| `docs/Design/Next_Best_Action.md` | Système NBA — moteur d'action principale |
| `docs/Design/Dashboard_Redesign.md` | Refonte dashboard personnel |
| `docs/Design/Timeline_System.md` | Système timeline pédagogique |
| `docs/Design/ActivityFeed_System.md` | Système fil d'activité |

---

## Qualité

```
npx tsc --noEmit  →  0 erreur
npm run lint      →  En attente (non exécuté — PO valide d'abord)
npm run build     →  En attente (non exécuté — PO valide d'abord)
```

---

## Ce qui n'a PAS été fait (intentionnel)

| Élément | Raison |
|---------|--------|
| Notification center refonte complète | Nécessiterait de modifier des composants hors périmètre |
| Auto-suggestions IA entre documents | Requiert logique contextuelle cross-page |
| Drag-and-drop dans l'explorateur | Hors roadmap actuelle |
| Réorganisation sidebar items | Déjà optimisée en DESIGN-03 |
| Transitions de page | App Router gère déjà la navigation instantanée |

---

## Verdict Product Owner

**DESIGN-05 : VALIDÉ si le Product Owner confirme :**
- [ ] Le sous-titre du dashboard ("Prochain cours : X à Y") est utile et pertinent
- [ ] Le CTA unique "Préparer {classe}" est plus clair que "Préparer une leçon"
- [ ] Le bouton `‹/›` de la sidebar compact est visible et intuitif
- [ ] En mode compact, la sidebar à 64px libère l'espace document de façon appréciable
- [ ] Les recommandations "ScorgIA suggère" n'apparaissent pas comme intrusives
- [ ] Le fil d'activité premium est plus lisible que l'ancien
- [ ] "Continuer →" sur les leçons récentes navigue correctement vers le workspace
- [ ] Aucune régression fonctionnelle constatée

---

## Voir aussi

- [DESIGN-03_Pedagogical_Navigation.md](DESIGN-03_Pedagogical_Navigation.md)
- [DESIGN-04_Pedagogical_Workspace_Canvas.md](DESIGN-04_Pedagogical_Workspace_Canvas.md)
- [Teacher_Journey.md](Teacher_Journey.md)
- [Next_Best_Action.md](Next_Best_Action.md)
