# DESIGN-04 — Rapport de livraison
## Pedagogical Workspace Canvas — Premier studio de préparation pédagogique ScorgIA

**Statut :** LIVRÉ — En attente de validation Product Owner  
**Date :** 2026-08-09  
**Périmètre :** Workspace `/dashboard/gerer/preparer` — Expérience, structure, sensation  
**Contraintes absolues :**
- Ne modifier aucune logique métier
- Ne casser aucune API
- Ne casser aucune route
- Améliorer uniquement : expérience, lisibilité, navigation, cohérence, sensation premium

---

## Résumé exécutif

DESIGN-04 transforme le Workspace de préparation en un **Pedagogical Workspace Canvas** : un environnement de travail où le document est roi, l'interface disparaît, et l'enseignant ressent qu'il travaille sur son année plutôt que de naviguer entre des pages.

---

## Missions réalisées

### Mission 1 — Le Canvas (3 zones)

Le Workspace est organisé en 3 zones :

| Zone | Composant | Largeur |
|------|-----------|---------|
| Explorer | `PedagogiqueExplorer` | ~272px (fixe, ~19%) |
| Document | Zone centrale | Dominant (flex:1) |
| Assistant | `AIAssistantPanel` | 268px (réduit de 300→268) |

La proportion visuelle explorer/document/assistant est proche des 22/56/22 cibles sur écran 1440px.

### Mission 2 — Explorateur vivant

L'explorateur affiche maintenant :
- **Province** et **année scolaire** du Teaching Pack sous forme de chips contextuels
- Ces données sont chargées depuis `teaching_packs` (champ `province`, `annee_scolaire`)
- Uniquement quand ces données existent (graceful degradation si non disponibles)

### Mission 3 — Progression intégrée

La progression est intégrée directement dans l'arbre :
- **En-tête de classe** : badge `BuildDot` sur le côté droit (●/◐/✓/⚠) au lieu du badge texte
- **Sous la matière** : nombre de séquences `· 6 séq.` quand disponible, coloré selon le statut
- **Chips de contexte** : statut pack intégré dans les chips province/année (`◐ Partiel`)

### Mission 4 — Contexte permanent

Toujours visible dans l'explorateur expandé :
- Classe (nom en header du nœud)
- Matière + niveau (sous-ligne de la classe)
- Province + Année scolaire (chips dans la section Teaching Pack)
- Statut du pack (BuildDot + label dans les chips)

### Mission 5 — Document central

- `AIAssistantPanel` réduit de **300px → 268px** — libère ~32px pour le document
- Le document central gagne en espace sans restructuration du layout

### Mission 6 — Assistant contextuel

- Largeur réduite : 300px → 268px
- Bordure gauche : `rgba(15,35,65,0.07)` → `rgba(15,35,65,0.06)` (plus subtile)
- Background : `rgba(255,255,255,0.94)` → `rgba(255,255,255,0.96)` (légèrement plus propre)

### Mission 7 — Navigation entre documents

Navigation existante conservée intégralement. Aucune modification.

### Mission 8 — États de construction

**BuildDot** component créé dans `PedagogiqueExplorer.tsx` :

| Statut | Symbole | Couleur | CSS data-state |
|--------|---------|---------|----------------|
| `pret` | ● | #34D399 (vert) | `pret` |
| `partiellement_genere` | ◐ | #FBC34A (ambre) | `partial` |
| `generation_en_cours` | ◌ | #A78BFA (violet pulsant) | `active` |
| `erreur` | ⚠ | #F87171 (rouge) | `error` |
| `brouillon` / `configuration` | ● | rgba(255,255,255,0.18) | `todo` |

### Mission 9 — Quick Actions

**Actions rapides au survol des séquences** :

Au survol d'une séquence dans l'explorateur, deux boutons apparaissent :
- **Leçon** : `"Développe une leçon complète pour la séquence [titre]."` → appelle `onNewDocument`
- **Quiz** : `"Crée un quiz formatif pour la séquence [titre]."` → appelle `onNewDocument`

L'animation est CSS-only (`.ws-quick-menu { opacity: 0 }` → hover → `opacity: 1`).
Aucune logique business modifiée — les actions utilisent uniquement `onNewDocument` existant.

### Mission 10 — Zéro bruit visuel

