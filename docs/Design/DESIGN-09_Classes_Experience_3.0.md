# DESIGN-09 — Classes Experience 3.0
## DS 2.0 — Transformer « Mes Classes » en produit premium

**Date :** 2026-08-10  
**Phase :** DESIGN-09 (après DESIGN-08 Classes Experience 2.0)

---

## Ambition

> En moins de 3 secondes, l'enseignant répond à 4 questions :
> 1. Quelles sont mes classes ?
> 2. Où en est chaque classe ?
> 3. Laquelle nécessite une action ?
> 4. Où dois-je cliquer ?

Si ces quatre réponses ne sont pas visibles immédiatement, le design est un échec.

Calme · Maîtrise · Élégance · Clarté.

---

## Couleurs (palette stricte)

| Rôle | Valeur |
|------|--------|
| Fond page | `#F8FAFC` |
| Fond carte | `#FFFFFF` |
| Titre | `#111827` |
| Texte | `#6B7280` |
| Métadonnée | `#9CA3AF` |
| Activité texte | `#374151` |
| Accent ScorgIA | `#6D5DF6` |
| Succès | `#10B981` |
| Danger | `#EF4444` |
| Bordure carte | `#E5E7EB` |
| Fond secondaire | `#F3F4F6` |

Maximum 3 couleurs sur une carte.

---

## Typographie (4 niveaux maximum)

| Niveau | Taille | Poids | Rôle |
|--------|--------|-------|------|
| 1 | 18px | 700 | Titre classe |
| 2 | 14px | 500 | Sous-titre (niveau · matière) |
| 3 | 13px | 400 | Métadonnées (nb élèves, activité) |
| 4 | 10px | 400 | Labels timeline |

---

## Espacement (valeurs autorisées)

`8 · 16 · 24 · 28 · 32 · 48`

Jamais de valeurs arbitraires hors de cette liste.

---

## Structure de la page

### Header
```
Mes classes                         [+ Nouvelle classe]
7 classes · Année scolaire 2025-2026
```

### Barre de recherche
- Pleine largeur
- Radius 16px
- Focus ring violet (#6D5DF6)
- SVG search icon discret

### Filtres
```
[Tous]  [À faire]  [En cours]  [Terminés]
```
- Actif : fond `#6D5DF6`, texte blanc
- Inactif : fond blanc, bordure `#E5E7EB`, texte `#6B7280`
- Logique filtre :
  - À faire = `!pack && !curriculum_charge`
  - En cours = `(pack || curriculum_charge) && pct < 100`
  - Terminés = `pct === 100`

### Tri
```
Récentes  Activité  Progression  Nom
```
- Tab actif : `background: #F3F4F6; font-weight: 600`
- Inactif : transparent, `#9CA3AF`

### Grille
- 3 colonnes desktop (> 1280px)
- 2 colonnes laptop (720px–1280px)
- 1 colonne mobile (< 720px)
- Gap : 24px

---

## Anatomie d'une carte

```
┌──────────────────────────────────────────────────┐
│                                            [···] │  ← menu (caché)
│                                                  │
│  Mathématiques G9          ← titre 18px 700      │
│  Secondaire · 9e année     ← niveau 14px 500     │
│  28 élèves                 ← count 13px gris     │
│                                                  │
│  ●────●────●────○────○                           │
│  Curriculum Année Séq. Leçons Quiz               │
│                                                  │
│  DERNIÈRE ACTIVITÉ                               │
│  Leçon modifiée            Il y a 18 min         │
│                                                  │
│ ┌─────────────────────────────────────────────┐  │
│ │              Continuer →                    │  │
│ └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### Spécifications

| Propriété | Valeur |
|-----------|--------|
| Border-radius | 22px |
| Padding | 28px |
| Fond | #fff |
| Bordure | 1px solid #E5E7EB |
| Hover translateY | -4px |
| Hover shadow | 0 12px 40px rgba(17,24,39,0.09) |
| Transition | 0.18s ease |

---

## Timeline pédagogique

La timeline est le cœur informatif de la carte.

### 5 étapes ordonnées

```
●────●────●────○────○
Curriculum  Année  Séquences  Leçons  Quiz
```

| Symbole | Signification | CSS |
|---------|---------------|-----|
| ● violet `#6D5DF6` | Étape terminée | `c9-tl-dot--done` |
| ○ gris `#E5E7EB` | Étape non commencée | `c9-tl-dot--empty` |

### Connectors (lignes entre points)

- Dot-to-Dot tous deux terminés → `#6D5DF6` (violet plein)
- Dot terminé → Dot suivant non commencé → gradient violet→gris (`c9-tl-line--partial`)
- Dot non commencé → `#E5E7EB` (gris)

### Logique de remplissage

| Étape | Donnée source |
|-------|---------------|
| Curriculum | `cls.curriculum_charge` |
| Année | `packsByClass[cls.id]` existe |
| Séquences | `packsByClass[cls.id]` existe (générées avec le pack) |
| Leçons | `totalLecons > 0` |
| Quiz | `fichiersQuiz.length > 0` |

---

## Smart CTA (une seule action)

| Condition | Label | Style |
|-----------|-------|-------|
| `!pack && !curriculum_charge` | Construire | `c9-cta--dark` (#111827) |
| `totalLecons > 0` | Continuer | `c9-cta--primary` (#6D5DF6) |
| `pack` existe | Ouvrir | `c9-cta--secondary` (#F3F4F6) |
| Sinon | Préparer | `c9-cta--secondary` (#F3F4F6) |

**Animation :** au hover de la carte, le CTA `translateX(4px)` — glissement subtil vers la droite.

---

## Menu rapide (caché)

- Invisible par défaut (`opacity: 0; pointer-events: none`)
- Visible uniquement au hover de la carte (CSS `:hover` combinator)
- Reste visible si `activeMenu === cls.id`
- Se ferme sur clic extérieur (window `click` listener)

### Items

1. Renommer → `/dashboard/classes/[id]`
2. Préparer une leçon → workspace
3. Enseigner → `/dashboard/gerer/enseigner?classe=[id]`
4. Programme annuel → `/dashboard/classes/[id]/programme`
5. (séparateur)
6. Archiver → `/dashboard/classes/[id]` (stub — logique à venir)

---

## Accessibilité

- `role="article"` sur chaque carte
- `aria-label="Classe {nom}"` sur chaque carte
- `tabIndex={0}` + `onKeyDown Enter` pour navigation clavier
- `aria-pressed` sur les filtres
- `aria-label`, `aria-expanded` sur le menu
- `role="menu"`, `role="menuitem"` dans le dropdown
- Contraste WCAG AA : tous les textes sur fond blanc

---

## Règles absolues

- Jamais deux CTA visibles simultanément
- Jamais de pourcentage fictif ou inventé
- Jamais d'emoji dans les cartes
- Jamais plus de 3 couleurs sur une carte
- Jamais d'information affichée deux fois
- Jamais de bordure colorée sur les cartes

---

## Voir aussi

- [DESIGN-09_Report.md](DESIGN-09_Report.md)
- [ClassCard_Guidelines.md](ClassCard_Guidelines.md)
- [Smart_Class_Summary.md](Smart_Class_Summary.md)
