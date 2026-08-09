-- ════════════════════════════════════════════════════════════════════════════
-- VERIFY MIGRATION 036 — Teaching Packs + Programme annuel étendu
-- Exécuter dans Supabase Dashboard → SQL Editor
-- Ce script ne modifie rien. Lecture seule.
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — EXISTENCE DES TABLES
-- Résultat attendu : teaching_packs = true
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  'teaching_packs'       AS table_nom,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'teaching_packs'
  )                      AS existe,
  '036 — table principale' AS source;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — COLONNES DE teaching_packs
-- Résultat attendu : toutes les colonnes ci-dessous présentes
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'teaching_packs'
ORDER BY ordinal_position;

-- Colonnes attendues :
--   id, enseignant_id, classe_id, nom, statut, province, pays, juridiction,
--   langue, annee_scolaire, curriculum_source, curriculum_officiel,
--   curriculum_contenu, programme_annuel_id, calendrier_json, gabarits_json,
--   contenu_json, error_message, created_at, updated_at


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — COLONNES AJOUTÉES À programme_annuel
-- Résultat attendu : 3 colonnes présentes
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'programme_annuel'
  AND column_name IN ('teaching_pack_id', 'calendrier_json', 'syllabus_json')
ORDER BY column_name;

-- Attendu :
--   calendrier_json  | jsonb | '{}'
--   syllabus_json    | jsonb | '{}'
--   teaching_pack_id | uuid  | (null)


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4 — CONTRAINTE FK CORRIGÉE (MISSION 3)
-- Résultat attendu : 1 ligne, colonne "presente" = true
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  c.conname                         AS contrainte,
  c.contype                         AS type,       -- 'f' = foreign key
  c.confupdtype                     AS on_update,  -- 'a' = no action, 'n' = set null
  c.confdeltype                     AS on_delete,  -- 'n' = set null
  src.relname                       AS table_source,
  a_src.attname                     AS colonne_source,
  ref.relname                       AS table_cible,
  a_ref.attname                     AS colonne_cible,
  c.convalidated                    AS validee,
  true                              AS presente
FROM pg_constraint c
JOIN pg_class     src   ON src.oid   = c.conrelid
JOIN pg_class     ref   ON ref.oid   = c.confrelid
JOIN pg_attribute a_src ON a_src.attrelid = c.conrelid  AND a_src.attnum = c.conkey[1]
JOIN pg_attribute a_ref ON a_ref.attrelid = c.confrelid AND a_ref.attnum = c.confkey[1]
WHERE c.conname = 'fk_teaching_packs_programme_annuel';

-- Attendu :
--   contrainte    = fk_teaching_packs_programme_annuel
--   type          = f (foreign key)
--   on_delete     = n (SET NULL)
--   table_source  = teaching_packs
--   colonne_src   = programme_annuel_id
--   table_cible   = programme_annuel
--   colonne_cible = id
--   validee       = true

