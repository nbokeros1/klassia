# RELEASE-P0.2 — Rapport final
**ScorgIA Beta · Bodingo AI Tech Inc. · 2026-08-09**

---

## Verdict

> **RELEASE-P0.2 LIVRÉ — EN ATTENTE DE VALIDATION PRODUCT OWNER**

---

## 1. Contexte et cause racine

### Symptôme observé

Après l'exécution du wizard "Construire mon année scolaire" :
- Les cartes Classe affichaient 0 leçon, 0 prêtes, 0%
- Les onglets Curriculum/Syllabus/Plan annuel montraient des états vides
- L'onglet Quiz affichait un simple message de redirection
- Le bouton "Reconstruire" relançait le wizard sans confirmation
- Le PedagogiqueExplorer ne reflétait pas les données générées
- La Bibliothèque ne permettait pas de prévisualiser les fichiers build-year

### Cause racine principale (P1 — BLOQUANT)

```
classes/page.tsx lisait :  lecons.classe_id
build-year écrit dans :    fichiers_dossier.dossier_id → dossiers_systeme.classe_id
```

Ces deux tables ne sont **jamais synchronisées**. Le pipeline ne touche pas `lecons`.

Toutes les métriques de carte étaient donc structurellement à zéro après chaque build.

### Causes secondaires

| ID | Cause | Impact |
|----|-------|--------|
| P2 | `dossier_systeme` lookup pouvait échouer silencieusement | Leçon/quiz non créés |
| P5 | `programme_annuel` re-inséré à chaque build (orphelins) | Données dupliquées |
| P8 | `studio_ia_memoire` conditionnel sur `progId` | Contexte IA absent |
| M4 | CTA "Construire" identique avec ou sans pack | Confusion UX |
| M7a | `programme_annuel_id` null sur le pack → onglets vides | Données invisibles |
| M7b | Onglet Quiz : redirection, sans contenu réel | Données ignorées |
| M13 | Bibliothèque : preview vide pour fichiers build-year | `contenu_html` non lu |
| M14 | PedagogiqueExplorer : données conversations_ia seulement | Teaching Pack ignoré |
| M17 | Pas de confirmation avant Reconstruire | Données écrasées accidentellement |

---

## 2. Relations DB corrigées

### P1 — Compteurs cartes classe

**Avant** : `lecons.classe_id` (table vide après build-year)

**Après** : fusion de 3 sources :
```
lecons (éditeur leçon) + fichiers_dossier (build-year) + teaching_packs (badge)
```

### P5 — Idempotence programme_annuel

**Avant** : INSERT aveugle → orphelins à chaque rebuild

**Après** : check-then-update via `teaching_pack_id`, fallback par `classe_id`

### P2 — Dossier fallback

**Avant** : skip silencieux si `plans_lecons` dossier absent

**Après** : fallback sur n'importe quel dossier de la classe

### P8 — studio_ia_memoire

**Avant** : conditionnel `if (progId)` → contexte IA absent si prog fail

**Après** : toujours exécuté, contexte enrichi (pack_id, matière, niveau, province)

---

## 3. Onglets corrigés (`programme/page.tsx`)

| Onglet | Avant | Après |
|--------|-------|-------|
| Aperçu | Pack card OK | + Badge statut |
| Curriculum | OK (SourceDisplay) | + CTA adaptatif |
| Syllabus | OK | + CTA adaptatif |
| Plan annuel | Vide si FK null | + Fallback FK + CTA adaptatif |
| Séquences | Vide si FK null | + Fallback FK + CTA adaptatif |
| Plans de leçon | OK (SPIE-BETA-03) | + CTA adaptatif |
| **Quiz** | **Message redirect** | **Affiche fichiers réels (contenu_html)** |
| Gabarits | OK | — |
| Qualité | OK | — |

---

## 4. Cartes Classe

| Métrique | Avant | Après |
|----------|-------|-------|
| Leçons | `lecons.count` (toujours 0) | `lecons.count + fichiers_dossier.count` |
| Prêtes | `lecons[statut=prete]` (0) | `lecons[prete] + tous fichiers lecon` |
| Quiz | Absent | `fichiers_dossier[quiz].count` (si pack) |
| Progression | 0% | `enseignees / totalLecons` |
| Badge | Curriculum/Sans curriculum | Teaching Pack (3 niveaux) |

---

## 5. Bibliothèque

**Avant** : cliquer "Aperçu" sur un fichier build-year → "Ce document n'est pas encore lié à une leçon."

**Après** : `handleOpenPreview` charge `contenu_html` depuis `fichiers_dossier` si pas de `lecon_id`. Le contenu Markdown est affiché en pre-formatted dans le panneau de prévisualisation.

---

## 6. Workspace 2.0 — Data Binding

### PedagogiqueExplorer — Avant

- Source unique : `conversations_ia`
- Clic → `onSelectConversation(conv)` (chat workspace)
- Empty state : "Aucun plan de leçon" même après build réussi

### PedagogiqueExplorer — Après

