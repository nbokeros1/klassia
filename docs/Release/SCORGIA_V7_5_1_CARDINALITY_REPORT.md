# SCORGIA V7.5.1 — Cardinality Audit & Fix Report

**Version :** V7.5.1  
**Date :** 2026-08-18  
**Auteur :** ScorgIA  
**Statut :** LOCAL COMMIT — DO NOT PUSH — WAIT FOR PRODUCT OWNER

---

## 1. Was V7.5 implementing 1 unit = 1 sequence?

**YES.** V7.5 committed with a fundamental cardinality violation:

```typescript
// V7.5 — positional stamping (SUPPRIMÉ en V7.5.1)
unites.forEach((u, i) => {
  u.sequence_id = sequences[i]?.id  // 1:1 positional assumption
})
```

The type `units?: UnitV3[]` était déclaré dans `ContenuProgramme` mais **jamais populé**. Claude ne recevait aucun niveau macro-unité dans son prompt. Le résultat : chaque `unite` JSON = 1 `SequenceBlock` AYDTE, avec `sequence_id` potentiellement `undefined` si Claude générait plus de séquences que AYDTE.

---

## 2. Cause racine

Trois sources convergentes :

1. **Bridge** : `aydte-planning-bridge.ts` retournait uniquement `sequences: SequenceBlock[]` sans niveau supérieur. Aucune logique de regroupement par domaine.
2. **Prompt Claude** : le format JSON montré à Claude ne contenait pas `units[]`. Claude ne pouvait pas générer ce qu'il ne voyait pas.
3. **Stamping** : `route.ts` faisait `unites[i].sequence_id = sequences[i]?.id` — correspondance positionnelle fragile, silencieusement fausse si les comptes divergent.

---

## 3. Modèle UNIT canonique final

### TypeScript (`src/lib/types/database.ts`)

```typescript
// Macro-niveau — 1 unité → N séquences (N ≥ 1)
export type UnitV3 = {
  id:           string
  numero:       number
  titre:        string
  sequence_ids: string[]   // 1:N — séquences dans cette unité
  outcome_ids:  string[]
}

// Micro-niveau — 1 séquence → N leçons (N ≥ 1)
export type Unite = {
  ...
  sequence_id?: string    // stable AYDTE SequenceBlock.id
  unit_id?:     string    // référence vers UnitV3.id
}
```

### Scaffold (`UnitScaffold` dans `aydte-planning-bridge.ts`)

```typescript
export interface UnitScaffold {
  unitId:      string     // stable — Claude DOIT préserver
  ordre:       number     // 1-based
  domainCode:  string     // "A", "B", "C" — préfixe du code RAG
  titre:       string     // placeholder — Claude remplace
  outcomeIds:  string[]   // tous les outcomes de l'unité
  sequenceIds: string[]   // IDs stables (1..N par unité)
}
```

---

## 4. Modèle SEQUENCE canonique final

Chaque `SequenceBlock` AYDTE correspond à un `Unite` JSON. Plusieurs `Unite` peuvent appartenir à la même `UnitV3`.

```
UNIT A (unit_id: "unit-a-...")
  └── SEQUENCE A1 (sequence_id: "seq-a1-...") → 3 leçons
  └── SEQUENCE A2 (sequence_id: "seq-a2-...") → 4 leçons

UNIT B (unit_id: "unit-b-...")
  └── SEQUENCE B1 (sequence_id: "seq-b1-...") → 2 leçons
```

**2 unités, 3 séquences, 9 leçons — jamais 1:1 forcé.**

---

## 5. Modèle LESSON canonique final

Chaque leçon (`LeconProgramme`) vit à l'intérieur d'une séquence (`Unite`). Elle hérite de `sequence_id` et `unit_id` de son parent.

```typescript
export type LeconProgramme = {
  numero:        number
  titre:         string
  sujet:         string
  duree_minutes: number
  type:          'introduction' | 'developpement' | 'evaluation' | 'synthese'
  // sequence_id et unit_id hérités du Unite parent (pas stockés redondamment)
}
```

