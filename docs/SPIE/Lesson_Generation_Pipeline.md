# Pipeline de génération de leçon — SSE 13 étapes

**SPIE-BETA-03 M4 | Statut : ✅ Implémenté**

Route : `POST /api/spie/lesson-engine`  
Corps : `{ teaching_pack_id, forcer_regeneration? }`  
Retour : SSE stream de `LessonGenerationEvent`

## Vue d'ensemble

Le pipeline génère la `DetailedLesson` en 13 étapes séquentielles diffusées via Server-Sent Events. Chaque étape envoie un événement `LessonGenerationEvent` avec `step`, `statut`, `message`, `progress (0-100)`.

## Étapes du pipeline

| # | Step SSE | IA | Modèle | Tokens max | Description |
|---|----------|----|--------|------------|-------------|
| 1 | `validation` | ❌ | — | — | Vérification accès + Teaching Pack |
| 2 | `resultats_curriculaires` | ❌ | — | — | Extraction RAG depuis plan annuel |
| 3 | `objectifs` | ✅ | haiku | 1500 | 3 objectifs observables (Bloom) |
| 4 | `deroulement` | ✅ | haiku | 1500 | 3 phases avant/pendant/après |
| 5 | `activites` | ✅ | **sonnet** | 2500 | 3 activités prêtes à utiliser |
| 6 | `contenu` | ✅ | **sonnet** | 2000 | Sections de contenu pédagogique |
| 7 | `evaluation_formative` | ✅ | haiku | 1000 | Méthode + critères |
| 8 | `quiz` | ✅ | haiku | 1500 | N questions QCM/VF/RC |
| 9 | `corrige` | ✅ | haiku | 1500 | Corrigé enseignant |
| 10 | `differentiation` | ✅ | haiku | 1000 | Soutien / adaptation / enrichissement |
| 11 | `verification_temps` | ❌ | — | — | Calcul déterministe de la durée totale |
| 12 | `quality_gate` | ❌ | — | — | 13 vérifications (DL-001→DL-013) |
| 13 | `persistance` | ❌ | — | — | Sauvegarde `fichiers_dossier` + `pack_versions` |

## Modèles IA utilisés

- **Sonnet** (`claude-sonnet-4-6`) : activités (riche, contextualisé) + contenu (dense, adapté au niveau)
- **Haiku** (`claude-haiku-4-5-20251001`) : toutes les autres étapes IA (structured JSON, rapide)

"Powered by Claude" n'apparaît jamais dans les outputs ni dans l'interface.

## Événement SSE

```typescript
type LessonGenerationEvent = {
  step: LessonGenerationStep
  statut: 'en_cours' | 'termine' | 'erreur' | 'ignore'
  message: string
  progress: number          // 0–100
  data?: Partial<DetailedLesson>
  fichier_id?: string       // défini sur l'étape 'termine'
}
```

## Persistance (étape 13)

1. Calcul de la `QualityGateResultat` via `verifierDetailedLesson()`
2. `INSERT` dans `fichiers_dossier` : `type_fichier='lecon_detaillee'`, `contenu_json`, `contenu_html=JSON.stringify`
3. `INSERT` dans `pack_versions` : version 1
4. `UPDATE teaching_packs SET lecon_detaillee_id=..., lecon_detaillee_statut='generee'`

## Idempotence

Si `teaching_packs.lecon_detaillee_id` est déjà défini, le pipeline retourne immédiatement l'événement `termine` avec le `fichier_id` existant — sauf si `forcer_regeneration = true`.

---

*Voir aussi : [Detailed_Lesson.md](Detailed_Lesson.md) · [Activity_Generation.md](Activity_Generation.md)*
