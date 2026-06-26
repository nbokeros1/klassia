-- Migration 018 — Type calendrier_scolaire dans evenements_calendrier
-- Ajoute la valeur 'calendrier_scolaire' à la liste des types d'événements acceptés.
-- Si la colonne 'type' a une contrainte CHECK, on la remplace. Sinon, no-op.

DO $$
BEGIN
  -- Supprimer la contrainte CHECK existante sur le type si elle existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE '%evenements_calendrier%type%'
      AND contype = 'c'
  ) THEN
    -- Récupérer et supprimer la contrainte
    EXECUTE (
      SELECT 'ALTER TABLE public.evenements_calendrier DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint
      WHERE conname LIKE '%evenements_calendrier%type%'
        AND contype = 'c'
      LIMIT 1
    );
  END IF;
END;
$$;

-- Ajouter la nouvelle contrainte avec 'calendrier_scolaire' inclus
ALTER TABLE public.evenements_calendrier
  DROP CONSTRAINT IF EXISTS evenements_calendrier_type_check;

ALTER TABLE public.evenements_calendrier
  ADD CONSTRAINT evenements_calendrier_type_check
  CHECK (type IN (
    'lecon', 'evaluation', 'sortie', 'reunion', 'conge', 'autre', 'calendrier_scolaire'
  ));
