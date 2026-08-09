-- ─── SC-03L — Founder Platform : rôles, audit, invitations bêta ─────────────

-- ── 1. Table des rôles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scorgia_roles (
  id          TEXT    PRIMARY KEY,
  label       TEXT    NOT NULL,
  description TEXT,
  level       INTEGER NOT NULL DEFAULT 0,   -- 0 (min) → 100 (founder)
  permissions JSONB   NOT NULL DEFAULT '[]'
);

-- Peuplement initial
INSERT INTO scorgia_roles (id, label, description, level, permissions) VALUES
  ('founder',         'Fondateur',             'Propriétaire. Accès total, aucune restriction, aucun quota.',                 100, '["*"]'),
  ('super_admin',     'Super Administrateur',  'Gestion complète sauf actions destructives réservées au fondateur.',           90,  '["users.*","admin.*","beta.*","ia.*","audit.read","system.read"]'),
  ('admin',           'Administrateur',        'Gestion utilisateurs, contenus, bêta. Pas d''accès aux secrets système.',      70,  '["users.read","users.update","users.suspend","beta.read","ia.read","feedback.*"]'),
  ('beta_manager',    'Gestionnaire bêta',     'Gère les invitations et le programme bêta. Lecture des comptes uniquement.',   60,  '["beta.*","users.read","feedback.read"]'),
  ('support',         'Support',               'Lecture des comptes, réponse aux feedbacks, pas de CRUD.',                     50,  '["users.read","feedback.read","feedback.update"]'),
  ('teacher_premium', 'Enseignant Premium',    'Accès aux fonctionnalités avancées (Pro+). Aucun accès admin.',               20,  '["content.*","ia.premium","exports.*"]'),
  ('teacher',         'Enseignant',            'Compte enseignant standard.',                                                  10,  '["content.basic","ia.standard","exports.basic"]'),
  ('beta',            'Bêta testeur',          'Enseignant avec accès bêta complet et temporaire.',                           15,  '["content.*","ia.premium","exports.*","beta.feedback"]'),
  ('read_only',       'Lecture seule',         'Accès en lecture seule à son propre compte uniquement.',                       5,   '["content.read"]')
ON CONFLICT (id) DO NOTHING;

-- ── 2. Colonne role sur utilisateurs ─────────────────────────────────────────
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'teacher';

-- Contrainte de clé étrangère (non bloquante si la table est déjà peuplée)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'utilisateurs_role_fkey'
  ) THEN
    ALTER TABLE utilisateurs
      ADD CONSTRAINT utilisateurs_role_fkey
      FOREIGN KEY (role) REFERENCES scorgia_roles(id)
      ON UPDATE CASCADE ON DELETE SET DEFAULT;
  END IF;
END $$;

-- Attribuer le rôle fondateur
UPDATE utilisateurs
SET    role     = 'founder',
       is_admin = true
WHERE  email = 'enwaha22@gmail.com';

-- Synchroniser les comptes admin existants
UPDATE utilisateurs
SET    role = 'admin'
WHERE  (is_admin = true OR type_compte = 'admin')
AND    (role = 'teacher' OR role IS NULL)
AND    email != 'enwaha22@gmail.com';

-- ── 3. Piste d'audit ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_trail (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  acteur_id           UUID        REFERENCES utilisateurs(id) ON DELETE SET NULL,
  acteur_email        TEXT,                        -- copie au moment de l'événement
  acteur_role         TEXT,
  action              TEXT        NOT NULL,         -- ex: 'user.delete', 'role.change', 'impersonation.start'
  categorie           TEXT        NOT NULL
    CHECK (categorie IN ('auth','user','role','ia','beta','system','impersonation','data','admin','feedback')),
  cible_id            TEXT,
  cible_type          TEXT,                        -- 'user' | 'lecon' | 'classe' | 'invitation' | ...
  details             JSONB,
  impersonated_by_id  UUID        REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_acteur   ON audit_trail(acteur_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_categorie ON audit_trail(categorie);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_trail(action);

ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_read_audit" ON audit_trail
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.id = auth.uid()
      AND    (u.role IN ('founder','super_admin','admin') OR u.is_admin = true)
    )
  );

-- ── 4. Invitations bêta ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beta_invitations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT        NOT NULL,
  code           TEXT        UNIQUE NOT NULL
                 DEFAULT     upper(substring(md5(gen_random_uuid()::text) FROM 1 FOR 10)),
  utilisateur_id UUID        REFERENCES utilisateurs(id) ON DELETE SET NULL,
  statut         TEXT        NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','envoyee','acceptee','expiree','annulee')),
  expire_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  sent_at        TIMESTAMPTZ,
  activated_at   TIMESTAMPTZ,
  notes          TEXT,
  created_by     UUID        REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_inv_email   ON beta_invitations(email);
CREATE INDEX IF NOT EXISTS idx_beta_inv_statut  ON beta_invitations(statut);
CREATE INDEX IF NOT EXISTS idx_beta_inv_code    ON beta_invitations(code);

ALTER TABLE beta_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_manage_invitations" ON beta_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE  u.id = auth.uid()
      AND    (u.role IN ('founder','super_admin','admin','beta_manager') OR u.is_admin = true)
    )
  );

-- ── 5. Roles : lecture publique ──────────────────────────────────────────────
ALTER TABLE scorgia_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_roles" ON scorgia_roles FOR SELECT USING (true);
