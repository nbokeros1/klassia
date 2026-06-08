-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 008 — Structure complète : dossiers, fichiers, calendrier, Studio IA
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Types ENUM ────────────────────────────────────────────────────────────────

CREATE TYPE type_dossier_systeme AS ENUM (
  'preparation', 'curriculum', 'plan_annuel', 'plans_lecons',
  'sequence', 'lecons', 'lecon', 'evaluations_sommatives',
  'eleves', 'ressources', 'administration', 'parents', 'evenements', 'custom'
);

CREATE TYPE type_fichier_dossier AS ENUM (
  'plan_lecon', 'lecon_complete', 'sequence', 'curriculum',
  'activite', 'ressource', 'document', 'image',
  'audio', 'video', 'lien', 'gabarit', 'evaluation', 'autre'
);

CREATE TYPE statut_fichier_dossier AS ENUM ('brouillon', 'valide', 'enseigne', 'archive');

CREATE TYPE type_evenement_cal AS ENUM ('lecon', 'evaluation', 'sortie', 'reunion', 'conge', 'autre');

CREATE TYPE type_memoire_ia AS ENUM ('gabarit', 'contexte', 'feedback', 'preference');

CREATE TYPE type_note_ia AS ENUM ('preparation', 'feedback', 'observation', 'suggestion');

-- ── Table : dossiers_systeme ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dossiers_systeme (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id     UUID        REFERENCES classes(id) ON DELETE CASCADE,
  parent_id     UUID        REFERENCES dossiers_systeme(id) ON DELETE CASCADE,
  nom           TEXT        NOT NULL,
  type          type_dossier_systeme NOT NULL DEFAULT 'custom',
  ordre         INTEGER     NOT NULL DEFAULT 0,
  icone         TEXT,
  couleur       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Table : fichiers_dossier ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fichiers_dossier (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id       UUID        NOT NULL REFERENCES dossiers_systeme(id) ON DELETE CASCADE,
  enseignant_id    UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id        UUID        REFERENCES classes(id) ON DELETE SET NULL,
  nom              TEXT        NOT NULL,
  type_fichier     type_fichier_dossier NOT NULL DEFAULT 'document',
  url              TEXT,
  storage_path     TEXT,
  taille_bytes     INTEGER,
  statut           statut_fichier_dossier NOT NULL DEFAULT 'brouillon',
  lecon_id         UUID        REFERENCES lecons(id) ON DELETE SET NULL,
  activite_id      UUID        REFERENCES activites(id) ON DELETE SET NULL,
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  description      TEXT,
  indexe_studio_ia BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Table : evenements_calendrier ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS evenements_calendrier (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id     UUID        REFERENCES classes(id) ON DELETE CASCADE,
  titre         TEXT        NOT NULL,
  description   TEXT,
  date_debut    DATE        NOT NULL,
  date_fin      DATE,
  heure_debut   TIME,
  heure_fin     TIME,
  type          type_evenement_cal NOT NULL DEFAULT 'autre',
  couleur       TEXT        NOT NULL DEFAULT '#60A5FA',
  lecon_id      UUID        REFERENCES lecons(id) ON DELETE SET NULL,
  note_ia       TEXT,
  rappel        BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Table : studio_ia_memoire ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS studio_ia_memoire (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id     UUID        REFERENCES classes(id) ON DELETE CASCADE,
  cle           TEXT        NOT NULL,
  contenu       JSONB       NOT NULL DEFAULT '{}',
  type          type_memoire_ia NOT NULL DEFAULT 'contexte',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enseignant_id, classe_id, cle)
);

-- ── Table : notes_ia ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notes_ia (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID        NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  evenement_id  UUID        REFERENCES evenements_calendrier(id) ON DELETE CASCADE,
  lecon_id      UUID        REFERENCES lecons(id) ON DELETE SET NULL,
  contenu       TEXT        NOT NULL,
  type          type_note_ia NOT NULL DEFAULT 'preparation',
  auto_generee  BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE dossiers_systeme      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichiers_dossier      ENABLE ROW LEVEL SECURITY;
ALTER TABLE evenements_calendrier ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_ia_memoire     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_ia              ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_own_dossiers_systeme ON dossiers_systeme
  FOR ALL USING (enseignant_id = (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

CREATE POLICY user_own_fichiers_dossier ON fichiers_dossier
  FOR ALL USING (enseignant_id = (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

CREATE POLICY user_own_evenements_calendrier ON evenements_calendrier
  FOR ALL USING (enseignant_id = (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

CREATE POLICY user_own_studio_ia_memoire ON studio_ia_memoire
  FOR ALL USING (enseignant_id = (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

CREATE POLICY user_own_notes_ia ON notes_ia
  FOR ALL USING (enseignant_id = (
    SELECT id FROM utilisateurs WHERE user_id = auth.uid()
  ));

-- ── Trigger : dossiers système par défaut à la création d'une classe ──────────

CREATE OR REPLACE FUNCTION creer_dossiers_classe()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO dossiers_systeme (enseignant_id, classe_id, nom, type, ordre) VALUES
    (NEW.enseignant_id, NEW.id, 'Préparation',            'preparation',            1),
    (NEW.enseignant_id, NEW.id, 'Curriculum',              'curriculum',             2),
    (NEW.enseignant_id, NEW.id, 'Plan annuel',             'plan_annuel',            3),
    (NEW.enseignant_id, NEW.id, 'Plans de leçons',         'plans_lecons',           4),
    (NEW.enseignant_id, NEW.id, 'Séquences',               'sequence',               5),
    (NEW.enseignant_id, NEW.id, 'Leçons',                  'lecons',                 6),
    (NEW.enseignant_id, NEW.id, 'Évaluations sommatives',  'evaluations_sommatives', 7),
    (NEW.enseignant_id, NEW.id, 'Élèves',                  'eleves',                 8),
    (NEW.enseignant_id, NEW.id, 'Ressources',              'ressources',             9),
    (NEW.enseignant_id, NEW.id, 'Administration',          'administration',         10);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_creer_dossiers
  AFTER INSERT ON classes
  FOR EACH ROW EXECUTE FUNCTION creer_dossiers_classe();
