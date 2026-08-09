# Execution Runtime Contract — ME-13.5

## Aperçu

Le contrat d'exécution définit les garanties que l'Execution Engine offre à ses consommateurs (UI, API, tests) sur la structure, la sécurité et le comportement des `ExecutionPlan` produits.

## Pipeline d'exécution

```
Mission / MissionBundle
        │
        ▼
ExecutionContext          ← buildExecutionContext()
        │
        ▼
ExecutionRegistry         ← registry.resolve(context) → ExecutionTemplate
        │
        ▼
ExecutionRecipe           ← template.buildRecipe(context)
        │
        ▼
ExecutionPlanBuilder      ← planBuilder.build(recipe, context)
        │
        ├── validateExecutionRecipe()   (15 checks)
        ├── buildExecutionStep() ×N
        ├── assignStatuses()
        ├── buildExecutionPlanSummary()
        ├── computeBlockingReasons()
        └── validateExecutionPlan()    (14 checks)
        │
        ▼
ExecutionPlan             ← consommé par l'UI et l'API
```

## Garanties du contrat

### 1. Validité structurelle

Tout `ExecutionPlan` produit par `ExecutionEngine.createPlan()` passe `validateExecutionPlan()` avec `valid: true`.

- `plan.id` = `execution:{sourceId}` (déterministe)
- `step.id` = `{planId}:step:{code}` (déterministe)
- Les codes d'étapes sont uniques au sein d'un plan
- Les ordres sont séquentiels à partir de 1
- `createdFromVersion` = `EXECUTION_VERSION` ('ME-13.5')

### 2. Sécurité — données jamais exposées

Les champs suivants ne doivent **jamais** apparaître dans un `ExecutionPlan` public :

| Champ interdit | Raison |
|---|---|
| `texteExtrait` | contenu de document privé |
| `system_prompt` | prompt interne du LLM |
| `storage_path` | chemin de stockage interne |
| `token` / clé API | credentials |
| `priority_student_ids` | identifiants d'élèves |
| nom d'élève individuel | données nominatives |
| note individuelle | données confidentielles |
| absence individuelle | données confidentielles |

Cette garantie est vérifiée par les tests RE13, EE17, EE19, RC02, RC06.

### 3. Routes valides uniquement

Toute route dans un plan doit satisfaire :
```
route === '/dashboard'  ||  route.startsWith('/dashboard/')
```
`null` est valide (aucune route recommandée). Les URLs externes, les routes hors `/dashboard`, et les routes inventées sont rejetées.

La whitelist des query params autorisés est :
```
classe_id | matiere | mission_key | event_id | document_id
mode      | source  | type        | sujet    | conversation
```

### 4. Statuts des étapes

- Exactement **1 step** a le statut `'available'` si `canStart === true`
- Les étapes avec un `requirement` bloquant non satisfait ont le statut `'blocked'`
- Toutes les autres ont le statut `'pending'`

### 5. Capabilities

Chaque `ExecutionStep` possède un champ `capability: ExecutionCapability` (36 valeurs définies dans `EXECUTION_CAPABILITY_CATALOG`). La capability est :
- stable entre les versions (identité métier, pas un libellé)
- indépendante du texte affiché, de la langue et de la route
- toujours présente dans le catalogue (`getCapabilityDefinition()` ne retourne jamais `undefined`)

### 6. Déterminisme

À entrée égale (même `Mission` / `MissionBundle`), `createPlan()` produit toujours le même `plan.id` et les mêmes `step.id`. Aucun UUID aléatoire, aucun timestamp dans les identifiants.

### 7. Robustesse (production)

- Si la recette produite par un template est invalide → fallback vers `GenericTemplate`
- Si le plan produit par le builder est invalide → fallback vers `GenericTemplate`
- En développement (`NODE_ENV !== 'production'`), ces cas lèvent une erreur pour faciliter le débogage
- `GenericTemplate` produit toujours une recette valide

## Couche intermédiaire : ExecutionRecipe

`ExecutionRecipe` est la représentation intermédiaire entre le template et le plan final.

| Champ | Description |
|---|---|
| `id` | même valeur que `plan.id` (`makePlanId(sourceId)`) |
| `version` | `EXECUTION_RECIPE_VERSION = 'execution-recipe-v1'` |
| `steps` | 1 à `MAX_RECIPE_STEPS` (10) étapes |
| `steps[].capability` | capability de l'étape (required) |
| `steps[].kind` | override optionnel du `defaultKind` du catalogue |

La recette est validée par `validateExecutionRecipe()` (15 checks) avant la construction du plan.

## Interface des templates

```typescript
interface ExecutionTemplate {
  id: string
  supports(context: ExecutionContext): boolean
  buildRecipe(context: ExecutionContext): ExecutionRecipe
}
```

Les templates ne produisent plus directement un `ExecutionPlan`. Ils produisent une `ExecutionRecipe`, et `ExecutionPlanBuilder.build()` se charge de la convertir en plan final avec statuts, IDs, summary et validation.

## Templates enregistrés

| Template | Conditions |
|---|---|
| `NextLessonTemplate` | `mission.type === 'next_lesson'` ou `'unfinished_document'` |
| `EvaluationTemplate` | `mission.type === 'evaluation'` |
| `WorkTemplate` | `mission.type === 'work'` |
| `StudentFollowUpTemplate` | `mission.type === 'student_follow_up'` |
| `DeadlineTemplate` | `mission.type === 'deadline'` |
| `BundleTemplate` | `bundle !== null` |
| `GenericTemplate` | fallback (toujours en dernier) |

## Versionnement

`EXECUTION_VERSION` ('ME-13.5') est incrémenté à chaque changement de structure du plan ou de contrat. `EXECUTION_RECIPE_VERSION` ('execution-recipe-v1') est incrémenté si le schéma de recette change (capability renommée, champ requis ajouté, sémantique modifiée).

---

*Document généré pour ME-13.5 — Execution Engine Consolidation : Recipes, Capabilities and Runtime Contract*
