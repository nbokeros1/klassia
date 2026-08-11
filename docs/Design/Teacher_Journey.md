# Teacher_Journey.md
## Le Parcours Enseignant — Cartographie officielle ScorgIA

**Date :** 2026-08-10  
**Statut :** Référence Product

---

## Philosophie

> L'enseignant ne navigue plus entre des pages. Il avance naturellement dans son travail.

ScorgIA est construit autour d'une seule idée : **le logiciel accompagne**. Il ne attend pas que l'enseignant découvre les fonctionnalités. Il guide naturellement vers la prochaine meilleure action.

---

## Parcours A — L'année scolaire complète

```
1. Créer une classe
       ↓
2. Choisir un curriculum (province + matière + niveau)
       ↓
3. Construire l'année (Teaching Pack — plan annuel complet)
       ↓
4. Valider le plan annuel
       ↓
5. Développer les séquences (unités pédagogiques)
       ↓
6. Développer les leçons (une leçon par thème ou objectif)
       ↓
7. Créer les évaluations (formatives + sommatives)
       ↓
8. Enseigner (salle de cours ScorgIA — présenter, animer)
       ↓
9. Suivre les progrès (tableaux de bord, retours élèves)
```

---

## Correspondance Routes

| Étape | Route principale | Route secondaire |
|-------|-----------------|-----------------|
| 1. Créer une classe | `/dashboard/classes` | — |
| 2. Choisir curriculum | `/dashboard/classes/[id]` → Teaching Pack | `/dashboard/ecole` |
| 3. Construire l'année | `/dashboard/classes/[id]` → Wizard | — |
| 4. Valider | `/dashboard/classes/[id]` → programme | — |
| 5. Séquences | `/dashboard/gerer/preparer` | Workspace Explorer |
| 6. Leçons | `/dashboard/gerer/preparer` | Workspace Document |
| 7. Évaluations | `/dashboard/gerer/preparer?type=evaluation` | `/dashboard/outils/quiz` |
| 8. Enseigner | `/dashboard/gerer/enseigner` | `/dashboard/classes/[id]/lecons/[id]/presenter` |
| 9. Suivre | `/dashboard/suivre` | `/dashboard/classes/[id]` |

---

## Points de friction identifiés (à réduire)

| Friction | Étape | Solution en place |
|----------|-------|------------------|
| Pas de rappel "où j'en étais" | 2–4 | BuildDot dans explorer (DESIGN-04) |
| Actions à découvrir seul | 5–7 | Quick actions hover séquences (DESIGN-04) |
| Retour vers leçon depuis quiz | 7–6 | `tj-doc-link` "Continuer →" (DESIGN-05) |
| Sidebar trop large sur petits écrans | Tout | Mode compact 64px (DESIGN-05) |
| Deux CTA concurrents en header | Dashboard | CTA unique contextualisé (DESIGN-05) |

---

## Parcours B — Leçon du jour

```
Tableau de bord
  → "Préparer {classe}" (CTA contextualisé)
  → Workspace Préparer (classe pré-sélectionnée)
  → Document généré
  → Export / Sauvegarder
  → Enseigner
```

Durée cible : moins de 10 minutes de la décision à la leçon prête.

---

## Parcours C — Évaluation rapide

```
Workspace Préparer — séquence
  → Quick action "Quiz" au hover
  → Prompt pré-rempli
  → Quiz généré
  → Export Word / PPT
```

---

## Parcours D — Enseignant nouveau

```
Inscription / Onboarding
  → Créer première classe
  → MissionDuJour → "Configurer votre plan annuel"
  → Wizard Teaching Pack
  → Plan annuel généré
  → Dashboard : "Développer vos séquences"
```

---

## Indicateurs de parcours (Build States)

Les BuildDots (●◐◌⚠) dans l'Explorer indiquent l'avancement :

| État | Signal | Prochaine action |
|------|--------|-----------------|
| ● gris (todo) | Pas commencé | Démarrer la configuration |
| ◐ ambre (partial) | Partiellement fait | Continuer |
| ◌ violet (active) | En cours | Attendre / Relancer |
| ● vert (pret) | Prêt | Développer les séquences |
| ⚠ rouge (error) | Erreur | Réessayer |

---

## Règles de conception du parcours

1. **Une action principale par écran** — jamais deux CTA concurrents de même poids
2. **Guidage proactif** — l'écran dit toujours quelle est la prochaine étape
3. **Retour toujours possible** — aucune action irréversible sans confirmation
4. **Contexte permanent** — l'enseignant sait toujours où il est dans son année
5. **Zéro friction documentaire** — les documents se créent, s'exportent, se sauvegardent en 1 clic

---

## DESIGN-07 — Build My Year Experience 2.0

Ajout du parcours "Construire mon année" comme expérience signature.

### Philosophie

> « Votre année prend forme. »

Pas "Étape 3 sur 5". L'enseignant observe sa progression, pas une barre.

### Changements clés

| Avant | Après |
|-------|-------|
| Stepper cercles numérotés | Dots discrets, labels actifs en violet |
| 7 champs en grille uniforme | 5 primaires + Options avancées masquées |
| Résumé avec liste entitlements | Résumé compact matière · niveau · calendrier |
| Barre de progression + emojis 🎉⚙️ | Timeline checkpoints ✓ ● ○ |
| Succès : "Votre année est construite !" | "Votre année est prête." |
| Aucun handoff workspace | "Ouvrir mon année →" → workspace direct |

### Handoff workspace (M14)

L'enseignant clique "Ouvrir mon année →" :
1. `klassia_active_classe` = classeId dans localStorage
2. Navigate vers `/dashboard/gerer/preparer`
3. Classe pré-sélectionnée, Explorer prêt

### Règles

1. Le parcours ne réapparaît jamais automatiquement après construction
2. "Reconfigurer" nécessite une confirmation explicite
3. La progression est basée sur les checkpoints DB, jamais sur des données fictives
4. 0 spinner plein écran, 0 animation gadget
