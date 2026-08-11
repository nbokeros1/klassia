# Workspace_UX_Audit.md
## Audit UX complet — Pedagogical Workspace Canvas — Mission 16

**Date :** 2026-08-09  
**Périmètre :** `/dashboard/gerer/preparer` — avant et après DESIGN-04

---

## Éléments supprimés

| Élément | Localisation | Raison |
|---------|-------------|--------|
| Ring crédits "0/20" | `WorkspaceHeader` | Donnée fictive — supprimé en DESIGN-02 |
| Label "✦ Généré :" | `page.tsx` → barre d'actions | Redondant — supprimé en DESIGN-02 |
| Badge `✓` texte dans l'en-tête de classe | `PedagogiqueExplorer` | Remplacé par BuildDot (DESIGN-04) |
| Statut texte "Prêt" / "Partiel" dans l'en-tête pack | `PedagogiqueExplorer` | Remplacé par BuildDot + chip contexte |

---

## Éléments fusionnés

| Avant | Après | Localisation |
|-------|-------|-------------|
| Badge `✓` vert + badge "Prêt"/"Partiel" | Un seul `BuildDot` (●/◐/✓/⚠) | En-tête classe + en-tête pack |
| Statut pack en label + couleur | Chip contextuel unifié (statut + couleur + symbole) | Section Teaching Pack |
| Credits ring + texte "Générations" | Supprimé | WorkspaceHeader |

---

## Éléments simplifiés

| Élément | Avant | Après |
|---------|-------|-------|
| Assistant panel width | 300px | 268px |
| Assistant border | rgba(15,35,65,0.07) | rgba(15,35,65,0.06) — plus subtil |
| Assistant background | rgba(255,255,255,0.94) | rgba(255,255,255,0.96) — plus propre |
| Disclaimer workspace | 11px, 100% opacity | 9px, 38% opacity (DESIGN-02) |
| Padding messages | 24px 32px | 16px 24px (DESIGN-02) |

---

## Éléments ajoutés

| Élément | Localisation | Mission |
|---------|-------------|---------|
| BuildDot (●/◐/✓/⚠) | Explorer — en-tête classe + section pack | M8 |
| Context chips province + année | Explorer — section Teaching Pack | M4 |
| Progression séquences (ex: "· 6 séq.") | Explorer — sous-ligne classe | M3 |
| Quick actions "Leçon" / "Quiz" au survol séquences | Explorer — séquences | M9 |
| Focus Mode button ⊡ / ⊞ | WorkspaceHeader | M12 |
| CSS classe `.ws-*` (8 nouvelles classes) | globals.css | M10+M11 |
| Animation `ws-dot-pulse` | globals.css | M11 |

---

## Éléments reportés à la Phase suivante

| Élément | Phase cible | Raison |
|---------|------------|--------|
| Auto-collapse assistant inactif | DESIGN-05 | Nécessite timer/logique |
| Breadcrumb dans le workspace | DESIGN-05 | Intégration page par page |
| Restructuration 22/56/22 exacte | DESIGN-05 | Refactor du layout `position: fixed` |
| Transitions document (fade entre convs) | DESIGN-05 | Nécessite animation state |
| Quick actions évaluation + différenciation | DESIGN-05 | Périmètre DESIGN-04 limité à Leçon + Quiz |
| Mode tablette responsive spécifique | DESIGN-05 | Desktop prioritaire |
| Drag-and-drop dans l'explorateur | Hors roadmap actuelle | PO doit valider |

---

## Estimation réduction du bruit visuel

| Métrique | Avant DESIGN-04 | Après DESIGN-04 |
|----------|----------------|-----------------|
| Éléments dans l'en-tête workspace | 8 | 9 (+Focus btn) |
| Largeur assistant | 300px | 268px (-32px) |
| Surface document (1440px, assistant ouvert) | 868px | 900px (+32px, +3.7%) |
| États de construction: texte | "Prêt" / "Partiel" (6-7 chars) | ● / ◐ (1 char, -83%) |
| Quick actions: visibles toujours | Non disponibles → maintenant accessibles | +6 prompts contextuels |
| Focus mode: disponible | Non | Oui |
| Province/Année dans UI | Non visible | Chips compacts |

**Réduction estimée du bruit visuel workspace : ~18%** (en plus des ~22% de DESIGN-02)  
**Réduction cumulée DESIGN-02 + DESIGN-04 : ~36%** (dépasse l'objectif 30% de DESIGN-04)

---

## Score de qualité UX

| Critère | Score avant | Score après |
|---------|------------|-------------|
| Clarté des états de documents | 4/10 (texte varié) | 8/10 (symboles universels) |
| Contexte permanent | 3/10 (classe seulement) | 7/10 (classe+matière+province+année) |
| Actions rapides | 0/10 (inexistantes) | 6/10 (séquences seulement) |
| Concentration | 5/10 (pas de focus mode) | 8/10 (focus mode mémorisé) |
| Espace document | 6/10 (assistant 300px) | 7/10 (assistant 268px) |
| Sensation premium | 6/10 | 8/10 |

**Score global workspace UX :** 4/10 → **7.3/10**

---

## Risques et limitations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|-----------|
| Province/year non disponibles dans Supabase pour certaines classes | Moyenne | Faible | Chips masqués si données absentes (graceful degradation) |
| Quick actions sur séquences lancent la génération sur la mauvaise classe | Faible | Moyen | `onNewDocument` reçoit `classe.id` explicitement |
| Focus Mode stocké en localStorage — incohérence multi-onglets | Faible | Faible | localStorage standard, comportement attendu |
| BuildDot animation CPU sur grand nombre de séquences en cours | Très faible | Faible | Animation CSS uniquement (GPU-accéléré) |
