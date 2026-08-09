-- ── 022 — Ajouter storage_path et mime_type à fichiers_dossier ───────────────
--
-- Contexte : jusqu'à cette migration, uploadFile() stockait uniquement l'URL
-- signée dans url_storage. L'URL Supabase Storage expire après 1 an et ne
-- peut pas être renouvelée sans le chemin d'origine.
--
-- storage_path  : chemin permanent du fichier dans le bucket Storage
--                 (ex : {enseignant_id}/{classe_id}/{type}/{timestamp}_{nom})
--                 Conservé indéfiniment — permet de regénérer une URL signée.
--
-- url_storage   : URL d'accès temporaire (signée). Colonne existante inchangée,
--                 conservée pour la compatibilité avec l'affichage actuel.
--
-- mime_type     : type MIME réel fourni par le navigateur lors de l'upload
--                 (ex : 'application/pdf', 'image/png', 'text/plain').
--                 Plus précis que type_fichier qui est une catégorie applicative.
--
-- Ces deux colonnes sont nullable : les lignes existantes ne sont pas forcées
-- à une valeur — elles seront renseignées uniquement par les nouveaux uploads.

ALTER TABLE fichiers_dossier
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS mime_type    TEXT;