-- Vérification de DOUBLON (ne doit retourner qu'une seule ligne) :
SELECT COUNT(*) AS nb_contraintes_fk_programme_annuel
FROM pg_constraint
WHERE conname    = 'fk_teaching_packs_programme_annuel'
  AND conrelid   = 'teaching_packs'::regclass;
-- Attendu : 1 (si 0 → contrainte absente; si > 1 → doublon)


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5 — CLÉS ÉTRANGÈRES INLINE (dans CREATE TABLE)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  c.conname        AS nom_contrainte,
  src.relname      AS table_source,
  a_src.attname    AS colonne,
  ref.relname      AS table_cible,
  CASE c.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END              AS on_delete
FROM pg_constraint c
JOIN pg_class     src   ON src.oid   = c.conrelid
JOIN pg_class     ref   ON ref.oid   = c.confrelid
JOIN pg_attribute a_src ON a_src.attrelid = c.conrelid  AND a_src.attnum = c.conkey[1]
JOIN pg_attribute a_ref ON a_ref.attrelid = c.confrelid AND a_ref.attnum = c.confkey[1]
WHERE c.contype = 'f'
  AND src.relname = 'teaching_packs'
ORDER BY c.conname;

-- Attendu :
--   fk_teaching_packs_programme_annuel | teaching_packs | programme_annuel_id | programme_annuel | SET NULL
--   teaching_packs_classe_id_fkey      | teaching_packs | classe_id           | classes          | CASCADE
--   teaching_packs_enseignant_id_fkey  | teaching_packs | enseignant_id       | utilisateurs     | CASCADE


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6 — CONTRAINTE UNIQUE (classe_id)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  c.conname    AS contrainte_unique,
  src.relname  AS table_nom,
  a.attname    AS colonne
FROM pg_constraint c
JOIN pg_class     src ON src.oid = c.conrelid
JOIN pg_attribute a   ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
WHERE c.contype = 'u'
  AND src.relname = 'teaching_packs';

-- Attendu : teaching_packs_classe_id_key | teaching_packs | classe_id


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7 — INDEX
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename = 'teaching_packs'
    OR (tablename = 'programme_annuel' AND indexname = 'idx_prog_annuel_teaching_pack')
  )
ORDER BY tablename, indexname;

-- Attendu :
--   idx_teaching_packs_classe      | teaching_packs   | ON (classe_id)
--   idx_teaching_packs_enseignant  | teaching_packs   | ON (enseignant_id)
--   idx_prog_annuel_teaching_pack  | programme_annuel | ON (teaching_pack_id)


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8 — RLS ACTIVÉ (MISSION 5)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  tablename,
  rowsecurity AS rls_actif
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename  = 'teaching_packs';

-- Attendu : rowsecurity = true


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9 — POLICIES RLS (MISSION 5)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  policyname,
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'teaching_packs'
ORDER BY policyname;

-- Attendu : 2 policies
--   teaching_packs_admin | teaching_packs | ALL | EXISTS (... user_id = auth.uid() AND is_admin) | null
--   teaching_packs_own   | teaching_packs | ALL | enseignant_id = (SELECT id FROM utilisateurs WHERE user_id = auth.uid()) | null

-- Vérification anti-pattern : aucune policy ne doit utiliser "u.id = auth.uid()"
-- Le script ci-dessous ne doit retourner aucune ligne.
SELECT policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'teaching_packs'
  AND (qual LIKE '%u.id = auth.uid()%' OR qual LIKE '%utilisateurs.id = auth.uid()%');
-- Attendu : 0 lignes (pattern incorrect absent)


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 10 — TRIGGER ET FONCTION
-- ─────────────────────────────────────────────────────────────────────────────

-- Trigger
SELECT
  t.tgname         AS trigger_nom,
  c.relname        AS table_nom,
  t.tgenabled      AS actif,
  p.proname        AS fonction
FROM pg_trigger t
JOIN pg_class   c ON c.oid = t.tgrelid
JOIN pg_proc    p ON p.oid = t.tgfoid
WHERE c.relname = 'teaching_packs'
  AND t.tgname  = 'trg_teaching_packs_updated_at';
-- Attendu : 1 ligne, actif = 'O' (enabled)

-- Fonction
SELECT
  proname       AS fonction_nom,
  prosrc        AS corps
FROM pg_proc
WHERE proname = 'update_teaching_pack_updated_at';
-- Attendu : 1 ligne


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 11 — ÉTAT APRÈS EXÉCUTION PARTIELLE (MISSION 4)
-- Classe chaque objet : présent / absent
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'teaching_packs (table)'                    AS objet,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teaching_packs' AND table_schema = 'public')
    THEN '✅ présent' ELSE '❌ absent' END AS etat
UNION ALL
SELECT 'programme_annuel.teaching_pack_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programme_annuel' AND column_name = 'teaching_pack_id' AND table_schema = 'public')
    THEN '✅ présent' ELSE '❌ absent' END
