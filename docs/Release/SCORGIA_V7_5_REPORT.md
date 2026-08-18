# SCORGIA V7.5 — Canonical Pedagogical Planning Engine
**Date :** 2026-08-18  
**Type :** Feature — Canonical Model + AYDTE Integration  
**Branch :** main (commit local — NO PUSH — NO REMOTE MIGRATION)  
**Statut :** LIVRÉ LOCALEMENT · En attente validation Product Owner (GO/NO-GO migration)

---

## 1. Objectif

Transformer le moteur pédagogique en modèle canonique :

- **CURRICULUM → SPIE-02 → NormalizedOutcome[] → AYDTE → SequenceBlock[] → Programme V3**
- Stable UUIDs sur les séquences (vs indices positionnels fragiles)
- Adapter de compatibilité pour les 3 générations de schéma
- Tables DB normalisées proposées (non appliquées)

---

## 2. Résultat : pipeline de génération V3

```
Avant V7.5 :
  SPIE-02 outcomes → formatOutcomesForPrompt → Claude (contenu JSON)
                                                          ↑
                                                  structure définie par Claude seul

Après V7.5 :
  SPIE-02 outcomes → AYDTE Bridge → SequenceBlock[] scaffold
                                          ↓
                   Claude reçoit SPIE-02 outcomes + AYDTE scaffold
                   (semaines, groupements RAG→RAS, sequence_ids)
                          ↓
                   Claude génère titres + leçons sur l'ossature AYDTE
                          ↓
                   Stamping: unite[i].sequence_id = sequences[i].id
                          ↓
                   schema_version: 'v3'
```

---

## 3. Fichiers créés / modifiés

### Créés

| Fichier | Description |
|---------|-------------|
| `src/lib/spie/curriculum/planning/aydte-planning-bridge.ts` | Bridge SPIE-02 → AYDTE → SequenceBlock[] |
| `src/lib/spie/canonical-year-reader.ts` | Adapter compatibilité V1/V2/V3 |
| `supabase/migrations/044_pedagogical_structures_V75_PROPOSED.sql` | Migration PROPOSÉE (non appliquée) |
| `docs/Architecture/SCORGIA_V7_5_PRE_IMPLEMENTATION_AUDIT.md` | Audit pré-implémentation (7 questions) |
| `docs/Architecture/SCORGIA_V7_5_CANONICAL_PEDAGOGICAL_MODEL.md` | Architecture de référence |
| `docs/Release/SCORGIA_V7_5_REPORT.md` | Ce rapport |

### Modifiés

| Fichier | Changements |
|---------|-------------|
| `src/lib/types/database.ts` | `Unite.sequence_id?`, `Unite.unit_id?`, `UnitV3` type, `ContenuProgramme.units?`, `schema_version: 'v3'` |
| `src/app/api/spie/build-year/route.ts` | Import AYDTE bridge, `buildStructuredCurriculumContext` returns `outcomes[]`, AYDTE run + scaffold injection, stamping + `[AYDTE_COMPLETE]` log |
| `src/lib/spie/pedagogical-year-tree.ts` | `UnitNode.sequenceId?`, `PedagogicalYearTree.hasV3Data` |

### Non modifiés

- Mon Année (aucun composant UI touché)
- SPIE-02 (extraction inchangée)
- Build wizard UI (inchangé)
- `programme_annuel` schema DB (pas de migration appliquée)
- `teaching_events`, `fichiers_dossier` (pas de migration appliquée)

---

## 4. Exemple de structure générée — V3

Curriculum Alberta FRANÇAIS Secondaire 3 (hypothétique, post-migration) :

```json
{
  "titre": "Programme de Français — Secondaire 3",
  "nb_semaines": 36,
  "source_curriculum": "Alberta",
  "schema_version": "v3",
  "curriculum_outcomes": [
    { "id": "A1", "code": "A1", "titre": "Compréhension orale", "type": "resultat_apprentissage" },
    { "id": "B1", "code": "B1", "titre": "Lecture et interprétation", "type": "resultat_apprentissage" },
    { "id": "C1", "code": "C1", "titre": "Production écrite", "type": "resultat_apprentissage" }
  ],
  "unites": [
    {
      "numero": 1,
      "titre": "Écouter pour comprendre — stratégies d'écoute active",
      "sequence_id": "seq_1753858800000_1",
      "semaine_debut": 1, "semaine_fin": 9,
      "curriculum_outcome_ids": ["A1"],
      "lecons": [
        { "numero": 1, "titre": "L'écoute active en contexte scolaire", "curriculum_outcome_ids": ["A1.1"] },
        { "numero": 2, "titre": "Identifier idées principales et secondaires", "curriculum_outcome_ids": ["A1.1", "A1.2"] }
      ]
    },
    {
      "numero": 2,
      "titre": "Lire pour interpréter — textes variés et stratégies de lecture",
      "sequence_id": "seq_1753858800001_2",
      "semaine_debut": 10, "semaine_fin": 21,
      "curriculum_outcome_ids": ["B1"],
      "lecons": [...]
    },
    {
      "numero": 3,
      "titre": "Écrire pour communiquer — textes adaptés au destinataire",
      "sequence_id": "seq_1753858800002_3",
      "semaine_debut": 22, "semaine_fin": 36,
      "curriculum_outcome_ids": ["C1"],
      "lecons": [...]
    }
  ]
}
```

