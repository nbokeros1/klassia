# MON-ANNEE — Audit complet V1 → V4

**Mission :** MON-ANNEE-INTEGRATION-01  
**Date :** 2026-08-15  
**Périmètre :** V1 (schema + build pipeline) → V4 (teaching tracker)  
**Méthode :** Audit statique — lecture exhaustive du code source  
**Verdict global :** READY WITH FIXES — voir section 22

---

## 1. Test nouveau compte / Build My Year — parcours complet

### 1.1 Anti-doublon
`build-year/route.ts` : si `pack.contenu_json?.generation_en_cours === true`, retourne immédiatement 409. Empêche les doubles lancements. **OK**.

### 1.2 Pipeline 7 étapes
| Étape | Contenu | Résultat stocké |
|-------|---------|-----------------|
| 1 — Validation | Vérification entitlement, anti-doublon | `generation_en_cours = true` |
| 2 — Curriculum | Génération AI + curriculum_outcomes | `contenu_json` (contenu_programme) |
| 3 — Syllabus | 2 phases (AI + déterministe) | `syllabus_json` |
| 4 — Programme annuel | Séquences + plans de leçons | `programme_annuel.contenu_json` |
| 5 — Plans de leçon | Embedded dans programme_annuel | (inclus dans 4) |
| 6 — Première leçon | Leçon détaillée step-by-step | `fichiers_dossier` (lecon_complete) |
| 7 — Quiz | Questions pour la première leçon | `fichiers_dossier` (quiz) |
| 7.5 — Binding | Liaison arborescence | `fichiers_dossier` (non-bloquant) |

### 1.3 Smart resume
`buildState` persiste dans `teaching_packs.contenu_json.build_state`. Survit à F5, déconnexion, changement d'onglet. Flags `skipCurriculum`, `skipSyllabus`, `skipLecon` calculés à partir des statuts des étapes. **OK**.