UNION ALL
SELECT 'programme_annuel.calendrier_json',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programme_annuel' AND column_name = 'calendrier_json' AND table_schema = 'public')
    THEN '✅ présent' ELSE '❌ absent' END
UNION ALL
SELECT 'programme_annuel.syllabus_json',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programme_annuel' AND column_name = 'syllabus_json' AND table_schema = 'public')
    THEN '✅ présent' ELSE '❌ absent' END
UNION ALL
SELECT 'fk_teaching_packs_programme_annuel (contrainte)',
  CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teaching_packs_programme_annuel' AND conrelid = 'teaching_packs'::regclass)
    THEN '✅ présent' ELSE '❌ absent' END
UNION ALL
SELECT 'idx_teaching_packs_enseignant (index)',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_teaching_packs_enseignant')
    THEN '✅ présent' ELSE '❌ absent' END
UNION ALL
SELECT 'idx_teaching_packs_classe (index)',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_teaching_packs_classe')
    THEN '✅ présent' ELSE '❌ absent' END
UNION ALL
SELECT 'idx_prog_annuel_teaching_pack (index)',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_prog_annuel_teaching_pack')
    THEN '✅ présent' ELSE '❌ absent' END
UNION ALL
SELECT 'RLS activé sur teaching_packs',
  CASE WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'teaching_packs' AND schemaname = 'public')
    THEN '✅ présent' ELSE '❌ absent' END
UNION ALL
SELECT 'policy teaching_packs_own',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'teaching_packs_own' AND tablename = 'teaching_packs')
    THEN '✅ présent' ELSE '❌ absent' END
UNION ALL
SELECT 'policy teaching_packs_admin',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'teaching_packs_admin' AND tablename = 'teaching_packs')
    THEN '✅ présent' ELSE '❌ absent' END
UNION ALL
SELECT 'trigger trg_teaching_packs_updated_at',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE t.tgname = 'trg_teaching_packs_updated_at' AND c.relname = 'teaching_packs')
    THEN '✅ présent' ELSE '❌ absent' END
UNION ALL
SELECT 'fonction update_teaching_pack_updated_at',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_teaching_pack_updated_at')
    THEN '✅ présent' ELSE '❌ absent' END;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 12 — TESTS DE DONNÉES TRANSACTIONNELS (MISSION 6)
-- Entourés de BEGIN/ROLLBACK — aucun effet permanent
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE : Ces tests nécessitent un compte utilisateur existant et une classe
-- existante. Adapter les UUIDs avant exécution.
-- Pour exécuter : décommenter le bloc, remplacer les UUIDs par de vraies valeurs,
-- puis exécuter. Le ROLLBACK final annule tout.

/*
BEGIN;

-- Données de test (adapter ces UUIDs à des valeurs réelles dans votre base)
-- Pour trouver un enseignant_id : SELECT id FROM utilisateurs LIMIT 1;
-- Pour trouver une classe_id : SELECT id FROM classes LIMIT 1;
-- Pour trouver un programme_annuel_id : SELECT id FROM programme_annuel LIMIT 1;

-- Test 1 : Création d'un Teaching Pack
INSERT INTO teaching_packs (
  enseignant_id,
  classe_id,
  nom,
  statut,
  province,
  langue
) VALUES (
  '00000000-0000-0000-0000-000000000001',  -- remplacer par un vrai enseignant_id
  '00000000-0000-0000-0000-000000000002',  -- remplacer par une vraie classe_id
  'Pack de test ROLLBACK',
  'configuration',
  'alberta',
  'fr'
) RETURNING id, nom, statut, created_at;

-- Test 2 : Association à un programme_annuel (si disponible)
-- UPDATE teaching_packs SET programme_annuel_id = '...' WHERE nom = 'Pack de test ROLLBACK';

-- Test 3 : Lecture (simule la lecture par propriétaire — sans RLS actif dans service_role)
SELECT id, nom, statut, enseignant_id
FROM teaching_packs
WHERE nom = 'Pack de test ROLLBACK';

-- Test 4 : Mise à jour (vérifie le trigger updated_at)
UPDATE teaching_packs SET statut = 'pret_a_planifier' WHERE nom = 'Pack de test ROLLBACK';
SELECT id, statut, updated_at FROM teaching_packs WHERE nom = 'Pack de test ROLLBACK';

ROLLBACK;
-- ↑ Toutes les données de test sont effacées.
*/


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 13 — CONTRAINTE UNIQUE classe_id (un seul pack par classe)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT COUNT(*) AS nb_contraintes_unique_classe_id
FROM pg_constraint
WHERE contype   = 'u'
  AND conrelid  = 'teaching_packs'::regclass
  AND conkey[1] = (
    SELECT attnum FROM pg_attribute
    WHERE attrelid = 'teaching_packs'::regclass AND attname = 'classe_id'
  );