Sources multiples (chargement parallèle) :
```
teaching_packs + programme_annuel + fichiers_dossier + conversations_ia
```

Arbre structuré :
```
Classe
├── 📚 Mon Année Scolaire (si pack)
│     ├── 📘 Curriculum → /programme?tab=curriculum
│     ├── 📋 Syllabus
│     ├── 📅 Plan annuel
│     ├── 🗂️ Séquences [N]
│     ├── 📖 Leçons développées [N]
│     └── 🎮 Quiz [N]
└── 💬 Anciens contenus (conversations_ia)
```

Aucune conversation créée pour ouvrir un document métier.

---

## 7. Refresh / Cache

Le `refreshKey` propagé depuis `preparer/page.tsx` déclenche un rechargement complet de `loadAllData`. Stratégie conservative — pas de cache en mémoire entre les renders.

---

## 8. Build partiel / Reprise

- Modal confirmation avant "Reconstruire" (si pack existe)
- CTA "Reprendre la génération" vs "Construire mon année" selon l'état
- Fallback FK : si `programme_annuel_id` nul, lookup par `classe_id` + réparation silencieuse

---

## 9. Qualité

| Check | Résultat |
|-------|---------|
| `npx tsc --noEmit` | ✅ EXIT 0 |
| `npm run lint` | ⚠️ Erreurs pré-existantes (`no-explicit-any`, `exhaustive-deps`) — aucune erreur introduite par P0.2 |
| `npm run build` | ✅ EXIT 0 |

---

## VERDICT

> ## ✅ RELEASE-P0.2 VALIDÉ AVEC RÉSERVES
>
> **TypeScript** : 0 erreur · **Build** : EXIT 0
>
> **Réserves** : lint échoue sur des erreurs `no-explicit-any` et `react-hooks/exhaustive-deps` pré-existantes à travers tout le codebase — aucune n'a été introduite par cette release.
>
> **Prêt pour validation Product Owner.** En attente d'approbation avant tout push ou déploiement.

---

## 10. Fichiers modifiés / créés

### Modifiés

| Fichier | Changements |
|---------|-------------|
| `src/app/api/spie/build-year/route.ts` | P5 idempotence, P2 fallback, P8 studio_ia_memoire |
| `src/app/dashboard/classes/page.tsx` | P1 compteurs fusionnés, M9/M10 badge pack |
| `src/app/dashboard/classes/[id]/programme/page.tsx` | M4 CTA adaptatif, M7a fallback FK, M7b Quiz tab, M17 modal confirm |
| `src/app/dashboard/bibliotheque/page.tsx` | M13 preview contenu_html |
| `src/components/preparer/explorer/PedagogiqueExplorer.tsx` | M14 binding données réelles |

### Créés (documentation)

- `docs/Workspace/Year_Build_State_Model.md`
- `docs/Workspace/Teaching_Pack_Data_Flow.md`
- `docs/Workspace/Workspace_Data_Binding.md`
- `docs/Workspace/Class_Card_Stats.md`
- `docs/Workspace/Build_Resume_Model.md`
- `docs/Workspace/RELEASE-P0.2_Report.md`

---

## 11. Limites restantes

| Limitation | Niveau | Phase cible |
|-----------|--------|-------------|
| `fichiers_dossier` non dédupliqués après Reconstruire | Mineur | Phase 2 |
| Séquences individuelles non navigables (tout → onglet global) | Fonctionnel | Phase 3 (table sequences) |
| Preview Bibliothèque : Markdown brut, non rendu | UX | Phase 2 |
| Leçons outline (contenu_json) non navigables individuellement | Fonctionnel | Phase 3 |
| Pas de test automatisé du pipeline build-year | Technique | RELEASE-P1 |

---

## 12. Prochaine phase

**RELEASE-P1** (après validation Product Owner) :
- Tests automatisés du pipeline build-year
- Déduplication des fichiers après Reconstruire
- Rendu Markdown dans la Bibliothèque
- Indicateur de génération en cours dans le PedagogiqueExplorer

**WORKSPACE Phase 3** (après validation Product Owner) :
- Table `sequences` — navigation individuelle
- Arbre Séquence → Leçons individuel

---

## 13. Checklist Product Owner

- [ ] Construire une année → cartes classe affichent compteurs corrects
- [ ] Onglets programme → Curriculum, Syllabus, Plan annuel, Séquences, Quiz renseignés
- [ ] PedagogiqueExplorer → "Mon Année Scolaire" visible après build
- [ ] Clic nœud Teaching Pack → navigue vers l'onglet correspondant
- [ ] Bibliothèque → Aperçu affiche le contenu des fichiers build-year
- [ ] Bouton Reconstruire → modal de confirmation
- [ ] CTA "Reprendre" vs "Construire" selon l'état du pack
- [ ] Test logout/login → données toujours présentes
- [ ] TypeScript → 0 erreur ✅
- [ ] Build → EXIT 0, 117 pages ✅
- [ ] Aucun push effectué ✅
- [ ] Aucune migration DB ✅
- [ ] SPIE non modifié ✅
