# Build Trace Model — Pipeline "Construire mon année scolaire"
## Modèle de trace structurée SPIE-DIAGNOSTIC-01

**Statut :** SPIE-DIAGNOSTIC-01 · Actif  
**Dernière mise à jour :** 2026-08-09

---

## Vue d'ensemble

Le pipeline `build-year` émet deux types de signaux de trace :
1. **BuildState** — trace persistée en DB (`teaching_packs.contenu_json.build_state`)
2. **Console logs** — trace serveur en temps réel (`console.error` structuré)

Ces deux sources permettent de reconstituer le déroulement exact d'une exécution,
même après un crash ou une déconnexion.

---

## Structure de trace — BuildState

```typescript
type BuildState = {
  buildId:          string    // UUID unique par run
  startedAt:        string    // ISO 8601
  completedAt?:     string    // ISO 8601 — absent si interrompu
  pack:             StepResult
  curriculum:       StepResult
  syllabus:         StepResult
  programme_annuel: StepResult
  plans_lecon:      StepResult
  premiere_lecon:   StepResult
  quiz:             StepResult
  finalized:        boolean   // true = pipeline terminé (success ou partiel)
}

type StepResult = {
  status:    'pending' | 'success' | 'error' | 'skipped'
  objectId?: string    // UUID de l'objet créé en DB
  persisted: boolean   // écriture DB confirmée
  verified:  boolean   // relecture DB confirmée
  createdAt?: string   // ISO 8601
  error?:    string    // message d'erreur si status === 'error'
}
```

### Où est stocké le BuildState ?

```
teaching_packs.contenu_json.build_state
```

Le champ `contenu_json` est JSONB (migration 036). Aucune migration supplémentaire requise.

### Cycle de vie du BuildState

```
initBuildState()
  → pack:             pending
  → curriculum:       pending
  → syllabus:         pending
  → programme_annuel: pending
  → plans_lecon:      pending
  → premiere_lecon:   pending
  → quiz:             pending
  → finalized: false

[après chaque étape]
  → buildState.<step> = stepSuccess(objectId?) | stepError(msg) | stepSkipped()
  → supabase UPDATE teaching_packs SET contenu_json = ... WHERE id = packId

[fin de pipeline]
  → buildState.completedAt = ISO
  → buildState.finalized = true
  → dernier UPDATE teaching_packs
```

---

## Structure de trace — Console logs

Format unifié pour tous les logs serveur du pipeline :

```
[build-year][<step>] <NIVEAU> <description>
  { packId, classeId?, error?, raw?, detail? }
```

### Exemples

```
[build-year][syllabus] FAIL parse/call
  { packId: "uuid", error: "Unexpected token", raw: "{\"titre_cours\": ..." }

[build-year][syllabus] FAIL validation
  { packId: "uuid", detail: "titre_cours absent — raw[0:200]: ..." }

[build-year][programme_annuel] DB insertErr
  { packId: "uuid", error: "column genere_par_ia does not exist" }
```

---

## Étapes et dépendances

```
ÉTAPE 1 — Pack (upsert teaching_packs)
  └─→ packId  ─────────────────────────────────────────────────────┐
                                                                    │
ÉTAPE 2 — Curriculum (Claude → contenu texte)                      │
  └─→ curriculumCtx                                                 │
                                                                    │
ÉTAPE 3 — Syllabus (Claude JSON → programme_annuel.syllabus_json)  │
  └─→ syllabus object                                               │
                                                                    │
ÉTAPE 4 — Plan annuel (Claude JSON → programme_annuel)             │
  └─→ progId  ──────────────────────────────────────────────────┐   │
               │                                                │   │
ÉTAPE 5 — Plans de leçon (extraits de contenu_json)            │   │
  └─→ plans[]  ──────────────────────────────────────────────┐  │   │
                │                                             │  │   │
ÉTAPE 6 — Première leçon (Claude HTML → fichiers_dossier)   │  │   │
  └─→ premiereLeconId                                        │  │   │
                                                             │  │   │
ÉTAPE 7 — Quiz (Claude HTML → fichiers_dossier)             │  │   │
  └─→ quizId                                                │  │   │
                                                             │  │   │
ÉTAPE 8 — Sauvegarde BuildState ◄────────────────────────────┘  │   │
  UPDATE teaching_packs ◄────────────────────────────────────────┘   │
    SET programme_annuel_id = progId ◄──────────────────────────────┘
```

### Règle de propagation d'erreur

Si une étape critique échoue, les étapes suivantes qui en dépendent
reçoivent `stepError('Dépendance manquante : <step>')`.

| Si... | Alors... |
|-------|---------|
| `packId = null` | Toutes les étapes → error |
| `progId = null` | plans_lecon, premiere_lecon, quiz → error |
| `leconId = null` | quiz reste indépendant (même dossier) |

---

## Lecture du BuildState depuis l'API

### Endpoint founder (diagnostic complet)

```
GET /api/founder/build-debug?packId=<uuid>
```

Retourne :
```json
{
  "packId": "...",
  "packStatut": "partiellement_genere",
  "buildState": { ... },
  "steps": [
    { "step": "pack",             "result": { "status": "success", "objectId": "...", "persisted": true } },
    { "step": "programme_annuel", "result": { "status": "error",   "error": "column genere_par_ia...", "persisted": false } },
    ...
  ],
  "failingSteps": [
    { "step": "programme_annuel", "result": { ... } }
  ],
  "diagnosis": {
    "firstFailingStep": "programme_annuel",
    "firstFailingError": "column genere_par_ia does not exist",
    "realStatus": "erreur",
    "missingElements": ["programme_annuel", "syllabus", "premiere_lecon", "quiz"]
  }
}
```

### Endpoint utilisateur (vérification complétude)

```
POST /api/spie/verify-pack
Body: { "pack_id": "uuid", "classe_id": "uuid" }
```

---

## Interprétation rapide

| `build_state` absent | Pipeline jamais démarré ou pack créé avant SPIE-PERSISTENCE-01 |
|---------------------|----------------------------------------------------------------|
| `finalized: false`  | Pipeline interrompu (crash, timeout, déconnexion) |
| `finalized: true` + statut `erreur` | Pipeline terminé mais étapes critiques failed |
| `finalized: true` + statut `pret`   | Pack complet — tous les objectIds présents en DB |

---

## Voir aussi

- [SPIE-DIAGNOSTIC-01_Report.md](SPIE-DIAGNOSTIC-01_Report.md) — Root causes et corrections
- [Build_Debugging_Guide.md](Build_Debugging_Guide.md) — Procédure pas-à-pas
- [Build_Checkpoints.md](Build_Checkpoints.md) — BuildState complet
- [Persistence_Pipeline.md](Persistence_Pipeline.md) — Pattern GENERATE→VERIFY
