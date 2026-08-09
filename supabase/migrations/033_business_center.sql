-- ════════════════════════════════════════════════════════════════════════════
-- SC-03M — Founder Business Center
-- Migration 033 : produits, roadmap, notifications, déploiements, company
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Produits ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_products (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  description TEXT,
  statut      TEXT        NOT NULL DEFAULT 'dev'
    CHECK (statut IN ('actif','beta','dev','pause','archive')),
  version     TEXT        NOT NULL DEFAULT '0.1.0',
  environnement TEXT      NOT NULL DEFAULT 'dev'
    CHECK (environnement IN ('dev','staging','production')),
  responsable TEXT,
  url_prod    TEXT,
  url_staging TEXT,
  logo_emoji  TEXT        DEFAULT '🚀',
  couleur     TEXT        DEFAULT '#F59E0B',
  ordre       INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO founder_products (nom, slug, description, statut, version, environnement, responsable, logo_emoji, couleur, ordre)
VALUES
  ('Scorgia',     'scorgia',     'Assistant IA pour enseignants francophones (Canada)',  'beta',    '0.3.0', 'production', 'Eddy Nwaha', '⚡', '#F59E0B', 1),
  ('MboaSchool',  'mboaschool',  'Plateforme éducative pour l''Afrique francophone',     'dev',     '0.0.1', 'dev',        'Eddy Nwaha', '🌍', '#34D399', 2)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Roadmap ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_roadmap (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titre        TEXT        NOT NULL,
  description  TEXT,
  statut       TEXT        NOT NULL DEFAULT 'backlog'
    CHECK (statut IN ('backlog','dev','tests','beta','production')),
  priorite     TEXT        NOT NULL DEFAULT 'medium'
    CHECK (priorite IN ('low','medium','high','critical')),
  produit_slug TEXT        NOT NULL DEFAULT 'scorgia',
  version_cible TEXT,
  sprint       TEXT,
  tags         TEXT[],
  ordre        INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO founder_roadmap (titre, description, statut, priorite, produit_slug, version_cible, sprint) VALUES
  ('Bêta privée 5–10 enseignants', 'Lancement contrôlé avec premiers bêta testeurs invités', 'beta', 'critical', 'scorgia', '0.3.0', 'Sprint 1'),
  ('Déploiement AWS', 'Migration infrastructure vers AWS (EC2, S3, CloudFront, RDS)', 'dev', 'critical', 'scorgia', '0.4.0', 'Sprint 2'),
  ('Facturation Stripe', 'Abonnements automatiques Pro / Pro+ / Institution', 'dev', 'critical', 'scorgia', '0.4.0', 'Sprint 2'),
  ('Export PDF avancé', 'Amélioration templates et mise en page des exports PDF', 'tests', 'high', 'scorgia', '0.3.1', 'Sprint 1'),
  ('Onboarding conversationnel', 'Assistant guidé IA pour les nouveaux enseignants', 'backlog', 'high', 'scorgia', '0.5.0', 'Sprint 3'),
  ('Application mobile iOS/Android', 'Version mobile native ou PWA avancée', 'backlog', 'medium', 'scorgia', '1.0.0', 'Sprint 5'),
  ('Intégration LMS', 'Connexion Google Classroom, Moodle, Microsoft Teams', 'backlog', 'medium', 'scorgia', '1.0.0', 'Sprint 4'),
  ('Analytique enseignant', 'Tableau de bord de progression des élèves', 'backlog', 'medium', 'scorgia', '0.6.0', 'Sprint 3'),
  ('Partage communauté', 'Partage de leçons entre enseignants Scorgia', 'backlog', 'low', 'scorgia', '0.7.0', 'Sprint 4'),
  ('MboaSchool MVP', 'Première version fonctionnelle de MboaSchool', 'backlog', 'medium', 'mboaschool', '0.1.0', 'Sprint 6'),
  ('MboaSchool Auth', 'Système d''authentification et profils élèves', 'backlog', 'high', 'mboaschool', '0.1.0', 'Sprint 6')
ON CONFLICT DO NOTHING;

-- ── 3. Notifications Founder ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT        NOT NULL
    CHECK (type IN ('signup','bug','ia_error','ia_cost','backup_fail','deploy','feedback','system')),
  titre        TEXT        NOT NULL,
  message      TEXT,
  priorite     TEXT        NOT NULL DEFAULT 'info'
    CHECK (priorite IN ('info','warning','critical')),
  lu           BOOLEAN     NOT NULL DEFAULT false,
  produit_slug TEXT        DEFAULT 'scorgia',
  lien         TEXT,
  data         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial notifications
INSERT INTO founder_notifications (type, titre, message, priorite, produit_slug) VALUES
  ('deploy',   'Scorgia v0.3.0 déployé', 'Founder Platform SC-03L livré avec succès', 'info', 'scorgia'),
  ('system',   'Business Center SC-03M disponible', '9 nouvelles pages Founder créées', 'info', 'scorgia'),
  ('feedback', 'Retours bêta en attente de review', 'Consultez /founder/bi pour les détails', 'warning', 'scorgia')
ON CONFLICT DO NOTHING;

-- ── 4. Déploiements ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_deployments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  version      TEXT        NOT NULL,
  produit_slug TEXT        NOT NULL DEFAULT 'scorgia',
  environnement TEXT       NOT NULL DEFAULT 'production'
    CHECK (environnement IN ('dev','staging','production')),
  statut       TEXT        NOT NULL DEFAULT 'success'
    CHECK (statut IN ('success','failed','rollback','in_progress')),
  deploye_par  TEXT        DEFAULT 'Eddy Nwaha',
  notes        TEXT,
  commit_sha   TEXT,
  branche      TEXT        DEFAULT 'main',
  migration_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO founder_deployments (version, produit_slug, environnement, statut, deploye_par, notes, branche, migration_id) VALUES
  ('0.3.0', 'scorgia', 'production', 'success', 'Eddy Nwaha', 'SC-03M Business Center — 9 pages, 5 tables', 'main', '033'),
  ('0.2.9', 'scorgia', 'production', 'success', 'Eddy Nwaha', 'SC-03L Founder Platform — 16 fichiers, 9 rôles', 'main', '032'),
  ('0.2.8', 'scorgia', 'production', 'success', 'Eddy Nwaha', 'SC-03K Bêta — BetaTour, FeedbackWidget, Logger', 'main', '031'),
  ('0.2.7', 'scorgia', 'production', 'success', 'Eddy Nwaha', 'SC-03J Enseigner — Certification module complet', 'main', '030')
ON CONFLICT DO NOTHING;

-- ── 5. Company Info (single row) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_info (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               TEXT        DEFAULT 'Bodingo AI Tech Inc.',
  numero_entreprise TEXT,
  adresse           TEXT,
  ville             TEXT        DEFAULT 'Montréal',
  province          TEXT        DEFAULT 'Québec',
  code_postal       TEXT,
  pays              TEXT        DEFAULT 'Canada',
  site_web          TEXT,
  email_contact     TEXT,
  domaines          TEXT[]      DEFAULT ARRAY['klassia.app','scorgia.ai'],
  github_org        TEXT        DEFAULT 'Bodingo-AI',
  aws_region        TEXT        DEFAULT 'ca-central-1',
  supabase_project  TEXT        DEFAULT 'qacdbcycjzgjygeaujqk',
  stripe_mode       TEXT        DEFAULT 'test',
  anthropic_org     TEXT,
  openai_org        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO company_info (nom, ville, province, pays, email_contact, domaines, github_org, aws_region, supabase_project, stripe_mode)
VALUES ('Bodingo AI Tech Inc.', 'Montréal', 'Québec', 'Canada', 'enwaha22@gmail.com', ARRAY['klassia.app','scorgia.ai','mboaschool.com'], 'Bodingo-AI', 'ca-central-1', 'qacdbcycjzgjygeaujqk', 'test')
ON CONFLICT DO NOTHING;

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE founder_products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_roadmap        ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_deployments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_info           ENABLE ROW LEVEL SECURITY;

-- Only founders/admins can access these tables (main access via service_role API routes)
CREATE POLICY "bc_products_founder"   ON founder_products      FOR ALL USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND (u.role IN ('founder','super_admin') OR u.is_admin)));
CREATE POLICY "bc_roadmap_founder"    ON founder_roadmap       FOR ALL USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND (u.role IN ('founder','super_admin') OR u.is_admin)));
CREATE POLICY "bc_notif_founder"      ON founder_notifications  FOR ALL USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND (u.role IN ('founder','super_admin') OR u.is_admin)));
CREATE POLICY "bc_deploy_founder"     ON founder_deployments    FOR ALL USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND (u.role IN ('founder','super_admin') OR u.is_admin)));
CREATE POLICY "bc_company_founder"    ON company_info           FOR ALL USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND (u.role IN ('founder','super_admin') OR u.is_admin)));

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_roadmap_statut_produit   ON founder_roadmap(statut, produit_slug);
CREATE INDEX IF NOT EXISTS idx_notifications_lu_priorite ON founder_notifications(lu, priorite);
CREATE INDEX IF NOT EXISTS idx_deployments_produit_ts    ON founder_deployments(produit_slug, created_at DESC);
