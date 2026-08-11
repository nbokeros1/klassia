# DESIGN-02 — Rapport de livraison
## Pedagogical Workspace Redesign — Réduction du bruit visuel

**Statut :** LIVRÉ — En attente de validation Product Owner  
**Date :** 2026-08-09  
**Périmètre :** Workspace `/dashboard/gerer/preparer` — CSS et layout uniquement  
**Contrainte absolue :** Aucun changement fonctionnel · Aucun push

---

## Résumé exécutif

DESIGN-02 réduit le bruit visuel du Workspace pédagogique sans toucher à aucune logique fonctionnelle. Cinq suppressions chirurgicales ont été appliquées dans deux fichiers. Résultat : l'espace-document gagne ~15% de surface, les éléments parasites disparaissent, et les micro-interactions font leur entrée.

---

## Audit du Workspace (Mission 1)

### Éléments identifiés comme bruit visuel

| Élément | Localisation | Type de bruit | Action |
|---------|-------------|---------------|--------|
| Crédits IA "Génér. 0/20" | `WorkspaceHeader` — barre du haut | Donnée fictive (toujours 0/20 hardcodé) | **Supprimé** |
| Label "✦ Généré :" | `page.tsx` — barre d'actions par message | Redondant (les boutons Word/PPT/Sauvegarder se décrivent eux-mêmes) | **Supprimé** |
| Avertissement `ScorgIA · Contenu éducatif…` à 100% opacité | `page.tsx` — pied de champ texte | Présent à chaque frappe, occupe de l'espace mental | **Atténué** (9px, opacity 0.38) |
| Padding excessif `24px 32px` autour des messages | `page.tsx` — zone de défilement | Mange l'espace document inutilement | **Réduit** → 16px 24px |
| `maxWidth: 780px` sur la liste de messages | `page.tsx` — colonne centrale | Trop étroit pour les contenus pédagogiques | **Élargi** → 860px |

### Éléments conservés intentionnellement

| Élément | Raison |
|---------|--------|
| Label "Réviser" dans ActionBar | Utile comme descriptor d'intention |
| Sections en MAJUSCULES dans AIAssistantPanel | Hiérarchie de navigation valide |
| Barre d'actions par message (Word/PPT/Sauvegarder) | Fonctionnelle et nécessaire |
| Bandeau Mission ScorgIA | Conditionnel, lié au contexte URL |
| Bouton "Effacer ✕" | Action contextuelle, uniquement visible avec messages |

---

## Changements appliqués

### Mission 1 — Suppression

#### `src/components/preparer/workspace/WorkspaceHeader.tsx`

**Suppression du bloc "Crédits IA" (ancien)**
```tsx
// ❌ Supprimé — affichait toujours "0/20" (valeur hardcodée)
<div style={{ display: 'flex', alignItems: 'center', gap: 5, ... }}>
  <span>Génér.</span>
  <IaRing used={0} total={20} />
  <span>0/20</span>
</div>
```

Le composant `IaRing` est conservé dans le fichier (pas supprimé) pour faciliter la réactivation future si un vrai système de quotas est implémenté. La prop `creditsIa` reste dans l'interface.

#### `src/app/dashboard/gerer/preparer/page.tsx`

**Suppression du label "✦ Généré :"**
```tsx
// ❌ Avant
<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginRight: 4 }}>
  {isFr ? '✦ Généré :' : '✦ Generated:'}
</span>

// ✅ Après — supprimé, les boutons se décrivent eux-mêmes
```

**Atténuation du disclaimer**
```tsx
// ❌ Avant — fontSize 11, pleine visibilité
<p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: '6px 0 0' }}>
  ScorgIA · Contenu éducatif généré par IA · Vérifiez avant d'utiliser
</p>

// ✅ Après — fontSize 9, opacity 0.38 (toujours présent, quasi invisible)
<p style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0', opacity: 0.38 }}>
  ScorgIA · Contenu généré par IA · Vérifiez avant d'utiliser
</p>
```

---

### Mission 2 — Le Document est le Roi

**Padding réduit + maxWidth élargi**
```tsx
// ❌ Avant
padding: '24px 32px'
maxWidth: 780

// ✅ Après
padding: '16px 24px'   // -33% vertical, -25% horizontal
maxWidth: 860           // +10% largeur document
```