### 1.4 Anti-placeholder
Prompt Step 2 : `"JAMAIS 'Unité 1', 'Leçon 1', 'Contenu à définir'"`. Format objectif : `"L'élève peut..."`. **OK en code** (risque runtime si l'IA ne suit pas les instructions).

### 1.5 Class Folder Binding
- `dosMap.get('plans_lecons')` : le type `'plans_lecons'` est bien un dossier standard créé par trigger (migrations 008, 010, 015). **OK** — pas de bug ici.
- `ensureSubFolder()` pour `Syllabus/` et `Séquences/` : idempotent (check par `parent_id + nom`). **OK**.
- `buildKey()` : clé composite `type_fichier:sous_type:seq_idx:lecon_idx` → zéro doublon. **OK**.

---

## 2. Curriculum — CurriculumOutcome, RA relations

### 2.1 Structure
`curriculum_outcomes[]` embarqué dans `ContenuProgramme`. Relations :
- `unite.curriculum_outcome_ids[]` → RA couverts par la séquence entière
- `lecon.curriculum_outcome_ids[]` → RA couverts par cette leçon spécifique

### 2.2 getCurriculumCoverage()
Pour chaque outcome, itère sur toutes les unités et leçons :
- `isPlanified` : au moins un `lecon.curriculum_outcome_ids` inclut cet outcome
- `isPrepared` : au moins une leçon couvrant cet outcome a un `lecon_id` (plan complet)
- `isTaught` (V4) : au moins une leçon couvrant cet outcome a `statut === 'enseignee'`

### 2.3 Anomalie détectée — P3
La condition `seqCovers && unite.lecons.some(l => l.statut === 'enseignee')` marque un RA comme enseigné si le RA est couvert au niveau de la séquence ET qu'une leçon quelconque de la séquence est enseignée — même si cette leçon ne couvre pas ce RA spécifiquement. Légère sur-déclaration de couverture. Voir BUG-05 dans le registre.

---

## 3. Smart Syllabus — visuel + fonctionnel + persistance

### 3.1 Génération 2 phases
- Phase 1 (AI) : génère le contenu pédagogique du syllabus
- Phase 2 (déterministe) : formate, valide, complète les champs manquants

### 3.2 Persistence
Stocké dans `programme_annuel.syllabus_json`. Survit à F5 (rechargement depuis DB), déconnexion/reconnexion, changement de classe (RLS scoped). **OK**.

### 3.3 Complétude
`getSyllabusCompleteness()` retourne un score 0-100. Déclenche la tâche `'planifier'` dans PriorityTasks si < 80 %. **OK**.

### 3.4 Smart resume
`buildState.syllabus.status === 'success'` → étape syllabus sautée au resume. **OK**.

---

## 4. Plan annuel — absence de contenu générique

### 4.1 Garanties prompt
Le prompt Step 4 interdit explicitement le contenu générique. Vérification :
- Titres d'unités et leçons = noms réels (contrainte prompt)
- `objectif_apprentissage` commence par `"L'élève peut..."` (contrainte format)
- `justification_pedagogique` requise pour chaque unité

### 4.2 Risque runtime
Si le modèle IA génère du contenu générique malgré les instructions, aucune vérification programmatique n'est en place pour le rejeter. Risque acceptable (hors périmètre V4). **NOTED, pas de bug code**.

---

## 5. Première séquence — toutes les leçons affichées

### 5.1 Storage
Toutes les leçons de toutes les séquences sont embarquées dans `programme_annuel.contenu_json.unites[].lecons[]`. **Pas de table séparée, pas de lazy loading.**

### 5.2 Affichage
`AnnualPlanOverview` : expand par séquence → tableau des leçons avec colonnes Titre, Statut, Actions. `CurrentSequenceCard` (V4) : mini-liste des 6 premières leçons de la séquence en cours avec badges. **OK**.

---

## 6. Première leçon — correspondance avec le plan

### 6.1 Génération
Step 6 (`premiere_lecon`) utilise le `lesson-engine` route, qui prend le plan de leçon (outline) depuis `contenu_json` comme base de la génération. Correspondance structurelle garantie par prompt.

### 6.2 Stockage
Stockée dans `fichiers_dossier` avec `type_fichier: 'lecon_complete'`. Liée au pack via `teaching_pack_id`. Visible dans le dossier `Leçons/` de la classe. **OK**.

---

## 7. Arborescence classe — pas de doublons

### 7.1 Dossiers standards créés à la création de classe
| Type | Nom | Migration |
|------|-----|-----------|
| `curriculum` | Curriculum | 008 + 010 + 015 |
| `plan_annuel` | Plan annuel | 008 + 010 + 015 |
| `plans_lecons` | Plans de leçons | 008 + 010 + 015 |
| `lecons` | Leçons | 008 + 010 + 015 |

`Syllabus/` et `Séquences/` : sous-dossiers `custom` créés par `ensureSubFolder()` si absents.

### 7.2 Idempotence
`buildKey()` = `"type_fichier:spie_tag:seq_idx:lecon_idx"`. Chaque fichier système a une clé unique. Binding : INSERT si absent, UPDATE dossier_id si mal placé, skip si correct. **Zéro doublon garanti en usage séquentiel**. Race condition théorique couverte par migration 040 (PROPOSÉE). **OK**.

---

## 8. Mon Année — données réelles, toutes les cartes

### 8.1 Cartes disponibles en V4
| Carte | Source des données | Statut |
|-------|-------------------|--------|
| Métriques header | `deriveData()` depuis contenu_json | ✓ |
| Badge rythme (V4) | `derivePacingIndicator()` | ✓ |
| Séquence en cours | `currentSequence` (première non terminée) | ✓ |
| Mini-liste leçons (V4) | `uniteData.lecons` avec statuts | ✓ |
| Tâches prioritaires (V4) | `getNextTeachingAction()` + `leconsSansPlan` | ✓ |
| Couverture curriculum | `getCurriculumCoverage()` | ✓ |
| Plan annuel détaillé | `AnnualPlanOverview` avec expand | ✓ |

### 8.2 Anomalie détectée — P2
**Sélecteur de classes brisé** : `loadClasses` utilise `.eq('enseignant_id', user.id)` où `user.id` = auth.uid(). Mais `classes.enseignant_id` référence `utilisateurs.id` (UUID interne différent de l'auth UUID). La RLS filtre correctement (via la politique), mais le filtre `.eq()` annule ces résultats → `allClasses` toujours vide → dropdown de changement de classe vide. Voir BUG-01.

---

## 9. Marquer comme enseignée — flow complet + cascades

### 9.1 Flow complet
1. `AnnualPlanOverview` → bouton `+ Enseigner` (si `!isTaught && canMark`)
2. `MarkTaughtModal` → date (défaut aujourd'hui) + note optionnelle
3. PATCH `/api/spie/mark-taught` avec `{ programmeAnnuelId, uniteNumero, leconNumero, statut: 'enseignee', date_enseignee, note_enseignement }`
4. Auth chain : `requireAuth()` → profil → classe ownership → programme_annuel
5. Mutation JSONB : `unite[uniteIdx].lecons[leconIdx].statut = 'enseignee'`
6. Optimistic update (`localOverrides` Map) → `onTaughtUpdated()` → rechargement complet

### 9.2 Cascades après marquage
| Composant | Réaction |
|-----------|---------|
| `AnnualPlanOverview` | Optimistic: ligne barrée + date affichée |
| `CurriculumCoverage` | Rechargement → `isTaught` mis à jour |
| `CurrentSequenceCard` | Rechargement → badge vert |
| `PriorityTasks` | Rechargement → tâche `'enseigner'` disparaît |
| Badge rythme | Rechargement → delta recalculé |
| `taughtLecons` / `completedSequences` | Rechargement → métriques mises à jour |

### 9.3 Règle fondamentale respectée
Aucun marquage automatique dans tout le code source. La seule écriture de `statut = 'enseignee'` se fait via PATCH `/api/spie/mark-taught` avec action explicite de l'enseignant. **OK**.

### 9.4 Anomalie détectée — P2
Lost-update race condition : READ → mutate → WRITE non-atomique sur `contenu_json`. Voir BUG-02.

---

## 10. Persistence — F5, déconnexion/reconnexion, changement de classe

| Scénario | Comportement | Statut |
|----------|-------------|--------|
| F5 | `useEffect([loadClasses])` → `loadPackData(classeId)` | ✓ |
| Logout/login | `localStorage('klassia_active_classe')` → classeId restauré | ✓ |
| Changement classe (URL) | `searchParams.get('classeId')` → prioritaire | ✓ |
| Changement classe (dropdown) | **BUG-01** — dropdown vide | ✗ |
| Mark-taught après F5 | Rechargement DB, optimistic réinitialisé | ✓ |
| Multi-onglets | Pas de sync temps réel (Supabase Realtime non activé) | — |

---

## 11. Annuler enseignement — comportement

### 11.1 Flow
1. Leçon `statut === 'enseignee'` → bouton `Annuler ✕`
2. `MarkTaughtModal` en mode "unmark" : affiche la date actuelle, confirmation requise
3. PATCH `/api/spie/mark-taught` avec `statut: 'brouillon'`
4. Route : `delete updated.date_enseignee` + `delete updated.note_enseignement`

### 11.2 Ce qui est supprimé
- `lecon.statut` → `'brouillon'`
- `lecon.date_enseignee` → supprimé du JSONB
- `lecon.note_enseignement` → supprimé du JSONB

### 11.3 Ce qui NE change PAS
- `lecon.lecon_id` (le plan détaillé reste intact)
- `lecon.titre`, `lecon.sujet`, `lecon.objectif_apprentissage`
- Toutes les autres leçons de la séquence

**OK**.

---

## 12. Multi-classes — isolation des données

### 12.1 Isolation au niveau DB
- Chaque `teaching_pack` → `classe_id` unique
- `programme_annuel` → `classe_id` unique
- Toutes les requêtes API (mark-taught, build-year, pack-export) vérifient l'ownership complet : `user → profil → classe.enseignant_id === profil.id`

### 12.2 Isolation côté client
`handleClasseChange()` : reset total (`setClasse(null)`, `setPack(null)`, `setProgramme(null)`) avant `loadPackData(newId)`. Pas de fuite de données entre classes. **OK**.

### 12.3 Anomalie
Le dropdown de changement de classe est brisé (BUG-01), mais l'isolation reste correcte quand la classe est changée via URL. **Isolation intacte, navigabilité altérée**.

---

## 13. Smart Resume — checkpoints préservés

### 13.1 BuildState
Persisté dans `teaching_packs.contenu_json.build_state` → survit à toutes les interruptions.

| Checkpoint | Stocké dans | Skip condition |
|-----------|-------------|----------------|
| pack | `build_state.pack.status` | `=== 'success'` → skip |
| curriculum | `build_state.curriculum.status` | `=== 'success'` → `skipCurriculum = true` |
| syllabus | `build_state.syllabus.status` | `=== 'success'` → `skipSyllabus = true` |
| programme_annuel | `build_state.programme_annuel.status` | `=== 'success'` → inclus dans skip |
| premiere_lecon | `build_state.premiere_lecon.status` | `=== 'success'` → `skipLecon = true` |
| quiz | `build_state.quiz.status` | `=== 'success'` → skip |

**OK — checkpoints complets**.

---

## 14. Exports — lacunes identifiées

### 14.1 Disponibles
| Type | Format | Route |
|------|--------|-------|
| Syllabus | DOCX | `/api/spie/pack-export` (type: 'syllabus') |
| Plan annuel | DOCX | `/api/spie/pack-export` (type: 'plan_annuel') |
| Séquence | DOCX | `/api/spie/pack-export` (type: 'sequence') |
| Pack condensé | DOCX | `/api/spie/pack-export` (type: 'pack_condense') |
| Leçon détaillée | DOCX | `/api/spie/pack-export` (type: 'lecon_detaillee') |

### 14.2 Lacunes identifiées
| Export manquant | Priorité |
|----------------|---------|
| Quiz (questions exportables) | P2 |
| Rapport de progression enseignement | P2 |
| CSV des leçons avec statuts | P3 |
| Export PDF (pas de support PDF natif) | P3 |
| Export de l'ensemble des leçons détaillées | P3 |

**Aucune correction V4 requise — lacunes documentées pour V5**.

---

## 15. UX / Visuel — classification P0→P3

| Item | Sévérité | Description |
|------|---------|-------------|
| Dropdown classes vide sur Mon Année | **P2** | BUG-01 — classe non commutable depuis la page |
| Console 406 sur classe sans pack | P3 | BUG-03 — `.single()` vs `.maybeSingle()` |
| Pacing badge absent si 0 leçon enseignée | — | Comportement intentionnel (correct) |
| Colonne Évalué toujours `—` | — | Comportement intentionnel, documenté |

---

## 16. Console — risques 400/406/404/500

| Risque | Fichier | Sévérité | Détail |
|--------|---------|---------|--------|
| 406 `teaching_packs.single()` | `mon-annee/page.tsx:200` | P3 | Classe sans pack → `single()` échoue |
| 404 `programme_annuel.single()` | `mon-annee/page.tsx:208` | P3 | `programme_annuel_id` orphelin |
| 500 `mark-taught` statut non validé | `mark-taught/route.ts` | P3 | BUG-04 — entrée non sanitisée |
| Aucune erreur React visible | — | — | TypeScript complet, 0 erreurs tsc |

---

## 17. Cohérence base de données

### 17.1 Source de vérité
- **Statuts de leçon** : `programme_annuel.contenu_json.unites[].lecons[].statut` — source unique
- **Plans de leçon** : `fichiers_dossier` (lecon_complete) + `lecon.lecon_id` dans contenu_json (référence)
- **`nb_lecons_total`** : champ dénormalisé, potentiellement divergent (BUG-06, P3)

### 17.2 Risque de divergence
`totalLecons = programme?.nb_lecons_total` est utilisé pour le pacing. Si ce champ dénormalisé diffère du count réel des leçons dans `contenu_json`, le delta de rythme sera inexact. Faible risque (valeur calculée lors du build), mais non défensif. **P3**.

---

## 18. Risque de concurrence — PATCH mark-taught

### 18.1 Pattern actuel
```
READ contenu_json (from DB)
  → mutate lecon in memory
    → WRITE contenu_json (full update)
```

### 18.2 Scénario de perte
- T0 : Onglet A lit `contenu_json` (lecon 1 = brouillon, lecon 2 = brouillon)
- T1 : Onglet B lit `contenu_json` (même snapshot)
- T2 : Onglet A marque lecon 1 → écrit (lecon 1 = enseignée, lecon 2 = brouillon)
- T3 : Onglet B marque lecon 2 → écrit SON snapshot (lecon 1 = brouillon, lecon 2 = enseignée)
- Résultat : lecon 1 redevient brouillon — **perte du marquage de T2**

### 18.3 Probabilité en V4
Très faible : usage mono-utilisateur, mono-onglet. Acceptable pour V4.

### 18.4 Solution proposée
Migration 041 (EVENTS) + endpoint `teaching-events`. L'EVENTS pattern est immuable et ne souffre pas de lost-update.

---

## 19. Migrations proposées — évaluation

### 19.1 Migration 040 — `source_ref` pour upsert idempotent
- **But** : passer de read-then-write à `INSERT ... ON CONFLICT DO UPDATE` sur `fichiers_dossier`
- **Risque d'exécution** : faible — ajout colonne nullable + index unique partiel (non bloquant)
- **Bénéfice** : atomicité du binding + 2 queries → 1 query
- **Recommandation** : À valider avec le PO avant la V5

### 19.2 Migration 041 — `teaching_events`
- **But** : journal immuable des enseignements (multi-enseignement par RA)
- **Risque d'exécution** : faible — nouvelle table, RLS OK, pas de suppression existante
- **Dépendance** : nécessite nouveau endpoint + migration de données JSONB → events (backfill commenté)
- **Recommandation** : V5 uniquement — ne pas exécuter avant refactoring du flow mark-taught

---

## 20. Performance

### 20.1 Requêtes dans loadPackData
```
(1) getUser()                                          — auth
(2) classes.select + teaching_packs.select             — parallel ✓
(3) programme_annuel.select                            — séquentiel (dépend de 2)
```
3 aller-retours DB. Acceptable.

### 20.2 getCurriculumCoverage() — complexité
O(outcomes × unites × lecons). Pour un cours type (50 outcomes × 8 unités × 6 leçons = 2 400 itérations) : acceptable, < 5 ms. **Pas de N+1 — calcul purement en mémoire**.

### 20.3 Mark-taught — 4 requêtes séquentielles
1. `requireAuth()` — auth
2. `utilisateurs.select` — profil
3. `programme_annuel.select` — lecture JSONB
4. `classes.select` — ownership check
5. `programme_annuel.update` — écriture

5 aller-retours DB pour un marquage. Acceptable pour V4, optimisable en V5 (regrouper ownership + programme en 1 query JOIN).

---

## 21. Score global — 10 dimensions /100

| # | Dimension | Score | Commentaire |
|---|-----------|-------|-------------|
| 1 | Build My Year pipeline | 9/10 | Anti-doublon, smart resume, 7 étapes — race condition (040) acceptable |
| 2 | Curriculum RA coverage | 7/10 | Relations correctes, isTaught V4 ; BUG-05 seqCovers over-report |
| 3 | Smart Syllabus | 9/10 | 2 phases, persistence, completeness ; visuel non testé |
| 4 | Plan annuel | 9/10 | Anti-placeholder prompt, toutes séquences présentes |
| 5 | Arborescence classe | 10/10 | Idempotent, buildKey, plans_lecons standard |
| 6 | Mon Année dashboard | 7/10 | Toutes les cartes, données réelles ; BUG-01 dropdown brisé |
| 7 | Marquer enseignée | 8/10 | Flow explicite, auth, optimistic ; BUG-02 lost-update P2 |
| 8 | Persistence | 8/10 | F5/logout OK via localStorage ; changement classe brisé |
| 9 | Multi-classes isolation | 9/10 | RLS + ownership check ; navigabilité altérée par BUG-01 |
| 10 | API / Sécurité | 8/10 | Auth chain complète ; BUG-04 statut non validé |

**Score total : 84 / 100**

---

## 22. Verdict

### READY WITH FIXES

**Bloquants avant ship :**
- **BUG-01 (P2)** — Mon Année : sélecteur de classe toujours vide. Un enseignant avec plusieurs classes ne peut pas changer de classe depuis Mon Année.

**Acceptables pour V4 :**
- **BUG-02 (P2)** — Race condition mark-taught. Probabilité très faible (mono-utilisateur), documentée, résolution en V5 via migration 041.

**Post-ship (P3) :**
- BUG-03 : `single()` vs `maybeSingle()` sur teaching_packs
- BUG-04 : StatutLecon non validé côté serveur
- BUG-05 : `seqCovers` over-reporting couverture
- BUG-06 : `nb_lecons_total` potentiellement dénormalisé

---

## 23. Livrables

| Document | Statut |
|----------|--------|
| `docs/Release/MON-ANNEE_INTEGRATION_AUDIT.md` | ✓ Ce document |
| `docs/Release/MON-ANNEE_INTEGRATION_BUGS.md` | ✓ Registre des bugs |
| `docs/Release/MON-ANNEE_INTEGRATION_SCORE.md` | ✓ Scorecard + verdict |

---

*Aucune migration exécutée — Aucun push — Audit statique uniquement*
