# Teacher_Experience.md
## Principes de l'expérience enseignant — ScorgIA DS 2.0

**Date :** 2026-08-10  
**Référence :** DESIGN-05

---

## Le héros, c'est l'enseignant

> Le document est son projet. L'année scolaire est son parcours. L'IA reste invisible.

ScorgIA ne cherche pas à impressionner l'enseignant avec de la technologie. Il cherche à disparaître dans son flux de travail.

---

## Les 5 Principes Cardinaux

### 1. Une question par écran

Chaque écran doit répondre à une seule question. L'enseignant comprend en moins de 5 secondes ce qu'il peut faire.

**Application :**
- Dashboard → "Que dois-je faire aujourd'hui ?"
- Workspace → "Sur quoi est-ce que je travaille ?"
- Explorer → "Où en suis-je dans mon année ?"
- Assistant → "Qu'est-ce que l'IA peut faire pour moi maintenant ?"

### 2. Le logiciel guide, jamais l'enseignant ne cherche

L'action suivante est toujours visible. L'enseignant ne doit jamais se demander "et maintenant ?".

**Application :**
- CTA contextualisé en header (cours du jour → "Préparer {classe}")
- MissionDuJour comme boussole principale
- BuildDots comme indicateurs d'avancement permanents
- Quick actions au hover des séquences

### 3. Respiration et espace

L'espacement est généreux. Le bruit visuel est minimal. Le document respire.

**Application :**
- Sidebar compact mode (64px) quand l'enseignant veut se concentrer
- Focus Mode dans le workspace (DESIGN-04)
- Assistant à 268px (discret, pas dominant)
- Status dots (8px) plutôt que badges larges

### 4. Premium sans opulence

L'élégance est minimaliste. Jamais ostentatoire.

**Toléré :**
- Animations CSS légères (ws-dot-pulse, fade-in)
- Gradient subtil dans la sidebar
- Bordure violette fine (3px) sur Next Best Action

**Refusé :**
- Grosses alertes colorées
- Notifications non sollicitées
- "Powered by Claude" ou autres références à l'IA
- Badges géants ou compteurs fictifs

### 5. L'IA propose, jamais elle n'impose

L'IA est un assistant discret. Si elle n'a rien d'utile à dire, elle disparaît.

**Application :**
- Recommandations affichées uniquement si `recommendations.length > 0`
- Quick actions via prompt → l'enseignant contrôle toujours l'envoi
- Pas d'envoi automatique de génération IA

---

## Hiérarchie narrative

```
Contexte (qui, quoi, où)
    ↓
Titre (écran actuel)
    ↓
Progression (BuildDot, statut, étape)
    ↓
Action principale (UNE seule)
    ↓
Contenu
    ↓
Actions secondaires
```

---

## Le parcours émotionnel cible

| Moment | Émotion souhaitée | Ce qui la produit |
|--------|------------------|--------------------|
| Ouverture du dashboard | "Je sais exactement quoi faire" | Sous-titre dynamique + CTA contextualisé |
| Entrée dans le workspace | "Je suis dans mon studio" | Canvas 3 zones, explorateur vivant |
| Survol d'une séquence | "Une action naturelle s'offre à moi" | Quick actions au hover |
| Génération IA terminée | "C'est exactement ce que je voulais" | Document premium, export 1 clic |
| Fin de journée | "Mon travail avance" | Activity feed, BuildDots verts |

---

## Ce qui ne doit jamais arriver

| Scénario interdit | Solution |
|------------------|---------|
| L'enseignant voit "0/20 générations" | Donnée fictive supprimée (DESIGN-02) |
| L'enseignant clique "Reprendre" et arrive sur une page générique | Navigation classe pré-sélectionnée (DESIGN-05) |
| L'enseignant cherche comment créer un quiz | Quick action "Quiz" au hover (DESIGN-04) |
| L'enseignant ne sait pas où il en est | BuildDots permanents (DESIGN-04) |
| L'enseignant doit choisir entre 3 CTA identiques | CTA unique par écran (DESIGN-05) |
| La sidebar prend 30% de l'écran | Mode compact 64px (DESIGN-05) |

---

## Métriques d'expérience cibles

| Métrique | Avant DESIGN-05 | Cible |
|----------|----------------|-------|
| Clics pour atteindre le workspace depuis dashboard | 2 | 1 (CTA direct) |
| Clics pour créer une leçon depuis une séquence | 4+ | 1 (quick action hover) |
| Temps pour comprendre l'avancement du plan annuel | ~15s | <3s (BuildDots) |
| Surface document sur 1440px | ~900px | ~1176px (compact sidebar) |
| Éléments de bruit visuel supprimés (cumulé DESIGN-02→05) | — | ~38% |

---

## DESIGN-06 — Principes de visibilité IA

Ajout de la philosophie "Invisible Intelligence" :

### L'IA comme arrière-plan

L'enseignant ne doit jamais penser "cette plateforme utilise beaucoup d'IA." Il doit penser "cette plateforme comprend ce dont j'ai besoin."

**AI Visibility Levels :**

| Level | Nom | Déclencheur | Exemples |
|-------|-----|-------------|---------|
| 0 | Invisible | Automatique — aucune valeur visible | Indexation, calcul recommandations |
| 1 | Suggestion | Automatique si valeur détectée | Context Bar, Suggestion Strip |
| 2 | Assistant | Action utilisateur (clic "Ouvrir") | AIAssistantPanel |
| 3 | Generation | Action explicite (clic "Générer") | Streaming leçon |

**Règle absolue :** Ne jamais dépasser Level 1 sans action utilisateur.

### Métriques DESIGN-06

| Métrique | Avant | Après |
|----------|-------|-------|
| Actions rapides IA (génériques) | 6 | 4 (contextuelles) |
| Emoji décoratif IA dans dashboard | ✨ | Supprimé |
| Code mort (IaRing, creditsIa) | Présent | Supprimé |
| Copilot persistence | Non | localStorage `ws_copilot_open` |
