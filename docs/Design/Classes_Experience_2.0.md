# Classes Experience 2.0
## DS 2.0 DESIGN-08 — Transformer « Mes Classes » en récit pédagogique

**Date :** 2026-08-10  
**Phase :** DESIGN-08 (après DESIGN-07 Build My Year Experience)

---

## Principe

> En moins de trois secondes, un enseignant comprend : où en est cette classe ; ce qui est prêt ; ce qui reste à faire ; quelle est la prochaine action.

Chaque carte de classe raconte son histoire pédagogique. Elle n'affiche pas des données brutes — elle synthétise l'état de la classe sous forme de récit actionnable.

---

## Anatomie d'une carte de classe

```
┌─────────────────────────────────────┐
│▌▌▌▌ (bande couleur 4px)            │
│                                     │
│ [●] Français 3e A          [Année ✓]│
│     Secondaire 3 · Français [···]  │
│                                     │
│ ✓ Curriculum  ✓ Année  ● 12 leçons │
│                                     │
│ ▓▓▓▓▓▓▓░░░░░░  (progression)       │
│                                     │
│ Activité il y a 2 j                 │
│                                     │
│ [        Continuer         ]        │
└─────────────────────────────────────┘
```

### Zones

| Zone | Contenu | Règle |
|------|---------|-------|
| Bande couleur | Couleur choisie à la création | Identifiant visuel immédiat |
| Avatar | Première lettre du nom | Couleur de la classe |
| Nom + sous-titre | Nom · Niveau · Matière | Ellipsis si trop long |
| Pill statut | Année ✓ / Curriculum ✓ / À configurer | Une seule vérité |
| Menu ··· | 5 actions rapides | Fermé par défaut |
| Chips matières | Visible si ≥ 2 matières | Tags violet compact |
| Statut pédagogique | ✓/○ Curriculum, ✓/○ Année, ● leçons, ● quiz | Indicateurs discrets |
| Barre progression | Leçons enseignées / total | 3px, transition 0.6s |
| Dernière activité | Temps relatif ou nb élèves | `updated_at` des leçons |
| CTA unique | Un seul bouton principal | Logique Smart CTA |

---

## Contrôles de la page

### Recherche instantanée (M7)

Filtre client-side (sans appel réseau) sur :
- `cls.nom`
- `cls.matiere`
- `cls.matieres[]` (tableau multi-matières)

Résultat vide : message contextuel « Aucune classe ne correspond à « … » »

### Tri (M6)

| Option | Comportement |
|--------|-------------|
| Récentes | Ordre de création (défaut, `created_at` DESC) |
| Activité | `updated_at` max des leçons, les sans-activité en dernier |
| Progression | `pct` descendant (leçons enseignées / total) |
| Nom | `localeCompare('fr')` alphabétique |

---

## Données affichées

Toutes les données proviennent de l'état déjà chargé — aucun appel réseau supplémentaire.

| Donnée | Source |
|--------|--------|
| Nom, niveau, matière, couleur | `classes` table |
| Curriculum chargé | `cls.curriculum_charge` |
| Teaching Pack | `teaching_packs` table (existence) |
| Leçons | `lecons` table (`classe_id, statut, updated_at`) |
| Fichiers pédagogiques | `fichiers_dossier` via `dossiers_systeme` |
| Quiz | `fichiers_dossier` filtrés `type_fichier === 'quiz'` |
| Dernière activité | Max `updated_at` des leçons de la classe |

---

## Règles d'affichage (M1, M2)

- **Jamais de pourcentage inventé** — la barre de progression reflète uniquement `leçons enseignées / total réel`
- **Si total = 0** — la barre est vide (hauteur 3px, couleur neutre)
- **Dernière activité** — si aucune leçon avec `updated_at`, afficher le nombre d'élèves comme info de contexte
- **Nombre d'élèves** — affiché dans la zone activité quand il n'y a pas d'activité réelle

---

## Voir aussi

- [ClassCard_Guidelines.md](ClassCard_Guidelines.md) — Règles de design des cartes
- [Smart_Class_Summary.md](Smart_Class_Summary.md) — Logique CTA et statut pédagogique
- [DESIGN-08_Report.md](DESIGN-08_Report.md) — Rapport de livraison
