import { createClient } from '@/lib/supabase/client'

type SourceNourrissage =
  | 'upload_fichier'
  | 'generation_ia'
  | 'lecon_validee'
  | 'feedback_lecon'
  | 'curriculum'
  | 'gabarit'
  | 'fichier_joint_chat'

export async function nourrirIA(params: {
  enseignant_id: string
  classe_id?:    string
  source:        SourceNourrissage
  titre:         string
  type:          string
  contenu_texte?: string
  url_storage?:  string
}): Promise<void> {
  const supabase = createClient()

  // Convertir titre → cle (schéma existant utilise cle + contenu JSONB)
  const cle = params.titre
    .substring(0, 180)
    .replace(/[^\w\sÀ-ÿ-]/g, '')
    .trim()
    || `${params.source}_${Date.now()}`

  await supabase
    .from('studio_ia_memoire')
    .upsert({
      enseignant_id: params.enseignant_id,
      classe_id:     params.classe_id ?? null,
      type:          params.type,
      cle,
      contenu: {
        titre:         params.titre,
        source:        params.source,
        contenu_texte: params.contenu_texte?.substring(0, 1200),
        url_storage:   params.url_storage,
      },
    }, {
      onConflict:       'enseignant_id,cle,type',
      ignoreDuplicates: false,
    })
  // Silencieux — aucune erreur propagée
}