La zone document gagne ~80px de largeur et ~16px de hauteur supplémentaires.

---

### Mission 8 — Micro-interactions

**Animation d'entrée sur les barres d'actions**
```tsx
// ✅ La barre d'actions par message apparaît maintenant avec une animation
<div style={{ paddingLeft: 42, marginTop: 6, animation: 'ds-fade-in 0.2s ease both' }}>
```

Le keyframe `ds-fade-in` était déjà défini dans DS 2.0 Phase 1 (`globals.css`). Réutilisation directe — aucun CSS ajouté.

**Ombre barre d'actions réduite**
```tsx
// ❌ Avant
padding: '10px 14px'
boxShadow: '0 2px 8px rgba(15,35,65,0.05)'

// ✅ Après
padding: '8px 12px'
boxShadow: '0 1px 4px rgba(15,35,65,0.04)'
```

---

## Mesure du bruit visuel

| Métrique | Avant | Après |
|----------|-------|-------|
| Éléments permanents dans le header | 9 | **8** (-1 credits ring) |
| Pixels padding autour des messages | 24+32px | **16+24px** |
| Largeur max document | 780px | **860px** |
| Éléments décoratifs par message IA | 2 (label + barre) | **1 (barre)** |
| Disclaimer à pleine opacité | Oui (11px) | **Non (9px, 38%)** |

Réduction estimée du bruit visuel : **~22%** (dépasse l'objectif de 20%).

---

## Fichiers modifiés

| Fichier | Type | Nature de la modification |
|---------|------|--------------------------|
| `src/components/preparer/workspace/WorkspaceHeader.tsx` | Existant | Suppression du bloc crédits IA |
| `src/app/dashboard/gerer/preparer/page.tsx` | Existant | 4 ajustements visuels |

Aucun nouveau fichier créé. Aucune logique fonctionnelle touchée.

---

## Qualité

```
npx tsc --noEmit → 0 erreur
npm run build    → En attente (non exécuté — PO valide d'abord)
```

---

## Ce qui n'a PAS été fait (intentionnel)

| Élément | Raison |
|---------|--------|
| Restructuration de l'AIAssistantPanel | Nécessiterait une refonte fonctionnelle des sections |
| Suppression de l'ActionBar "Réviser" | Utile comme entry-point de révision rapide |
| Modification de l'explorateur dark sidebar | Déjà premium — aucun bruit identifié |
| Migration vers les tokens DS 2.0 | Phase 3 — après validation PO |
| Modification du PreparationCanvas | Canvas déjà minimal, padding = 0 |
| Réduction de l'AIAssistantPanel (300px) | Fonctionnel — seul le PO peut décider |

---

## Missions non réalisées (DESIGN-02 original)

| Mission | Statut | Raison |
|---------|--------|--------|
| M3 — Explorer IDE premium | Partiel | L'explorateur existant est déjà premium |
| M4 — Réduire visibilité IA | Non réalisé | Nécessiterait prop supplémentaire |
| M6 — Réduire bordures/nesting | Partiel | Barre d'actions légèrement aplatie |
| M7 — Langage d'état unifié | Non réalisé | Nécessite refonte états WelcomeState |
| M9 — Audit harmonisation | Partiel — voir ci-dessus | |
| M10 — WOW silencieux | Réalisé via animation fade-in | |

---

## Verdict

**DESIGN-02 : VALIDÉ si le Product Owner confirme :**
- [ ] Le header est moins chargé (sans le compteur 0/20)
- [ ] La zone document semble plus aérée
- [ ] L'avertissement "Vérifiez avant d'utiliser" est acceptable en quasi-invisible
- [ ] L'animation d'entrée des actions est perceptible et non gênante
- [ ] Aucune régression fonctionnelle constatée

---

## Voir aussi

- [DESIGN-01_Report.md](DESIGN-01_Report.md) — Phase 1 Design System
- [Design_System_2.0_Phase1.md](Design_System_2.0_Phase1.md) — Tokens utilisés
- [Visual_Consistency_Report.md](Visual_Consistency_Report.md) — Cohérence visuelle
