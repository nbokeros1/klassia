# Component Audit — ScorgIA DS 2.0 Phase 1
## Inventaire et état de cohérence des composants

**Date :** 2026-08-09  
**Scope :** Pages dashboard + composants UI

---

## Méthodologie

Audit réalisé par lecture des fichiers source.  
Chaque composant est évalué sur :
- **Tokens** : utilise-t-il les tokens CSS ?
- **Radius** : cohérence des border-radius ?
- **Shadow** : cohérence des ombres ?
- **Animation** : transition définie ?
- **Empty state** : état vide contextuel ?
- **Responsive** : breakpoints gérés ?

Niveaux : ✅ Cohérent · ⚠️ Partiel · ❌ Incohérent · 📋 À faire

---

## Pages — Audit rapide

| Page | Tokens | Radius | Shadow | Animation | Empty state | Note |
|------|--------|--------|--------|-----------|-------------|------|
| `/dashboard` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Styles inline mixtes — voir M5 |
| `/dashboard/classes` | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | Cards OK, empty state à enrichir |
| `/dashboard/gerer/preparer` | ✅ | ✅ | ✅ | ✅ | ✅ | Plus récent — bon état |
| `/dashboard/bibliotheque` | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | Empty state générique |
| `/dashboard/outils` | ✅ | ✅ | ✅ | ✅ | ✅ | `.outil-card` cohérent |
| `/dashboard/profil` | ⚠️ | ✅ | ✅ | ❌ | ✅ | Pas de transitions sur les sections |
| `/dashboard/calendrier` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | 📋 | À auditer en détail |
| `/founder/monitoring` | ✅ | ✅ | ✅ | ❌ | ✅ | Tableau sans transitions |
| Admin pages | ❌ | ❌ | ❌ | ❌ | ❌ | Non concernées Phase 1 |

---

## Composants UI — Audit

### Composants existants (pré-DS 2.0)

| Composant | Fichier | État | Action |
|-----------|---------|------|--------|
| `Sidebar` | `Sidebar.tsx` | ⚠️ | Utilise `.sidebar-*` CSS — cohérent mais non migré |
| `Topbar` | `Topbar.tsx` | ✅ | Propre, glass, tokens OK |
| `ThemeToggle` | `ui/ThemeToggle.tsx` | ✅ | Fonctionnel |
| `CadenasForFait` | `ui/CadenasForFait.tsx` | ⚠️ | Badge interne à aligner avec `Badge.tsx` |
| `OutilCard` | `ui/OutilCard.tsx` | ✅ | `.outil-card` cohérent |
| `ApercuModal` | `ui/ApercuModal.tsx` | ⚠️ | Modal — radius et shadow OK, animation à vérifier |
| `DashboardFloats` | `DashboardFloats.tsx` | ✅ | CommandBar intégré DS 2.0 |
| `AssistantFlottant` | `AssistantFlottant.tsx` | ✅ | FAB existant — non modifié |
| `MissionDuJour` | `dashboard/MissionDuJour.tsx` | ⚠️ | Styles inline — à migrer vers `.ds-card` |

### Composants DS 2.0 (nouveaux)

| Composant | Fichier | État |
|-----------|---------|------|
| `Badge` | `ui/Badge.tsx` | ✅ Nouveau |
| `CommandBar` | `ui/CommandBar.tsx` | ✅ Nouveau |
| `TeachingPackCard` | `ui/TeachingPackCard.tsx` | ✅ Nouveau |
| `IATimeline` | `ui/IATimeline.tsx` | ✅ Nouveau |
| `EmptyState` | `ui/EmptyState.tsx` | ✅ Nouveau |
| `Breadcrumb` | `ui/Breadcrumb.tsx` | ✅ Nouveau |
| `ResumeWidget` | `ui/ResumeWidget.tsx` | ✅ Nouveau |

---

## Incohérences identifiées — Simple (corrections immédiates)

### 1. Inline styles avec valeurs arbitraires

De nombreuses pages utilisent des valeurs hardcodées au lieu de tokens :

```tsx
// ❌ Avant
style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}

// ✅ Après
className="ds-card"
```

**Impact :** cosmétique · **Effort :** 1-2h par page

### 2. Badges non unifiés

Plusieurs implémentations ad-hoc de badges existent :

```tsx
// ❌ Avant (différent dans chaque page)
<span style={{ color: '#22C55E', background: 'rgba(34,197,94,0.1)' }}>Prêt</span>

// ✅ Après
<Badge variant="pret" />
```

**Impact :** fort · **Effort :** migration progressive par page

### 3. Empty states génériques

Certaines pages affichent "Aucun résultat" ou "Aucune donnée" sans contexte ni action.

**Pages concernées :** `/bibliotheque`, sections dashboard, Teaching Pack tabs

**Impact :** UX · **Effort :** 30min par page

---

## Incohérences complexes — Phase 2

| Problème | Pages concernées | Priorité |
|----------|-----------------|----------|
| Dashboard non restructuré en cockpit | `/dashboard` | Haute |
| Header non signé ScorgIA | Toutes pages | Haute |
| Teaching Pack card non intégrée | `/classes/[id]/programme` | Haute |
| IATimeline non branchée au wizard | `BuildMyYearWizard.tsx` | Moyenne |
| ResumeWidget non branché | `/dashboard` | Moyenne |
| Breadcrumb non intégré | Pages classes/leçons | Moyenne |
| Tab navigation non stylée DS 2.0 | Multiple | Basse |

---

## Checklist de validation Product Owner

- [ ] CommandBar (Ctrl+K) fonctionne et charge les classes
- [ ] Badges affichés correctement (light + dark)
- [ ] TeachingPackCard sur page Programme
- [ ] IATimeline dans le wizard Build Year
- [ ] EmptyState sur les onglets vides
- [ ] Breadcrumb sur pages classe/leçon
- [ ] ResumeWidget sur Dashboard
- [ ] 0 erreur TypeScript, build SUCCESS

---

## Roadmap Phase 2

1. Dashboard Cockpit (M5) — restructuration complète
2. Header Signature ScorgIA (M2) — avec progression classe active
3. Intégration IATimeline → BuildMyYearWizard
4. Migration badges → `Badge.tsx` sur toutes les pages
5. Migration empty states → `EmptyState.tsx`
6. Integration Breadcrumb sur pages classes/leçons

---

## Voir aussi

- [Design_System_2.0_Phase1.md](Design_System_2.0_Phase1.md) — Spécification système
- [Visual_Consistency_Report.md](Visual_Consistency_Report.md) — Rapport complet
- [DESIGN-01_Report.md](DESIGN-01_Report.md) — Livraison Phase 1
