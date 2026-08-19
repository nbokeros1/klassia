# SCORGIA V7.5.3 — Migration Final Review

**Date :** 2026-08-19  
**Statut :** LOCAL COMMIT UNIQUEMENT — NE PAS PUSH — NE PAS EXÉCUTER — ATTENDRE PO

---

```
SCORGIA V7.5.3 — FINAL MIGRATION REVIEW

FINAL MIGRATION FILE:
  supabase/migrations/045_canonical_pedagogical_structures_V75_3_FINAL_PROPOSED.sql

SUPERSEDES:
  supabase/migrations/045_pedagogical_structures_V752_HARDENED_PROPOSED.sql (V7.5.2 — SUPERSEDED)
  supabase/migrations/044_pedagogical_structures_V75_PROPOSED.sql (V7.5.1 — SUPERSEDED)

────────────────────────────────────────────────────────────────────────────────

P0 UNIT CONTEXT INTEGRITY: PASS
  Trigger validate_pedagogical_unit_context() créé
  BEFORE INSERT OR UPDATE ON pedagogical_units
  SECURITY INVOKER, SET search_path = public
  6 checks : programme EXISTS, classe match, owner match, pack owner match,
              pack classe match, pack/programme coherence
  Couvre : authenticated caller + service_role caller
  CTX-I (service-role invalid INSERT) : BLOQUÉ par trigger même si RLS bypassé

P1 STATUS SEMANTICS: PASS
  en_cours / terminee : SUPPRIMÉS
  Units + Séquences : brouillon | planifiee | prete | archivee
  Leçons : planifiee | a_preparer | preparee | archivee
  Aucun attribut d'enseignement réel dans pedagogical_lessons
  date_enseignee / note_enseignement / statut='enseignee' : ABSENTS

P1 CARDINALITY QUERY: PASS
  HAVING COUNT(*) = 0 : REMPLACÉ par LEFT JOIN orphan detection
  Requêtes PO : A–S dans §12 de la migration
  Unités sans séquences : LEFT JOIN WHERE ps.id IS NULL
  Séquences sans leçons : LEFT JOIN WHERE pl.id IS NULL

P1 RAG DOCTRINE: PASS
  Doctrine "1 unit = 1 RAG domain" : SUPPRIMÉE
  Doctrine correcte : "macro instructional grouping from one or more domains"
  domain_code : métadonnée optionnelle, pas un invariant structurel

P1 CROSS-CONTEXT INTEGRITY TESTS: PASS
  CTX-A (cohérent complet) : PASS
  CTX-B (classe foreign) : BLOQUÉ PED_UNIT_CLASS_MISMATCH
  CTX-C (pack foreign) : BLOQUÉ PED_UNIT_PACK_MISMATCH
  CTX-D (enseignant mismatch) : BLOQUÉ PED_UNIT_OWNER_MISMATCH
  CTX-E (classe ≠ prog.classe) : BLOQUÉ PED_UNIT_CLASS_MISMATCH
  CTX-F (pack ≠ prog.pack) : BLOQUÉ PED_UNIT_CONTEXT_MISMATCH
  CTX-G (UPDATE titre) : PASS (contexte inchangé)
  CTX-H (UPDATE classe_id) : BLOQUÉ (au moins 1 check échoue)
  CTX-I (service-role invalid) : BLOQUÉ par trigger

────────────────────────────────────────────────────────────────────────────────

SECURITY TESTS:
  SEC-A Lecture unité propre             : PASS
  SEC-B Lecture unité foreign            : BLOQUÉ (SELECT policy)
  SEC-C INSERT séquence dans unité propre: PASS
  SEC-D INSERT séquence unité foreign    : BLOQUÉ (WITH CHECK)
  SEC-E Déplacer séquence vers unité foreign: BLOQUÉ (UPDATE WITH CHECK)
  SEC-F INSERT leçon séquence foreign    : BLOQUÉ (WITH CHECK chaîne)
  SEC-G Changer classe_id foreign        : BLOQUÉ (UPDATE WITH CHECK)
  SEC-H Lecture anonyme                  : BLOQUÉ (TO authenticated)
  SEC-I Service role                     : RLS bypassé (design) + trigger actif
  Score : 9/9

STRUCTURAL TESTS:
  STR-A 1 unit 2 seq N leçons           : FK NOT NULL + UNIQUE
  STR-B 3 units cardinalités diff        : FK NOT NULL + UNIQUE
  STR-C DELETE seq → leçons cascade     : ON DELETE CASCADE
  STR-D DELETE leçon → teaching_event survit: ON DELETE SET NULL
  STR-E DELETE leçon → fichier survit   : ON DELETE SET NULL
  STR-F Doublon unit numero             : UNIQUE(programme_annuel_id, numero)
  STR-G Doublon seq numero même unit    : UNIQUE(unit_id, numero)
  STR-H Même seq numero unités diff     : Autorisé (unicité relative au parent)
  STR-I Doublon lesson numero même seq  : UNIQUE(sequence_id, numero)
  Score : 9/9

PARENT-CHAIN SECURITY:
  PAR-A Teacher A ne peut pas lire séquences de Teacher B: PASS
  PAR-B Teacher A ne peut pas insérer séquence dans unité B: PASS
  PAR-C Teacher A ne peut pas insérer leçon dans séquence B: PASS
  PAR-D Service role peut lire toutes les séquences: PASS (design)

────────────────────────────────────────────────────────────────────────────────

MIGRATION IDEMPOTENCE:
  CREATE TABLE IF NOT EXISTS               : OUI
  CREATE INDEX IF NOT EXISTS               : OUI
  ADD COLUMN IF NOT EXISTS                 : OUI
  DROP POLICY IF EXISTS + CREATE POLICY    : OUI (convention migration 036)
  DROP TRIGGER IF EXISTS + CREATE TRIGGER  : OUI
  CREATE OR REPLACE FUNCTION               : OUI

TRIGGER CONVENTION:
  update_pedagogical_structure_updated_at() : conforme convention repo
  (migrations 023, 024, 025, 036 : fonctions nommées par table)

GHOST TABLE unites:
  Statut : GHOST/UNUSED
  Touché par migration 045 V7.5.3 : NON
  FK lecons.unite_id : conservé (jamais peuplé)
  Pré-requis DROP futur (migration 046) :
    SELECT COUNT(*) FROM unites → doit être 0
    SELECT COUNT(*) FROM lecons WHERE unite_id IS NOT NULL → doit être 0

TEACHING EVENTS:
  Architecture V5 append-only : INCHANGÉE
  pedagogical_lesson_id nullable FK : ajouté (SET NULL sur suppression)
  sequence_index + lecon_index : CONSERVÉS (rétrocompat V4/V5)
  Backfill : NON PLANIFIÉ

SHADOW-WRITE ROLLOUT:
  Phase 1 (tables) : Migration 045 V7.5.3 (PROPOSED)
  Phase 2+ : Post-GO, décision PO

BACKWARD COMPAT:
  V1/V2/V3 fallback dans getCanonicalPedagogicalYear() : PRÉSERVÉ
  Aucun code TypeScript modifié en V7.5.3

────────────────────────────────────────────────────────────────────────────────

QUALITY GATES:
  npx tsc --noEmit : 0 erreurs
  npm run build    : exit 0

FILES CREATED (V7.5.3):
  supabase/migrations/045_canonical_pedagogical_structures_V75_3_FINAL_PROPOSED.sql
  docs/Architecture/SCORGIA_V7_5_3_FINAL_DB_INTEGRITY_AUDIT.md
  docs/Architecture/SCORGIA_V7_5_3_FINAL_INTEGRITY_CONTRACT.md
  docs/Release/SCORGIA_V7_5_3_MIGRATION_FINAL_REVIEW.md (ce fichier)

FILES MODIFIED (V7.5.3):
  supabase/migrations/045_pedagogical_structures_V752_HARDENED_PROPOSED.sql
    → En-tête SUPERSEDED ajouté

TYPESCRIPT MODIFIED: 0 fichiers

MIGRATION REMOTELY APPLIED: NO
PUSH: NO

────────────────────────────────────────────────────────────────────────────────

FINAL RECOMMENDATION: GO FOR PO SQL REVIEW

  Migration 045_canonical_pedagogical_structures_V75_3_FINAL_PROPOSED.sql
  est prête pour review SQL par le DBA/PO.

  Tous les problèmes P0 et P1 identifiés après V7.5.2 sont résolus.
  Aucune modification TypeScript requise avant application de la migration.

  Prochaine étape après GO remote :
    Phase 2 shadow-write dans la route build-year
    (écriture simultanée JSON + tables canoniques)

  Prochaine étape avant GO remote :
    PO valide le SQL de la migration 045 V7.5.3 FINAL
    PO confirme COUNT(*) FROM unites pour dépréciation future
```