---

## 6. Stamping positionnel supprimé ?

**OUI.** Le bloc de stamping positionnel de `route.ts` est remplacé par :

```typescript
// V7.5.1 — reconstruction par ID (authoritative)
const scaffold = {
  units:       aydteBridgeResult.units,
  sequenceIds: aydteBridgeResult.sequences.map(s => s.id),
}
const reconstructed = reconstructFromScaffold(parsedProg, scaffold.units, aydteBridgeResult.sequences)
const structureCheck = validateV3Structure(reconstructed, scaffold)
programme = { ...reconstructed, schema_version: 'v3' as const }
```

`reconstructFromScaffold()` :
1. Tente d'abord une correspondance par `sequence_id` (Claude a préservé l'ID exact)
2. Fallback positionnel uniquement quand aucune correspondance ID n'est trouvée
3. Peuple `units[]` depuis le scaffold AYDTE de façon autoritaire (Claude ne peut pas supprimer les unités)

---

## 7. Structure curriculum réelle — Français Secondaire 3 (simulation)

Simulation avec 3 RAG (A = Communication orale, B = Lecture, C = Écriture) :

```
Entrée AYDTE : 9 outcomes (3 RAG + 2+1+3 RAS)

Sortie bridge V7.5.1 :
  UNITÉ 1 [domainCode: "A"] — "Communication orale"
    → SÉQUENCE A1 [sequence_id: "seq-a-..."]
        RAG A1 + RAS A1.1, A1.2
        Semaines 1→12, 34h

  UNITÉ 2 [domainCode: "B"] — "Littératie textuelle"
    → SÉQUENCE B1 [sequence_id: "seq-b-..."]
        RAG B1 + RAS B1.1
        Semaines 13→24, 34h

  UNITÉ 3 [domainCode: "C"] — "Production écrite"
    → SÉQUENCE C1 [sequence_id: "seq-c-..."]
        RAG C1 + RAS C1.1, C1.2, C1.3
        Semaines 25→36, 34h

Résultat : 3 unités, 3 séquences (naturel, pas forcé 1:1)
```

Si domaine A avait 2 RAG :
```
  UNITÉ 1 [domainCode: "A"]
    → SÉQUENCE A1 (RAG A1 + RAS)
    → SÉQUENCE A2 (RAG A2 + RAS)   ← 1 unité, 2 séquences
```

---

## 8. Tests de cardinalité (Cases A–H)

**Fichier :** `src/lib/spie/curriculum/__tests__/v751-cardinality.test.ts`

| Case | Scénario | Assertion clé |
|------|----------|---------------|
| A | 2 RAG (A + B) | units.length ≤ sequences.length ; chaque séquence dans exactement 1 unité |
| B | 1 RAG (A) avec 4 RAS | 1 seule unité produite, ≥ 1 séquence dans l'unité |
| C | 3 RAG (A, B, C) | 3 unités ; domaines = ["A","B","C"] ; pas de 1:1 forcé |
| D | Outcomes partagés (cross-séquence) | Tous les IDs outcome couverts dans séquences |
| E | Prérequis cross-séquence | Séquences ordonnées (ordre croissant monotone) |
| F | Programme V1 legacy | `validateV3Structure` : 0 erreur bloquante sans scaffold |
| G | Programme V2 | Validator : `valid = true`, `unitCount = 0`, `sequenceCount = 1` |
| H | Programme V3 canonique | 2 unités / 3 séquences / 9 leçons ; seq-a1 a 3 leçons, seq-a2 a 4 leçons |

**Règle méta vérifiée :**  
Aucun test n'assume `units.length === sequences.length`. La cardinalité est naturelle, issue du curriculum.

---

## 9. État tsc / build

```
npx tsc --noEmit    → 0 erreurs  ✅
npm run build       → exit 0     ✅
```

---

## 10. Migration 044 — mise à jour V7.5.1

**Ajout :** Table `pedagogical_units` (nouvelle en V7.5.1)

