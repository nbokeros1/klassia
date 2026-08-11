# DESIGN-14 — Workspace V4 : The Pedagogical Studio

> Référence fichier livrable : `DESIGN-12_Workspace_V4.md` (selon nomenclature PO)
> Numéro interne : DESIGN-14 (suite de DESIGN-13 livré le 2026-08-10)
> Statut : **En attente de validation Product Owner**

---

## Mission

Transformer le Workspace "Préparer" en le meilleur environnement de préparation pédagogique qui existe.

Ce n'est pas un chatbot. Ce n'est pas un éditeur Word.
C'est un studio de travail pédagogique.

Inspirations : **Linear · Notion · Figma · Framer · VS Code**

---

## Périmètre

| Type de changement | Autorisé |
|---|---|
| JSX / render | ✅ |
| CSS / classes c14-* | ✅ |
| Layout / structure | ✅ |
| Animations / transitions | ✅ |
| Composants visuels | ✅ |
| Logique métier | ❌ |
| Routes API | ❌ |
| Supabase / base de données | ❌ |
| Streaming SSE | ❌ (conservé tel quel) |

---

## Layout

Trois colonnes fixes, toujours visibles.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Explorateur 20%  │         Document 60%          │  Copilote 20%  │
│                   │                               │               │
│  (dark sidebar)   │  (fond blanc, max 900px)      │  (action btns) │
│                   │                               │               │
└─────────────────────────────────────────────────────────────────────┘
```

**Calcul des largeurs :**
- Explorateur : `minWidth: 240px; width: 20%`
- Document : `flex: 1`
- Copilote : `minWidth: 220px; width: 20%`

Mode Focus : Explorer + Copilote disparaissent → Document 100%.

---

## 1. Explorateur Pédagogique

### Arborescence (ordre de navigation)

```
📁 Classe
  └── 📚 Teaching Pack
        ├── 📘 Curriculum
        ├── 📋 Syllabus
        ├── 📅 Plan annuel
        ├── 🗂️ Séquences
        │     ├── Séquence 1
        │     ├── Séquence 2
        │     └── ...
        ├── 📖 Leçons
        ├── 🎮 Quiz
        ├── 📎 Ressources
        └── 🗃️ Archives
```

### Chaque dossier affiche

- Compteur de documents (`3`)
- État (`✓ Prêt` / `◐ Partiel` / `○ Vide`)
- Dernière modification (`Hier` / `il y a 3j`)

### Style VS Code

- Fond dark : `#0F1728`
- Aucun élément décoratif
- Hover très discret
- Chevron `▸` / `▾` pour expand/collapse
- Ligne active : `border-left: 2px solid #6D5DF6`

---

## 2. Zone Document

### Dimensions

- `max-width: 900px`
- `margin: 0 auto`
- `padding: 56px 72px`
- `background: #FFFFFF`

### Header discret (au-dessus du contenu)

```
[Titre du document]           [Brouillon ▾]
Dernière sauvegarde il y a 2 min
```

- Titre : `font-size: 28px; font-weight: 700; letter-spacing: -0.02em`
- Statut : badge pill `Brouillon` (gris) ou `Validé` (vert)
- Pas de bordure sous le header

### Typographie corps (Notion-like)

- `font-size: 15px`
- `line-height: 1.9`
- `color: #1E293B`
- Titres `h2` : `font-size: 20px; font-weight: 700; margin-top: 32px`
- Titres `h3` : `font-size: 16px; font-weight: 600; margin-top: 24px`

### Pendant le streaming

- Le texte apparaît directement dans la zone document
- L'utilisateur peut lire, copier, sélectionner, faire défiler
- Aucun masquage, aucun overlay
- Indicateur : fine barre violette pulsante en bas du texte en cours (`|`)

---

## 3. Copilote — Palette d'actions

Le panneau droit n'est pas un chat. C'est une palette d'actions.

### Actions primaires (selon docType actif)

| Icône | Action | Prompt FR |
|---|---|---|
| 📝 | Créer activité | Crée une activité pédagogique basée sur ce document. |
| 🎮 | Créer quiz | Crée un quiz formatif de 5 questions. |
| 📊 | Créer évaluation | Crée une évaluation sommative avec grille. |
| 🌈 | Différencier | Propose des adaptations différenciées. |
| 🔽 | Simplifier | Simplifie ce contenu pour les élèves en difficulté. |
| ♿ | Adapter EHDAA | Adapte pour les élèves à besoins particuliers. |
| 📋 | Créer devoir | Crée un devoir à envoyer aux élèves. |
| 🏗️ | Créer projet | Crée un projet de longue haleine. |
| 📐 | Créer grille | Génère une grille d'évaluation détaillée. |
| 📥 | Exporter | → Word / PowerPoint / Imprimer |

