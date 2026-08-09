# DEPLOY-BETA-02B — Rapport validation base de données
> **Mission** : Validation migration 036 + schéma SPIE + PDF bêta  
> **Date** : 2026-08-05  
> **Statut** : ✅ Préparation complète — validation DB à effectuer manuellement par le PO

---

## Verdict

| Composant | Verdict |
|-----------|---------|
| Migration 036 (corrigée) | **MIGRATION 036 PRÊTE À VALIDER** — script de vérification fourni |
| Migration 036 (appliquée dans Supabase) | **NON VÉRIFIABLE ICI** — la base distante n'est pas inspectable automatiquement |
| Migrations 037 + 038 | Prêtes à l'emploi (dépendent de 036) |
| PDF export (Vercel) | **RISQUE CONFIRMÉ** — désactivé dans l'UI pour la bêta |

> La validation réelle de la base nécessite l'exécution de `supabase/verification/verify_migration_036.sql` dans Supabase Dashboard → SQL Editor.

---

## Mission 1 — Inventaire migration 036

### Table `teaching_packs` (créée)

| Colonne | Type | Contrainte |
|---------|------|-----------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() |
| `enseignant_id` | UUID | NOT NULL, FK → utilisateurs(id) CASCADE |
| `classe_id` | UUID | NOT NULL, FK → classes(id) CASCADE, UNIQUE |
| `nom` | TEXT | NOT NULL |
| `statut` | TEXT | CHECK (8 valeurs) DEFAULT 'configuration' |
| `province` | TEXT | — |
| `pays` | TEXT | DEFAULT 'Canada' |
| `juridiction` | TEXT | — |
| `langue` | TEXT | DEFAULT 'fr' |
| `annee_scolaire` | TEXT | — |
| `curriculum_source` | TEXT | CHECK ('televerse'\|'officiel') |
| `curriculum_officiel` | TEXT | — |
| `curriculum_contenu` | TEXT | — |
| `programme_annuel_id` | UUID | FK ajoutée via DO block |
| `calendrier_json` | JSONB | DEFAULT '{}' |
| `gabarits_json` | JSONB | DEFAULT '{}' |
| `contenu_json` | JSONB | DEFAULT '{}' |
| `error_message` | TEXT | — |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

### Colonnes ajoutées à `programme_annuel`

| Colonne | Type | Dépendance |
|---------|------|-----------|
| `teaching_pack_id` | UUID | FK → teaching_packs(id) SET NULL |
| `calendrier_json` | JSONB | — |
| `syllabus_json` | JSONB | — |

### Contrainte FK corrigée

| Contrainte | Table | Colonne | Référence | ON DELETE |
|-----------|-------|---------|-----------|----------|
| `fk_teaching_packs_programme_annuel` | `teaching_packs` | `programme_annuel_id` | `programme_annuel(id)` | SET NULL |

### Index

| Nom | Table | Colonne |
|-----|-------|---------|
| `idx_teaching_packs_enseignant` | `teaching_packs` | `enseignant_id` |
| `idx_teaching_packs_classe` | `teaching_packs` | `classe_id` |
| `idx_prog_annuel_teaching_pack` | `programme_annuel` | `teaching_pack_id` |

### Fonction + Trigger

| Objet | Nom | Quand |
|-------|-----|-------|
| Fonction PLPGSQL | `update_teaching_pack_updated_at()` | Déclenché par trigger |
| Trigger | `trg_teaching_packs_updated_at` | BEFORE UPDATE sur teaching_packs |

### RLS et Policies

| Policy | Type | Condition | Pattern |
|--------|------|-----------|---------|
| `teaching_packs_own` | FOR ALL | `enseignant_id = (SELECT id FROM utilisateurs WHERE user_id = auth.uid())` | ✅ Correct |
| `teaching_packs_admin` | FOR ALL | `EXISTS (... user_id = auth.uid() AND is_admin = TRUE)` | ✅ Correct |

---

## Mission 2 — Script de vérification

**Fichier créé** : `supabase/verification/verify_migration_036.sql`

Contenu : 13 sections SQL + résumé final en tableau ✅/❌. Lecture seule, idempotent.

---

## Mission 3 — Contrainte FK corrigée (détail)

**Erreur d'origine** : `ADD CONSTRAINT IF NOT EXISTS` — syntaxe invalide en PostgreSQL (erreur 42601).

**Fix appliqué** dans `supabase/migrations/036_teaching_packs.sql` :
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE  conname  = 'fk_teaching_packs_programme_annuel'
      AND  conrelid = 'teaching_packs'::regclass
  ) THEN
    ALTER TABLE teaching_packs
      ADD CONSTRAINT fk_teaching_packs_programme_annuel
      FOREIGN KEY (programme_annuel_id) REFERENCES programme_annuel(id) ON DELETE SET NULL;
  END IF;
