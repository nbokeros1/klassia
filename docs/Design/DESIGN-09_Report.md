# DESIGN-09 Report
## Classes Experience 3.0 — Bilan d'implémentation

**Date :** 2026-08-10  
**Version Design System :** 2.0  
**Phase :** DESIGN-09 (refonte complète de DESIGN-08)

---

## Résumé exécutif

DESIGN-09 remplace DESIGN-08 par une expérience radicalement plus sobre et premium. La page "Mes Classes" passe d'un dashboard chargé à un espace de clarté immédiate — inspiré de Linear, Stripe Dashboard, et Apple Business. Aucune logique métier n'a été modifiée.

---

## Choix UX

### 1. Réponses aux 4 questions en < 3 secondes

Chaque carte répond immédiatement à :
- *Quelles sont mes classes ?* — Titre 18px/700, visible en premier
- *Où en est cette classe ?* — Timeline 5 étapes avec états visuels
- *Laquelle nécessite une action ?* — CTA unique, couleur signifiante
- *Où dois-je cliquer ?* — Un seul bouton par carte, toujours au bas

### 2. Filtres catégoriels plutôt que sort-only

DESIGN-08 n'avait que du tri. DESIGN-09 ajoute des filtres : Tous / À faire / En cours / Terminés. L'enseignant peut immédiatement isoler les classes qui nécessitent son attention sans scanner toute la grille.

### 3. Timeline pédagogique plutôt qu'indicateurs discrets

DESIGN-08 montrait `✓ Curriculum ○ Année ● 12 leçons` — des indicateurs en ligne. DESIGN-09 remplace par une vraie timeline horizontale `●────●────○────○────○`. Elle communique la **progression séquentielle** plutôt qu'une liste de statuts indépendants. L'enseignant voit immédiatement *où il en est dans le parcours pédagogique*, pas seulement *ce qui est fait*.

### 4. Menu caché au lieu de menu toujours visible

DESIGN-08 avait un bouton `···` toujours visible. DESIGN-09 le cache jusqu'au hover — conformément aux conventions des meilleurs outils SaaS (Linear, Notion). Résultat : les cartes sont plus propres au repos et le menu apparaît naturellement quand l'utilisateur interagit.

### 5. Fond de page `#F8FAFC` plutôt que blanc

Le fond légèrement gris (`#F8FAFC`) fait ressortir les cartes blanches (`#FFFFFF`) sans contraste agressif. C'est la convention d'Apple et de Linear pour créer de la profondeur sans shadow heavy.

---

## Choix UI

### Palette stricte (max 3 couleurs par carte)

Titre (`#111827`) + Texte (`#6B7280`) + Accent (`#6D5DF6`). Jamais plus. La couleur est réservée à l'action et à la progression — pas à la décoration.

### Radius 22px — plus grand que DESIGN-08

DESIGN-08 utilisait `var(--radius-lg)`. DESIGN-09 fixe 22px explicitement. Un radius plus généreux crée une perception de douceur et de modernité — cohérent avec les standards 2026 (iOS 17+, macOS 14+, Linear, Arc).

### CTA slide 4px à droite

Au hover de la carte, le CTA `translateX(4px)`. Ce micro-mouvement crée une invitation à l'action sans animation agressive. L'utilisateur sent que le bouton "répond" à son intention de cliquer.

### Timeline — 2 rangées (dots + labels séparées)

La rangée des points et la rangée des labels sont des éléments DOM séparés. Cela permet :
- Un alignement parfait des points (flex avec connectors)
- Une distribution `justify-content: space-between` des labels
- Des transitions CSS indépendantes pour les points et les lignes

---

## Composants (CSS `c9-*`)