```sql
CREATE TABLE IF NOT EXISTS pedagogical_units (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teaching_pack_id     UUID NOT NULL REFERENCES teaching_packs(id) ON DELETE CASCADE,
  programme_annuel_id  UUID REFERENCES programme_annuel(id) ON DELETE SET NULL,
  enseignant_id        UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id            UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  numero               INTEGER NOT NULL,
  titre                TEXT NOT NULL,
  domain_code          TEXT,   -- "A", "B", "C" ou "G1" fallback
  curriculum_outcome_ids TEXT[] DEFAULT '{}',
  statut               TEXT NOT NULL DEFAULT 'planifiee',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_unit_numero_programme UNIQUE (programme_annuel_id, numero)
);
```

**Modification :** `pedagogical_sequences` gagne une FK nullable vers `pedagogical_units` :
```sql
unit_id UUID REFERENCES pedagogical_units(id) ON DELETE SET NULL
```

Hiérarchie DB finale :
```
pedagogical_units
  └── pedagogical_sequences (unit_id FK)
        └── pedagogical_lessons (sequence_id FK)
```

**Invariant DB à vérifier post-migration :**
```sql
SELECT unit_id, COUNT(*) FROM pedagogical_sequences GROUP BY unit_id;
-- Tout unit_id doit avoir ≥ 1 séquence.
```

---

## 11. Compatibilité UI

Aucun composant UI modifié. Les programmes V1 et V2 continuent de fonctionner via `getCanonicalPedagogicalYear()` (adapter `canonical-year-reader.ts`). Le schema_version 'v3' est opaque pour l'UI — les composants lisent uniquement les champs qu'ils connaissent.

---

## 12. Recommandation push (A/B/C)

**Recommandation : B — Push V7.5.1 en attente d'approbation PO, migration 044 non exécutée**

| Option | Description | Risque |
|--------|-------------|--------|
| **A** | Push V7.5 uniquement (violation cardinale en prod) | INACCEPTABLE — architecture invalide |
| **B** ✅ | Push V7.5.1 (code corrigé, cardinality OK, tsc+build 0) — migration 044 non exécutée | Minimal — JSON blob, pas de table relationnelle |
| **C** | Push V7.5.1 + exécuter migration 044 | Moyen — nouvelles tables, nécessite validation DBA |

**V7.5 ne doit pas être poussé avant V7.5.1** : il contient une violation de l'architecture canonique que cette release corrige.

---

## 13. Fichiers modifiés / créés

### Nouveaux
- `src/lib/spie/curriculum/planning/aydte-planning-bridge.ts` — réécrit (UnitScaffold, groupSequencesIntoUnits, formatTwoLevelScaffold)
- `src/lib/spie/validate-v3-structure.ts` — nouveau (validateV3Structure, reconstructFromScaffold)
- `src/lib/spie/curriculum/__tests__/v751-cardinality.test.ts` — tests cases A–H
- `docs/Release/SCORGIA_V7_5_1_CARDINALITY_REPORT.md` — ce rapport

### Modifiés
- `src/app/api/spie/build-year/route.ts` — stamping remplacé par reconstructFromScaffold + validateV3Structure
- `supabase/migrations/044_pedagogical_structures_V75_PROPOSED.sql` — ajout table `pedagogical_units` + FK `unit_id` sur `pedagogical_sequences`

### Non modifiés (V7.5 reste valide)
- `src/lib/types/database.ts` — UnitV3, Unite.sequence_id/.unit_id, ContenuProgramme.units[] déjà présents
- `src/lib/spie/pedagogical-year-tree.ts` — sequenceId sur UnitNode déjà présent
- `src/lib/spie/canonical-year-reader.ts` — buildV3Units() gérait déjà le 1:N

---

## 14. Décisions PO requises

1. **Approuver le push V7.5.1** (code uniquement, 0 migration)
2. **GO/NO-GO migration 044** (3 nouvelles tables, RLS inclus)
3. **Table ghost `unites`** — DROP ou réutiliser avant d'appliquer migration 044
