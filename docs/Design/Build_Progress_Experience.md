# Build Progress Experience
## Écran de progression — DS 2.0 DESIGN-07 M8

**Date :** 2026-08-10
**Composant :** `BuildProgressView` in `BuildMyYearWizard.tsx`

---

## Concept

> La progression reste toujours visible. Jamais d'écran blanc. Jamais de spinner géant.

La construction de l'année scolaire est visible en temps réel grâce à une timeline verticale basée uniquement sur les checkpoints persistés en base.

---

## Structure visuelle

```
Votre année prend forme.
Mathématiques · G9

● Curriculum          ← en cours (animated)
  Analyse du curriculum...

○ Syllabus            ← en attente
○ Plan annuel
○ Séquences
○ Plans de leçon
○ Première leçon
○ Quiz

[chips live preview : "6 séquences structurées"]
```

---

## États des checkpoints

| Statut pipeline | Icône | CSS class |
|----------------|-------|-----------|
| `en_attente`   | ○ (invisible) | `d7-tl-dot--pending` |
| `en_cours`     | ● (violet animé) | `d7-tl-dot--active` |
| `termine`      | ✓ (vert) | `d7-tl-dot--done` |
| `erreur`       | ✕ (rouge) | `d7-tl-dot--error` |

---

## Checkpoints visibles

```typescript
const VISIBLE_CHECKPOINTS = [
  { step: 'curriculum',       label: 'Curriculum' },
  { step: 'syllabus',         label: 'Syllabus' },
  { step: 'programme_annuel', label: 'Plan annuel' },
  { step: 'sequences',        label: 'Séquences' },
  { step: 'plans_lecon',      label: 'Plans de leçon' },
  { step: 'premiere_lecon',   label: 'Première leçon' },
  { step: 'quiz',             label: 'Quiz' },
]
```

Les étapes internes (`validation`, `sauvegarde`, `indexation`) ne sont jamais affichées.

---

## Live Preview (M9)

Les chips verts apparaissent quand des données sont disponibles dans les events :

```typescript
const m = sequencesEvent.message.match(/(\d+)\s+séquence/i)
if (m) liveChips.push(`${m[1]} séquences structurées`)
```

Si l'event ne contient pas de nombre, le chip n'apparaît pas — pas de données fictives.

---

## Règles M10

- Interdiction : spinner plein écran, animation IA décorative, écran blanc
- La liste des checkpoints reste visible en permanence pendant la génération
- Le sous-titre mentionne uniquement le temps estimé (1 à 2 minutes)

---

## CSS Design-07

```css
.d7-build-title   /* Titre principal 22px 800 */
.d7-build-sub     /* Sous-titre 13px secondary */
.d7-timeline      /* Container timeline */
.d7-timeline-item /* Ligne avec connecteur */
.d7-tl-dot        /* Cercle 20px */
.d7-tl-content    /* Zone texte */
.d7-live-preview  /* Chips verts */
.d7-live-chip     /* Un chip vert */
```

---

## État succès (M13)

Quand `termineEvent` existe :

```
Votre année est prête.
Mathématiques · G9

✓ Curriculum
✓ Syllabus
✓ Plan annuel
✓ Séquences
✓ Plans de leçon
✓ Première leçon
✓ Quiz

[Ouvrir mon année →]
```

Le CTA "Ouvrir mon année →" appelle `onOpenWorkspace()`.
