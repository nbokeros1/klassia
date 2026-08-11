# Build Checkpoints — BuildState
## Persistance de l'état de construction du Teaching Pack

**Statut :** SPIE-PERSISTENCE-01 · Actif  
**Dernière mise à jour :** 2026-08-09  
**Fichier :** `src/lib/spie/build-pipeline.ts`

---

## Pourquoi BuildState existe

Le pipeline `build-year` peut prendre 60–180 secondes. Si la connexion
est perdue à mi-chemin, l'état de chaque étape doit être récupérable
sans relancer tout le pipeline depuis zéro.

`BuildState` est l'enregistrement exhaustif de l'état de chaque étape,
persisté dans `teaching_packs.contenu_json.build_state`.

---

## Type BuildState

```typescript
// src/lib/spie/build-pipeline.ts

type StepStatus = 'pending' | 'success' | 'error' | 'skipped'

type StepResult = {
  status:    StepStatus
  objectId?: string       // ID de l'objet DB créé (ex: progId, leconId)
  persisted: boolean      // write DB tentée
  verified:  boolean      // re-lecture DB réussie
  createdAt?: string      // ISO timestamp de la résolution
  error?:    string       // message si status === 'error'
}

type BuildState = {
  buildId:          string       // UUID de cette session de build
  startedAt:        string       // ISO timestamp
  completedAt?:     string       // ISO timestamp (finalized = true)
  pack:             StepResult
  curriculum:       StepResult
  syllabus:         StepResult
  programme_annuel: StepResult
  plans_lecon:      StepResult
  premiere_lecon:   StepResult
  quiz:             StepResult
  finalized:        boolean
}
```

---

## Helpers

```typescript
// Crée un StepResult SUCCESS (persisted + verified = true)
stepSuccess(objectId?: string): StepResult

// Crée un StepResult ERROR
stepError(error: string): StepResult

// Crée un StepResult SKIPPED (reprise — étape déjà réussie)
stepSkipped(objectId?: string): StepResult

// Initialise tous les steps à 'pending'
initBuildState(): BuildState
```

---

## Cycle de vie d'un StepResult

```
[pending]
    │
    ├─ GENERATE+VALIDATE réussi
    │       │
    │       ├─ PERSIST réussi
    │       │       │
    │       │       ├─ VERIFY réussi → [success] objectId=<id>
    │       │       │
    │       │       └─ VERIFY échoué → [error] "introuvable après écriture"
    │       │
    │       └─ PERSIST échoué → [error] "Insert échoué : ..."
    │
    ├─ VALIDATE échoué → [error] "champs obligatoires manquants"
    │
    └─ Reprendre + already success → [skipped] objectId=<id>
```

---

## Persistance dans teaching_packs

```typescript
// Dans teaching_packs.contenu_json (TeachingPackContenu)
contenu_json: {
  syllabus: { ... },
  nb_unites: 6,
  nb_lecons_planifiees: 30,
  nb_lecons_generees: 1,
  premiere_lecon_complete: true,
  premiere_lecon_id: "uuid-...",
  premier_quiz_id: "uuid-...",
  etapes_completees: ["validation", "curriculum", "syllabus", ...],
  build_state: {               // ← BuildState complet
    buildId: "uuid-...",
    startedAt: "2026-08-09T...",
    completedAt: "2026-08-09T...",
    pack:             { status: "success", objectId: "uuid-...", ... },
    curriculum:       { status: "success", ... },
    syllabus:         { status: "success", ... },
    programme_annuel: { status: "success", objectId: "uuid-...", ... },
    plans_lecon:      { status: "success", ... },
    premiere_lecon:   { status: "success", objectId: "uuid-...", ... },
    quiz:             { status: "success", objectId: "uuid-...", ... },
    finalized:        true
  }
}
```

---

## Lecture du BuildState côté client

Dans `programme/page.tsx` :

```typescript
const buildState = pack?.contenu_json?.build_state as BuildState | undefined

const missing = {
  syllabus:      !buildState?.syllabus?.objectId && !pack?.programme_annuel_id,
  plan_annuel:   buildState?.programme_annuel?.status !== 'success',
  premiere_lecon: buildState?.premiere_lecon?.status !== 'success',
  quiz:          buildState?.quiz?.status !== 'success',
}

const hasPartialBuild = pack && (
  missing.syllabus || missing.plan_annuel ||
  missing.premiere_lecon || missing.quiz
)
```

---

## etapes_completees vs BuildState

| Champ | Rôle |
|-------|------|
| `etapes_completees` | Liste des étapes avec `status === 'success'` (pour l'affichage UI) |
| `build_state` | Objet complet avec objectIds, timestamps, erreurs (pour la reprise et le diagnostic) |

`etapes_completees` est une projection de `build_state` — elle ne contient
que les étapes réussies. `build_state` est la source de vérité complète.

---

## Voir aussi

- [Persistence_Pipeline.md](Persistence_Pipeline.md) — pattern GENERATE→VERIFY
- [Build_Recovery.md](Build_Recovery.md) — utilisation de BuildState pour reprendre
- [Teaching_Pack_Completeness.md](Teaching_Pack_Completeness.md) — vérification finale
- [Build_Trace_Model.md](Build_Trace_Model.md) — trace complète et endpoint founder debug
- [Build_Debugging_Guide.md](Build_Debugging_Guide.md) — procédure de débogage step-by-step
