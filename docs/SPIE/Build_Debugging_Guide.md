# Build Debugging Guide — Pipeline "Construire mon année scolaire"
## Procédure de débogage SPIE-DIAGNOSTIC-01

**Statut :** SPIE-DIAGNOSTIC-01 · Actif  
**Dernière mise à jour :** 2026-08-09  
**Audience :** Développeur / Fondateur

---

## Quand utiliser ce guide

- Le pipeline s'arrête à une étape avec "Échec" dans l'interface
- Le Teaching Pack reste en statut `partiellement_genere` ou `erreur`
- Un onglet de la page `/programme` affiche "Aucun contenu"
- Un utilisateur signale que son année n'a pas été générée

---

## Étape 1 — Identifier le packId

### Via l'interface founder

1. Aller sur `/founder/monitoring`
2. Dans la table "Teaching Packs", trouver la ligne de la classe affectée
3. Copier l'ID du pack (colonne Pack)

### Via Supabase

```sql
SELECT id, classe_id, statut, error_message, updated_at
FROM teaching_packs
WHERE statut IN ('partiellement_genere', 'erreur')
ORDER BY updated_at DESC
LIMIT 20;
```

---

## Étape 2 — Appeler l'endpoint de diagnostic

```
GET /api/founder/build-debug?packId=<uuid>
```

Requiert : être connecté en tant qu'admin (enwaha22@gmail.com) ou rôle `founder/super_admin`.

### Interpréter la réponse

```json
{
  "diagnosis": {
    "firstFailingStep": "programme_annuel",
    "firstFailingError": "column genere_par_ia does not exist",
    "hasProgAnnuelInDb": false,
    "missingElements": ["programme_annuel", "syllabus", "premiere_lecon", "quiz"]
  }
}
```

| Champ | Action |
|-------|--------|
| `firstFailingStep` | L'étape qui a bloqué le pipeline |
| `firstFailingError` | Le message d'erreur exact (DB ou parse) |
| `hasProgAnnuelInDb: false` | Le programme annuel n'a pas été persisté |
| `missingElements` | Ce qui manque réellement en DB |

---

## Étape 3 — Identifier la cause racine

### Pattern : "column X does not exist"

→ Le code tente d'insérer une colonne qui n'existe pas dans la table DB.

**Action :** Auditer `supabase/schema.sql` + toutes les migrations pour vérifier les colonnes réelles de la table concernée. Comparer avec les champs de l'INSERT dans `build-year/route.ts`.

**Exemple résolu :** `genere_par_ia` sur `programme_annuel` (SPIE-DIAGNOSTIC-01).

### Pattern : "violates check constraint"

→ Le code insère une valeur non acceptée par une contrainte CHECK.

**Action :** Trouver la contrainte dans les migrations (souvent `010_corrections_critiques.sql`). Vérifier les valeurs autorisées.

**Exemple résolu :** `statut: 'prete'` sur `fichiers_dossier` — valeurs acceptées : `('brouillon','valide','enseigne','archive')`.

### Pattern : "Unexpected token" ou "SyntaxError" dans syllabus

→ Claude a retourné du texte avant ou après le JSON.

**Action :** Vérifier les logs serveur pour `[build-year][syllabus] FAIL parse/call`. Le champ `raw[0:500]` montre la réponse brute de Claude. Si Claude ajoute du texte avant `{`, l'extraction robuste dans le code devrait le gérer ; sinon ajuster le prompt système.

### Pattern : `hasProgAnnuelInDb: false` mais `build_state.programme_annuel.status = 'success'`

→ Incohérence entre BuildState et DB réelle. Le BuildState date d'avant un fix.

**Action :** Déclencher "Reprendre la génération" depuis la page `/programme` de la classe. Le pipeline reprend les étapes manquantes.

---

## Étape 4 — Vérifier les logs serveur

Les logs serveur sont disponibles dans la console Next.js (terminal) ou dans Vercel Logs.

Format des logs du pipeline :
```
[build-year][syllabus] FAIL parse/call { packId, error, raw }
[build-year][syllabus] FAIL validation { packId, detail }
[build-year][<step>] <message>
```

Filtrer par packId pour isoler l'exécution problématique :
```
grep "packId.*<uuid>" <logs>
```

---

## Étape 5 — Test de reproduction

### Scénario de test standard

1. Créer une classe de test (ex : "Test Debug · Mathématiques · 5e")
2. Lancer "Construire mon année scolaire" avec curriculum simplifié (3 semaines)
3. Observer les étapes dans l'interface
4. Appeler `/api/founder/build-debug?packId=...` immédiatement après
5. Vérifier que `diagnosis.firstFailingStep = null` (aucun échec)

### Test d'erreur contrôlée

Pour vérifier que les erreurs sont correctement capturées, injecter temporairement
une mauvaise colonne dans un INSERT et confirmer que :
- L'étape affiche "Échec" dans l'UI
- `build_state.<step>.error` contient le message PostgreSQL
- L'étape suivante dépendante affiche "Dépendance manquante"
- Le BuildState est persisté même en cas d'erreur partielle

---

## Référence rapide — Contraintes DB importantes

### `fichiers_dossier.statut`

```sql
CHECK (statut IN ('brouillon', 'valide', 'enseigne', 'archive'))
```

NE PAS utiliser : `'prete'`, `'en_cours'`, `'publie'`.

### `fichiers_dossier.type_fichier`

```sql
CHECK (type_fichier IN ('lecon', 'evaluation', 'ressource', 'quiz',
                        'sondage', 'lecon_complete', 'lecon_detaillee', ...))
```

Pour le pipeline build-year : utiliser `'lecon_complete'` et `'quiz'`.

### `programme_annuel` — colonnes réelles

```
id, classe_id, titre, nb_semaines, contenu_json, created_at,
teaching_pack_id, calendrier_json, syllabus_json
```

Ne pas utiliser : `genere_par_ia`.

### `teaching_packs.statut` (enum)

```
configuration | curriculum_en_analyse | pret_a_planifier |
generation_en_cours | partiellement_genere | pret | erreur | archive
```

---

## Checklist de validation après correction

- [ ] `npx tsc --noEmit` → 0 erreur
- [ ] `npm run build` → EXIT 0
- [ ] Test end-to-end : pipeline complet sans erreur
- [ ] `GET /api/founder/build-debug` → `failingSteps: []`
- [ ] `POST /api/spie/verify-pack` → `complete: true`
- [ ] Page `/programme` : tous les onglets affichent du contenu
- [ ] Statut Teaching Pack : `pret`

---

## Voir aussi

- [SPIE-DIAGNOSTIC-01_Report.md](SPIE-DIAGNOSTIC-01_Report.md) — Rapport complet du diagnostic
- [Build_Trace_Model.md](Build_Trace_Model.md) — Structure du BuildState et des logs
- [Teaching_Pack_Completeness.md](Teaching_Pack_Completeness.md) — verifyTeachingPackCompleteness
- [Persistence_Pipeline.md](Persistence_Pipeline.md) — Pattern GENERATE→VERIFY