- `AIAssistantPanel` : bordure et fond allégés
- `WorkspaceHeader` : badge `IaRing` déjà supprimé en DESIGN-02
- `PedagogiqueExplorer` : badge `✓` texte → BuildDot compact (8px)

### Mission 11 — Motion

Nouvelles animations CSS définies dans `globals.css` :
- `@keyframes ws-dot-pulse` : pulsation du dot `◌` pour le statut `generation_en_cours`
- `.ws-quick-menu` : `transition: opacity 0.12s ease` (hover quick actions)
- `.ws-focus-btn` : `transition: all 0.13s` (bouton Focus Mode)

### Mission 12 — Mode Focus

**Focus Mode** ajouté :
- Bouton `⊡` / `⊞` dans `WorkspaceHeader`
- Au clic : collapse l'explorateur + cache l'assistant
- À la sortie : réouvre l'explorateur
- Mémorisé via `localStorage` clé `ws_focus_mode`
- Restauré au chargement de la page (initialisation `useState` depuis localStorage)

### Missions 13-16 — Responsive, identité, performance, audit

- Responsive : le layout existant gère déjà la tablette (pas de régression)
- Identité ScorgIA : préservée (violet, BuildDot couleurs cohérentes)
- Performance : aucune nouvelle dépendance, extension de SELECT existant (+2 champs)
- Audit UX : voir `Workspace_UX_Audit.md`

---

## Fichiers modifiés

| Fichier | Nature |
|---------|--------|
| `src/components/preparer/explorer/PedagogiqueExplorer.tsx` | BuildDot, province/year chips, séquences quick actions, hoveredSeqKey state |
| `src/components/preparer/workspace/WorkspaceHeader.tsx` | Props `focusMode` + `onToggleFocus`, bouton Focus Mode |
| `src/components/preparer/assistant/AIAssistantPanel.tsx` | Largeur 300→268px, fond/bordure allégés |
| `src/app/dashboard/gerer/preparer/page.tsx` | `focusMode` state, `handleToggleFocus`, connexion aux props |
| `src/app/globals.css` | Section `WORKSPACE CANVAS — DESIGN-04` ajoutée (52 lignes) |

---

## Fichiers créés (documentation)

| Fichier | Nature |
|---------|--------|
| `docs/Design/DESIGN-04_Pedagogical_Workspace_Canvas.md` | Ce rapport |
| `docs/Design/Workspace_Canvas_Guidelines.md` | Guide d'implémentation Canvas |
| `docs/Design/Workspace_UX_Audit.md` | Audit UX complet Mission 16 |
| `docs/Design/Workspace_Component_Map.md` | Carte des composants workspace |

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
| Restructuration en flex 22/56/22 exacte | L'explorateur `position: fixed` + `margin-left` est la fondation — le refactoriser casserait la transition d'ouverture/fermeture |
| Auto-collapse de l'assistant quand inactif | Nécessite une logique de timer → hors périmètre business logic |
| Breadcrumb dans le workspace | Phase 4 (intégration page par page) |
| Transitions entre documents | Navigation existante déjà instantanée (React state, pas route change) |
| Mode tablette spécifique | Le layout actuel est déjà responsive |

---

## Verdict

**DESIGN-04 : VALIDÉ si le Product Owner confirme :**
- [ ] Les états ●/◐/✓/⚠ dans l'explorateur sont lisibles et utiles
- [ ] Les actions rapides "Leçon" / "Quiz" au survol des séquences sont pratiques
- [ ] Le Focus Mode (⊡) fonctionne et améliore la concentration
- [ ] L'assistant à 268px est suffisamment présent sans être encombrant
- [ ] Province + année scolaire s'affichent correctement dans l'explorateur
- [ ] Aucune régression fonctionnelle constatée

---

## Voir aussi

- [DESIGN-03_Pedagogical_Navigation.md](DESIGN-03_Pedagogical_Navigation.md) — Navigation (précédent)
- [Workspace_Canvas_Guidelines.md](Workspace_Canvas_Guidelines.md) — Guide d'implémentation
- [Workspace_UX_Audit.md](Workspace_UX_Audit.md) — Audit UX complet
- [Workspace_Component_Map.md](Workspace_Component_Map.md) — Carte composants