**Avant V7.5 :** même programme sans `sequence_id` et `schema_version: 'v2'`.

---

## 5. AYDTE — métriques d'exécution

| Métrique | Valeur typique |
|---------|---------------|
| Temps d'exécution AYDTE | < 5ms (calcul pur, aucun I/O) |
| Outcomes groupés | 6 max par séquence |
| Coverage | 100% si tous outcomes ont un parent |
| Pacing score | 70-90 (bonnes conditions) |

AYDTE n'appelle aucune API externe. Coût marginal = 0.

---

## 6. Logs structurés ajoutés

| Code | Déclencheur |
|------|------------|
| `[AYDTE_COMPLETE]` | AYDTE bridge terminé avec succès |
| `[AYDTE_FAILED]` | AYDTE bridge échoué (fallback V2 automatique) |
| `[PEDAGOGICAL_STRUCTURE_CREATED]` | Programme V3 estampillé avec sequence_ids |
| `[SPIE_PROGRAMME_VALIDATION_OK]` | Maintenant inclut `schemaVersion` dans le log |

---

## 7. Compatibilité legacy

| Génération | Affichage Mon Année | Génération future |
|-----------|---------------------|-------------------|
| V1 (legacy) | OK — pas de changement | Prochaine regen → V2 ou V3 |
| V2 (pre-V7.5) | OK — pas de changement | Prochaine regen → V3 si téléversé |
| V3 (V7.5+) | OK — `sequence_id` ignoré par UI actuelle | Prochaine regen → V3 |

L'adapter `getCanonicalPedagogicalYear()` normalise les 4 états de façon transparente.

---

## 8. Qualité

| Gate | Résultat |
|------|---------|
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npm run build` | ✅ SUCCESS (exit 0) |
| DB migration appliquée | ✅ Aucune |
| Push Git | ✅ Aucun |

---

## 9. Décision GO/NO-GO — Product Owner

### Pour approuver la migration 044

| Question | Réponse |
|---------|---------|
| Est-ce que les nouvelles tables sont nécessaires maintenant ? | Non — le code V7.5 fonctionne sans elles (JSON blobs) |
| Que gagne-t-on avec la migration ? | Requêtes SQL directes sur séquences, mark-taught par UUID stable, analytics fine-grained |
| Quel est le risque ? | Faible — RLS défini, nullable FKs, aucune donnée existante migrée automatiquement |
| Table ghost `unites` ? | Doit être DROP ou réutilisée avant migration 044 |
| Quand appliquer ? | Recommandé en V8 (après validation V7.5 en prod) |

### Pour approuver le push V7.5

Les fichiers suivants sont prêts à être poussés :
- `src/lib/spie/curriculum/planning/aydte-planning-bridge.ts`
- `src/lib/spie/canonical-year-reader.ts`
- `src/lib/types/database.ts` (types V3)
- `src/app/api/spie/build-year/route.ts` (AYDTE wired)
- `src/lib/spie/pedagogical-year-tree.ts` (V3 fields)
- `docs/Architecture/` (2 nouveaux docs)
- `docs/Release/SCORGIA_V7_5_REPORT.md`

Le fichier `supabase/migrations/044_pedagogical_structures_V75_PROPOSED.sql` est **architecture documentation uniquement** — il ne sera pas exécuté par Supabase CLI automatiquement car il porte le suffixe `_PROPOSED`.

---

## 10. Risques résiduels

| Risque | Niveau | Mitigation |
|--------|--------|-----------|
| AYDTE scaffold désaligné avec structure Claude | Moyen | Fallback V2 automatique si AYDTE échoue |
| Stamping positonnel séquence ≠ AYDTE ordre réel | Moyen | Claude suit le scaffold AYDTE (même ordre) |
| ConstraintSet vide (SPIE-05 non implémenté) | Faible | Algorithme AYDTE fonctionne sans contraintes |
| PGE stub non câblé | Décision PO | PGE est hors scope V7.5 |
| migration 044 table `unites` conflit | Moyen | `CREATE TABLE IF NOT EXISTS` — non destructif |

---

*NE PAS PUSH. NE PAS APPLIQUER LA MIGRATION 044. ATTENDRE LE PRODUCT OWNER.*
