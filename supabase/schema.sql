-- ============================================================
-- KlassIA — Schéma complet de la base de données Supabase
-- Colle ce fichier dans : Supabase → SQL Editor → New query
-- ============================================================

-- 1. UTILISATEURS (profils enseignants)
CREATE TABLE IF NOT EXISTS utilisateurs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  prenom          TEXT,
  nom             TEXT,
  email           TEXT,
  ecole           TEXT,
  type_compte     TEXT DEFAULT 'enseignant' CHECK (type_compte IN ('enseignant', 'direction', 'admin')),
  langue          TEXT DEFAULT 'fr' CHECK (langue IN ('fr', 'en')),
  bio             TEXT,
  matiere         TEXT,
  niveau_enseignement TEXT,
  annees_exp      INTEGER DEFAULT 0,
  certifications  TEXT[],
  style_enseignement TEXT,
  instructions_perso TEXT,
  ia_config       JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. CLASSES
CREATE TABLE IF NOT EXISTS classes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enseignant_id   UUID REFERENCES utilisateurs(id) ON DELETE CASCADE NOT NULL,
  nom             TEXT NOT NULL,
  niveau          TEXT,
  matiere         TEXT,
  nombre_eleves   INTEGER DEFAULT 0,
  couleur         TEXT DEFAULT '#1B3F6E',
  langue          TEXT DEFAULT 'fr' CHECK (langue IN ('fr', 'en')),
  annee_scolaire  TEXT DEFAULT '2025-2026',
  curriculum_charge BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. PROGRAMME ANNUEL