### Style

- Boutons pleins largeur, 40px de hauteur
- Séparateurs discrets entre groupes
- Hover : `border-color: #6D5DF6; background: #EDE9FE`
- Désactivé pendant streaming : `opacity: 0.4`

---

## 4. Barre d'outils (header de la zone document)

Réduire au minimum strict.

```
[Classe ▾]  [Matière]               [✓ Sauvegarder]  [Valider]  [Word]  [⋯]
```

Le bouton `⋯` ouvre un dropdown avec : PowerPoint, Imprimer, Inspecteur, Effacer.

---

## 5. Historique (Timeline discrète)

Afficher dans le panneau copilote (section "Historique"), pas dans le document.

```
● 09:22  Création du document
● 09:31  Objectifs mis à jour
● 09:45  Section Différenciation
● 10:02  Quiz ajouté
```

- Dérivé des timestamps des messages IA existants
- Pas un chat, pas de bulles
- `font-size: 11px; color: #94A3B8`
- Point violet `●` pour chaque événement

---

## 6. Versioning

Afficher dans le panneau copilote (section "Versions").

```
Version 3  (actuelle)
Version 2  [Restaurer]
Version 1  [Restaurer]
```

- Chaque version = chaque message IA passé ayant produit du contenu
- Bouton "Restaurer" : affiche le contenu de la version (display-only, pas de sauvegarde auto)
- `font-size: 11px`

---

## 7. Mode Focus

Bouton dans la barre d'outils : `⊡ Concentration`

Quand activé :
- Explorateur : `display: none` + transition `opacity: 0; width: 0`
- Copilote : `display: none` + même transition
- Document : `width: 100%`
- Bouton devient `⊞ Quitter` (position: fixed, top-right)

---

## 8. Micro-interactions

| Élément | Animation |
|---|---|
| Hover bouton | `150ms ease` |
| Apparition panneau | `slide 180ms cubic-bezier(0.4,0,0.2,1)` |
| Fold/unfold arborescence | `180ms ease` |
| Streaming cursor | `1s ease-in-out infinite` (pulsation) |
| Action chip apparition | `fade 150ms ease` |
| Toast / badge | `fade 200ms ease` |

---

## 9. Design Tokens (c14-*)

```css
--c14-bg:        #F8FAFC;
--c14-doc-bg:    #FFFFFF;
--c14-accent:    #6D5DF6;
--c14-radius:    18px;
--c14-padding:   24px;
--c14-text-1:    #0F172A;
--c14-text-2:    #1E293B;
--c14-text-3:    #64748B;
--c14-text-4:    #94A3B8;
--c14-border:    #EAECF0;
```

---

## 10. Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/app/globals.css` | Ajout section `c14-*` |
| `src/components/preparer/explorer/PedagogiqueExplorer.tsx` | Arborescence enrichie, style VS Code |
| `src/components/preparer/workspace/WorkspaceLayout.tsx` | Layout 20/60/20% |
| `src/components/preparer/workspace/WorkspaceHeader.tsx` | Toolbar minimal, bouton Focus |
| `src/components/preparer/assistant/AIAssistantPanel.tsx` | 10 actions + Historique + Versions |
| `src/app/dashboard/gerer/preparer/page.tsx` | Document header, versioning state, timeline |

---

## 11. Interdictions absolues

- Ne jamais transformer le Workspace en chatbot
- Ne jamais afficher de longues conversations IA
- Ne jamais afficher des cartes statistiques
- Ne jamais ajouter des messages décoratifs
- Ne jamais multiplier les boutons

---

## 12. Critères de validation

- `npx tsc --noEmit` → 0 erreur
- `npm run build` → succès
- Les 3 colonnes sont toujours visibles
- Le texte IA apparaît directement dans le document pendant le streaming
- Le mode Focus masque Explorer et Copilote en 180ms
- La palette d'actions du Copilote affiche les 9 actions
- L'historique affiche les timestamps sans bulles de chat

---

**En attente de validation Product Owner avant implémentation.**