-- Attendu : 1


-- ─────────────────────────────────────────────────────────────────────────────
-- RÉSUMÉ : EXÉCUTER CETTE SECTION EN DERNIER
-- Retourne une ligne par objet avec ✅ ou ❌
-- Copiez ce résultat dans le rapport de validation.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT '=== RÉSUMÉ MIGRATION 036 ===' AS rapport, '' AS etat
UNION ALL
SELECT objet, etat FROM (
  SELECT 1 AS ord, 'teaching_packs (table)'                 AS objet, CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='teaching_packs' AND table_schema='public') THEN '✅ OK' ELSE '❌ MANQUANT' END AS etat
  UNION ALL SELECT 2, 'teaching_packs (20 colonnes)', CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='teaching_packs' AND table_schema='public') >= 20 THEN '✅ OK' ELSE '❌ COLONNES MANQUANTES' END
  UNION ALL SELECT 3, 'programme_annuel.teaching_pack_id', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programme_annuel' AND column_name='teaching_pack_id') THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 4, 'programme_annuel.calendrier_json', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programme_annuel' AND column_name='calendrier_json') THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 5, 'programme_annuel.syllabus_json', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programme_annuel' AND column_name='syllabus_json') THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 6, 'FK fk_teaching_packs_programme_annuel', CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_teaching_packs_programme_annuel' AND conrelid='teaching_packs'::regclass) THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 7, 'FK enseignant_id → utilisateurs', CASE WHEN EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid WHERE cl.relname='teaching_packs' AND c.contype='f' AND c.conkey[1]=(SELECT attnum FROM pg_attribute WHERE attrelid='teaching_packs'::regclass AND attname='enseignant_id')) THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 8, 'FK classe_id → classes', CASE WHEN EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid WHERE cl.relname='teaching_packs' AND c.contype='f' AND c.conkey[1]=(SELECT attnum FROM pg_attribute WHERE attrelid='teaching_packs'::regclass AND attname='classe_id')) THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 9, 'Index idx_teaching_packs_enseignant', CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_teaching_packs_enseignant') THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 10, 'Index idx_teaching_packs_classe', CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_teaching_packs_classe') THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 11, 'Index idx_prog_annuel_teaching_pack', CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_prog_annuel_teaching_pack') THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 12, 'RLS activé sur teaching_packs', CASE WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename='teaching_packs' AND schemaname='public') THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 13, 'Policy teaching_packs_own', CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE policyname='teaching_packs_own' AND tablename='teaching_packs') THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 14, 'Policy teaching_packs_admin', CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE policyname='teaching_packs_admin' AND tablename='teaching_packs') THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 15, 'Trigger trg_teaching_packs_updated_at', CASE WHEN EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE t.tgname='trg_teaching_packs_updated_at' AND c.relname='teaching_packs') THEN '✅ OK' ELSE '❌ MANQUANT' END
  UNION ALL SELECT 16, 'Fonction update_teaching_pack_updated_at', CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='update_teaching_pack_updated_at') THEN '✅ OK' ELSE '❌ MANQUANT' END
) sub
ORDER BY ord;