CREATE TABLE IF NOT EXISTS programme_annuel (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classe_id       UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  titre           TEXT,
  nb_semaines     INTEGER DEFAULT 36,
  contenu_json    JSONB DEFAULT '{"unites": []}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 4. UNITÉS (optionnel — les unités sont aussi dans contenu_json de programme_annuel)
CREATE TABLE IF NOT EXISTS unites (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id    UUID REFERENCES programme_annuel(id) ON DELETE CASCADE,
  classe_id       UUID REFERENCES classes(id) ON DELETE CASCADE,
  numero          INTEGER,
  titre           TEXT,
  semaine_debut   INTEGER,
  semaine_fin     INTEGER,
  objectifs       TEXT[],
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 5. LEÇONS (plans de leçon)
CREATE TABLE IF NOT EXISTS lecons (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classe_id       UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  unite_id        UUID REFERENCES unites(id) ON DELETE SET NULL,
  numero          INTEGER,
  titre           TEXT NOT NULL,
  sujet           TEXT,
  duree_minutes   INTEGER DEFAULT 75,
  statut          TEXT DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'en_cours', 'complete')),
  contenu_json    JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 6. GÉNÉRATIONS IA (historique)
CREATE TABLE IF NOT EXISTS generations_ia (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enseignant_id   UUID REFERENCES utilisateurs(id) ON DELETE CASCADE NOT NULL,
  classe_id       UUID REFERENCES classes(id) ON DELETE SET NULL,
  type_contenu    TEXT,
  contenu_genere  TEXT,
  langue          TEXT DEFAULT 'fr',
  sauvegarde      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 7. COURS SEMAINE (calendrier hebdomadaire)
CREATE TABLE IF NOT EXISTS cours_semaine (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enseignant_id   UUID REFERENCES utilisateurs(id) ON DELETE CASCADE NOT NULL,
  classe_id       UUID REFERENCES classes(id) ON DELETE CASCADE,
  nom_classe      TEXT,
  couleur         TEXT DEFAULT '#1B3F6E',
  jour            TEXT NOT NULL CHECK (jour IN ('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi')),
  heure_debut     TEXT NOT NULL,
  heure_fin       TEXT NOT NULL,
  salle           TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 8. RESSOURCES PÉDAGOGIQUES
CREATE TABLE IF NOT EXISTS ressources (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enseignant_id   UUID REFERENCES utilisateurs(id) ON DELETE CASCADE NOT NULL,
  classe_id       UUID REFERENCES classes(id) ON DELETE SET NULL,
  titre           TEXT NOT NULL,
  type            TEXT DEFAULT 'document' CHECK (type IN ('document', 'lien', 'video', 'image', 'audio', 'autre')),
  url             TEXT,
  description     TEXT,
  tags            TEXT[],
  storage_path    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 9. COMMUNICATIONS PARENTS
CREATE TABLE IF NOT EXISTS communications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enseignant_id   UUID REFERENCES utilisateurs(id) ON DELETE CASCADE NOT NULL,
  classe_id       UUID REFERENCES classes(id) ON DELETE SET NULL,
  type            TEXT DEFAULT 'note' CHECK (type IN ('note', 'rapport', 'convocation', 'bulletin', 'autre')),
  sujet           TEXT NOT NULL,
  contenu         TEXT,
  destinataires   TEXT,
  date_envoi      DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 10. NOTES AGENDA (calendrier)
CREATE TABLE IF NOT EXISTS notes_agenda (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enseignant_id   UUID REFERENCES utilisateurs(id) ON DELETE CASCADE NOT NULL,
  date            DATE NOT NULL,
  type            TEXT DEFAULT 'note' CHECK (type IN ('note', 'rappel', 'evenement')),
  titre           TEXT NOT NULL,
  couleur         TEXT DEFAULT '#6B3FA0',
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notes_agenda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_notes_agenda" ON notes_agenda
  FOR ALL USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

-- 11. SONDAGES
CREATE TABLE IF NOT EXISTS sondages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enseignant_id   UUID REFERENCES utilisateurs(id) ON DELETE CASCADE NOT NULL,
  code            TEXT UNIQUE NOT NULL,
  question        TEXT NOT NULL,
  type            TEXT DEFAULT 'texte' CHECK (type IN ('texte', 'choix_multiple')),
  options         TEXT[] DEFAULT '{}',
  statut          TEXT DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'ferme')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sondages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_sondages" ON sondages
  FOR ALL USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );
CREATE POLICY "public_read_sondages" ON sondages
  FOR SELECT USING (true);

-- 12. RÉPONSES SONDAGE
CREATE TABLE IF NOT EXISTS reponses_sondage (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sondage_id      UUID REFERENCES sondages(id) ON DELETE CASCADE NOT NULL,
  reponse         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reponses_sondage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_insert_reponses" ON reponses_sondage
  FOR INSERT WITH CHECK (true);
CREATE POLICY "enseignant_read_reponses" ON reponses_sondage
  FOR SELECT USING (
    sondage_id IN (
      SELECT id FROM sondages
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE reponses_sondage;

-- 13. LISTE D'ATTENTE (page d'accueil)
CREATE TABLE IF NOT EXISTS liste_attente (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  nom             TEXT,
  ecole           TEXT,
  langue          TEXT DEFAULT 'fr',
  created_at      TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS) — chaque user voit seulement ses données
-- ============================================================

ALTER TABLE utilisateurs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_annuel  ENABLE ROW LEVEL SECURITY;
ALTER TABLE unites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations_ia    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cours_semaine     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ressources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE liste_attente     ENABLE ROW LEVEL SECURITY;


-- UTILISATEURS
CREATE POLICY "user_own_profil" ON utilisateurs
  FOR ALL USING (auth.uid() = user_id);

-- CLASSES (via enseignant_id)
CREATE POLICY "user_own_classes" ON classes
  FOR ALL USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

-- PROGRAMME ANNUEL (via classe)
CREATE POLICY "user_own_programme" ON programme_annuel
  FOR ALL USING (
    classe_id IN (
      SELECT id FROM classes
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

-- UNITÉS
CREATE POLICY "user_own_unites" ON unites
  FOR ALL USING (
    classe_id IN (
      SELECT id FROM classes
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

-- LEÇONS
CREATE POLICY "user_own_lecons" ON lecons
  FOR ALL USING (
    classe_id IN (
      SELECT id FROM classes
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );

-- GÉNÉRATIONS IA
CREATE POLICY "user_own_generations" ON generations_ia
  FOR ALL USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

-- COURS SEMAINE
CREATE POLICY "user_own_cours" ON cours_semaine
  FOR ALL USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

-- RESSOURCES
CREATE POLICY "user_own_ressources" ON ressources
  FOR ALL USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

-- COMMUNICATIONS
CREATE POLICY "user_own_communications" ON communications
  FOR ALL USING (
    enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
  );

-- LISTE D'ATTENTE (insertion publique, lecture uniquement par le proprio)
CREATE POLICY "public_insert_liste_attente" ON liste_attente
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_read_liste_attente" ON liste_attente
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ============================================================
-- TRIGGER : Crée automatiquement un profil utilisateur
-- lors de l'inscription (signup)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.utilisateurs (user_id, email, prenom, nom, ecole, type_compte, langue)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'prenom',
    NEW.raw_user_meta_data ->> 'nom',
    NEW.raw_user_meta_data ->> 'ecole',
    COALESCE(NEW.raw_user_meta_data ->> 'type_compte', 'enseignant'),
    COALESCE(NEW.raw_user_meta_data ->> 'langue', 'fr')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- MIGRATIONS — colonnes ajoutées après la création initiale
-- Exécute ces ALTER TABLE si la table utilisateurs existe déjà
-- ============================================================

ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS ville          TEXT;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS province       TEXT DEFAULT 'Québec';
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS telephone      TEXT;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS profil_ia      JSONB DEFAULT '{}';

-- Fix cours_semaine jour constraint to accept full French day names
ALTER TABLE cours_semaine DROP CONSTRAINT IF EXISTS cours_semaine_jour_check;
ALTER TABLE cours_semaine ADD CONSTRAINT cours_semaine_jour_check
  CHECK (jour IN ('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'));

-- Fix communications type constraint to match app values
ALTER TABLE communications DROP CONSTRAINT IF EXISTS communications_type_check;
ALTER TABLE communications ADD CONSTRAINT communications_type_check
  CHECK (type IN ('note_parents', 'annonce_classe', 'rappel', 'compte_rendu', 'note', 'rapport', 'convocation', 'bulletin', 'autre'));

-- ============================================================
-- TRIGGER : Crée automatiquement un profil utilisateur
-- lors de l'inscription (signup)
-- ============================================================

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