END $$;
```

**Propriétés préservées** : nom, colonne, table référencée, ON DELETE SET NULL.

**Cas de doublon détecté par** : `SELECT COUNT(*) FROM pg_constraint WHERE conname = 'fk_...'` — attendu = 1.

---

## Mission 4 — État possible d'exécution partielle

Si la migration a été lancée une première fois avant la correction, l'état probable est :

| Objet | État probable | Raison |
|-------|--------------|--------|
| Table `teaching_packs` | ✅ Créée | Avant la ligne qui échouait |
| Colonnes `programme_annuel` | ✅ Ajoutées | Avant la ligne qui échouait |
| Contrainte FK | ❌ Absente | Ligne exacte de l'erreur |
| Index (3) | ❌ Absents | Après la ligne qui échouait |
| RLS + Policies | ❌ Absents | Après la ligne qui échouait |
| Trigger + Fonction | ❌ Absents | Après la ligne qui échouait |

La migration corrigée est idempotente — elle peut être relancée et complète les objets manquants sans toucher aux objets déjà créés.

---

## Mission 5 — Analyse RLS

Les policies de la migration 036 utilisent le pattern **correct** :
```sql
enseignant_id = (SELECT id FROM utilisateurs WHERE user_id = auth.uid() LIMIT 1)
```

Ce pattern est correct parce que :
- `enseignant_id` référence `utilisateurs.id` (clé primaire interne)
- `user_id = auth.uid()` mappe l'utilisateur authentifié vers la bonne ligne `utilisateurs`
- Le pattern incorrect `utilisateurs.id = auth.uid()` confondrait l'ID interne avec l'UUID Supabase Auth — absent ici ✅

**Pas de WITH CHECK explicite** : PostgreSQL applique la clause USING comme WITH CHECK pour `FOR ALL` — comportement correct pour INSERT (vérifie que `enseignant_id` correspond à l'utilisateur authentifié).

**Accès Founder** : géré par la policy `teaching_packs_admin` via `is_admin = TRUE`. Les Founders ont `is_admin = true` (DEC-044).

---

## Mission 7 — État des migrations SPIE après 036

| Migration | Objet principal | Dépend de 036 | Requise pour bêta | Risque |
|-----------|----------------|---------------|------------------|--------|
| 036 | `teaching_packs` (table centrale SPIE) | Non | ✅ Oui | Corrigée ✅ |
| 037 | `pack_versions` + colonnes `teaching_packs` + colonnes `fichiers_dossier` | ✅ Oui (FK teaching_packs) | ✅ Oui | Syntaxe OK |
| 038 | `spie_access_log` + colonnes `fichiers_dossier` + colonnes `teaching_packs` + colonnes `lecons` | ✅ Oui (FK teaching_packs) | ✅ Oui | Syntaxe OK |

> **Note** : L'existence des fichiers migrations ne prouve pas leur application dans Supabase. Exécuter les scripts de vérification pour confirmer.

**Ordre obligatoire** : 036 → 037 → 038

---

## Mission 9 — Export PDF pour la bêta

**Problème** : `/api/export/pdf` invoque `soffice` (LibreOffice) via `exec()`. LibreOffice n'est pas disponible dans les environnements serverless Vercel.

**Action appliquée dans le code** : Bouton "📥 PDF" dans `ApercuModal.tsx` désactivé avec :
- `disabled` attribute
- `cursor: not-allowed`
- `opacity: 0.45`
- Tooltip : "L'export PDF sera disponible prochainement. Utilisez Word ou l'impression pour cette version bêta."

**Code `exporterPDF` conservé** — non supprimé, non modifié.

**Alternatives fonctionnelles pour la bêta** :
- Export Word (DOCX) — ✅ Fonctionne sur Vercel (`docx` library)
- Impression navigateur — ✅ Fonctionne partout (bouton "🖨️ Imprimer" inchangé)

**Solution post-bêta** : Remplacer `soffice` par `pdf-lib`, `@react-pdf/renderer`, ou un service tiers (Gotenberg, CloudConvert).

---

## Procédure manuelle complète

### Pour appliquer migration 036

1. Ouvrir Supabase SQL Editor
2. Copier `supabase/migrations/036_teaching_packs.sql` (version corrigée)
3. Coller → Run
4. Exécuter `supabase/verification/verify_migration_036.sql`
5. Confirmer 16/16 ✅

### Pour appliquer migrations 037 + 038 (après 036 validée)

1. Exécuter `supabase/migrations/037_pack_versions.sql` → Run
2. Exécuter `supabase/migrations/038_detailed_lesson.sql` → Run
3. Vérifier absence d'erreurs dans les deux cas

---

## Guide PO

Voir `docs/Deployment/MIGRATION_036_VALIDATION_GUIDE.md` — guide complet sans expertise PostgreSQL requise.

---

*Document créé : DEPLOY-BETA-02B · M10 · 2026-08-05*