| Classe | Rôle |
|--------|------|
| `.c9-page` | Conteneur page (padding 32/48) |
| `.c9-page-header` | Flex header titre + CTA |
| `.c9-toolbar` | Conteneur search + filtres |
| `.c9-search-wrap` | Barre de recherche full-width |
| `.c9-search-input` | Input sans style natif |
| `.c9-controls-row` | Flex filtres + sort |
| `.c9-filter-bar` / `.c9-filter-chip` | Chips filtre |
| `.c9-filter-chip--active` | État actif (violet) |
| `.c9-sort-wrap` / `.c9-sort-btn` | Tabs de tri |
| `.c9-sort-btn--active` | Tab actif |
| `.c9-grid` | Grille 3/2/1 cols |
| `.c9-card` | Carte (border, radius, flex-col) |
| `.c9-card-header` | Zone titre |
| `.c9-card-title` / `.c9-card-level` / `.c9-card-count` | Hiérarchie texte |
| `.c9-timeline` / `.c9-tl-dots` / `.c9-tl-labels` | Timeline |
| `.c9-tl-dot--done` / `--empty` | État point |
| `.c9-tl-line--done` / `--partial` / `--empty` | État connecteur |
| `.c9-tl-lbl` / `.c9-tl-lbl--done` | Label timeline |
| `.c9-activity` / `.c9-activity-label` / `.c9-activity-row` | Zone activité |
| `.c9-cta` / `--primary` / `--dark` / `--secondary` | CTA variants |
| `.c9-menu-wrap` / `.c9-menu-btn` | Menu caché |
| `.c9-menu-active` | Force visibilité menu |
| `.c9-menu-dropdown` / `.c9-menu-item` | Dropdown |
| `.c9-menu-item--danger` | Item destructeur |
| `.c9-menu-sep` | Séparateur |
| `.c9-empty` / `.c9-empty-title` / `.c9-empty-sub` | États vides |

---

## Ce qui a été supprimé de DESIGN-08

| Élément | Raison |
|---------|--------|
| Bande couleur (4px top) | Bruit visuel sans sens pédagogique |
| Avatar lettre (38×38px) | Redondant avec le titre |
| Pills `Année ✓` / `Curriculum ✓` / `À configurer` | Remplacés par la timeline |
| Indicateurs `✓/○/●` en ligne | Remplacés par la timeline |
| Barre de progression 3px | La timeline communique mieux la progression |
| Tri intégré aux contrôles | Déplacé dans toolbar |
| `c8-*` CSS utilisé dans la page | Remplacé par `c9-*` |

---

## Améliorations futures

1. **Activité descriptive** — afficher le vrai intitulé de la dernière leçon modifiée (ex. "Leçon 4 — Introduction aux fractions") plutôt que "Leçon modifiée". Nécessite un champ `titre` dans la table `lecons`.

2. **Compteur de filtre** — afficher `À faire (3)` sur les chips pour que l'enseignant comprenne la distribution avant de filtrer.

3. **Animation de progression timeline** — animer les dots et connectors au montage de la page (delay progressif sur chaque étape).

4. **Drag-and-drop** — réordonner les classes manuellement. Nécessite un champ `position` dans la table `classes`.

5. **Actions menu complètes** — Dupliquer, Archiver, Exporter, Supprimer avec logique métier réelle.

6. **Pagination / infinite scroll** — pour les enseignants avec > 20 classes.

---

## TypeScript + Build

```
npx tsc --noEmit → 0 erreur
npm run build    → succès, 0 erreur, aucune page dégradée
```

---

## Logique métier préservée

Aucune des lignes suivantes n'a été modifiée :
- Requêtes Supabase (auth, classes, lecons, fichiers_dossier, teaching_packs)
- `handleCreate` — création de classe avec RPC matières
- `peutCreerClasse` — gating forfait
- `CadenasForFait` — component gating
- `TagInput` — saisie multi-matières
- Formulaire de création (champs, validation, couleurs)

---

## Voir aussi

- [DESIGN-09_Classes_Experience_3.0.md](DESIGN-09_Classes_Experience_3.0.md)
- [ClassCard_Guidelines.md](ClassCard_Guidelines.md)
- [Design_Decisions.md](Design_Decisions.md) — DD-023 à DD-025
