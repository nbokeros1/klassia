# Teaching Pack Completeness
## verifyTeachingPackCompleteness — vérification finale depuis DB

**Statut :** SPIE-PERSISTENCE-01 · Actif  
**Dernière mise à jour :** 2026-08-09  
**Fichier :** `src/lib/spie/build-pipeline.ts`  
**Endpoint :** `POST /api/spie/verify-pack`

---

## Pourquoi une vérification de complétude

L'étape de finalisation du pipeline ne peut pas se fier à l'état en mémoire
(`programme !== null`, `premiereLeconId !== null`) pour déterminer le statut
final du Teaching Pack. Ces variables pourraient être non-nulles en mémoire
alors que les INSERT en DB ont échoué silencieusement.

`verifyTeachingPackCompleteness` re-lit **toutes** les données depuis Supabase
et détermine le statut réel du pack à partir de ce qui existe en base.

---

## Signature

```typescript
type CompletenessResult = {
  complete:        boolean
  missingElements: string[]         // ex: ['syllabus', 'premiere_lecon']
  status:          TeachingPackStatut  // 'pret' | 'partiellement_genere' | 'erreur'
  counts: {
    sequences:       number
    plans_lecon:     number
    lecons_completes: number
    quiz:            number
  }
}

async function verifyTeachingPackCompleteness(
  supabase:    SupabaseClient,
  packId:      string,
  classeId:    string,
  entitlement: BetaEntitlement,
): Promise<CompletenessResult>
```

---

## Logique de vérification (ordre)

```
1. Lire teaching_packs WHERE id = packId
   → si null : { complete: false, missing: ['pack'], status: 'erreur' }

2. Lire programme_annuel WHERE id = pack.programme_annuel_id
   → si null : ajouter 'programme_annuel' aux manquants
   → sinon : vérifier syllabus_json.titre_cours ET contenu_json.unites.length > 0

3. Syllabus check :
   → prog.syllabus_json.titre_cours présent ?
   → prog.syllabus_json.resultats_apprentissage.length > 0 ?
   → si non : ajouter 'syllabus' aux manquants

4. Compter fichiers_dossier WHERE classe_id = classeId :
   → type_fichier = 'lecon_complete' → counts.lecons_completes
   → type_fichier = 'quiz'           → counts.quiz

5. Si entitlement.first_lesson_complete :
   → counts.lecons_completes === 0 → ajouter 'premiere_lecon'

6. Si entitlement.first_lesson_quiz :
   → counts.quiz === 0 → ajouter 'quiz'

7. Déterminer statut :
   → missingElements.length === 0 → 'pret'
   → 'programme_annuel' dans missing → 'erreur'
   → autres manquants → 'partiellement_genere'
```

---

## Règle de statut final

| Condition | Statut pack |
|-----------|-------------|
| Rien ne manque | `pret` |
| `programme_annuel` manquant | `erreur` |
| Éléments non critiques manquants | `partiellement_genere` |

Le Teaching Pack ne peut jamais devenir `pret` si les objets obligatoires
ne sont pas retrouvables en base — peu importe ce que l'état en mémoire dit.

---

## Utilisation dans le pipeline

```typescript
// ÉTAPE 8 — Finalisation (build-year/route.ts)
const completeness = packId
  ? await verifyTeachingPackCompleteness(supabase, packId, input.classe_id, entitlement)
  : { complete: false, missingElements: ['pack'], status: 'erreur', counts: {...} }

// Le statut persisté = ce que la DB contient réellement
await supabase.from('teaching_packs').update({
  statut:        completeness.status,    // ← jamais basé sur en-mémoire
  error_message: completeness.complete
    ? null
    : `Éléments manquants : ${completeness.missingElements.join(', ')}`,
}).eq('id', packId)
```

---

## Endpoint verify-pack

`POST /api/spie/verify-pack`

Permet de vérifier la complétude à tout moment (ex: depuis le Founder
diagnostic ou après un refresh utilisateur).

**Requête :**
```json
{ "pack_id": "uuid-...", "classe_id": "uuid-..." }
```

**Réponse :**
```json
{
  "pack_id": "uuid-...",
  "classe_id": "uuid-...",
  "statut_pack": "partiellement_genere",
  "complete": false,
  "missingElements": ["premiere_lecon"],
  "status": "partiellement_genere",
  "counts": {
    "sequences": 6,
    "plans_lecon": 30,
    "lecons_completes": 0,
    "quiz": 0
  },
  "build_state": { ... },
  "verified_at": "2026-08-09T12:34:56.789Z"
}
```

---

## Diagnostic Founder

Le Founder Monitoring (`/founder/monitoring`) utilise les données de
`teaching_packs` (avec join `classes`) pour afficher une table de diagnostic :

| Colonne | Source |
|---------|--------|
| Classe | `classes.nom` |
| Pack | `teaching_packs.nom` |
| Statut | `teaching_packs.statut` |
| Prog. annuel | `teaching_packs.programme_annuel_id` (null = ❌) |
| Syllabus | `build_state.syllabus.status` |
| 1re Leçon | `build_state.premiere_lecon.status` |
| Quiz | `build_state.quiz.status` |
| Erreur | `teaching_packs.error_message` |

---

## Voir aussi

- [Persistence_Pipeline.md](Persistence_Pipeline.md) — pattern complet
- [Build_Checkpoints.md](Build_Checkpoints.md) — BuildState structure
- [Build_Recovery.md](Build_Recovery.md) — reprendre après échec
- [Build_Trace_Model.md](Build_Trace_Model.md) — endpoint `/api/founder/build-debug`
- [SPIE-DIAGNOSTIC-01_Report.md](SPIE-DIAGNOSTIC-01_Report.md) — diagnostic des défaillances pipeline
