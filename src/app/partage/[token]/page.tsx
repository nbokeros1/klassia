import { createAdminClient } from '@/lib/supabase/admin'
import MarkdownRenderer       from '@/components/ui/MarkdownRenderer'
import type { Metadata }      from 'next'

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('fichiers_dossier')
      .select('nom')
      .eq('lien_partage', token)
      .eq('partage_actif', true)
      .single()
    return { title: data?.nom ? `${data.nom} — ScorgIA` : 'Document partagé — ScorgIA' }
  } catch {
    return { title: 'Document partagé — ScorgIA' }
  }
}

export default async function PartagePublicPage({ params }: Props) {
  const { token } = await params

  let doc: { nom: string; contenu_html: string; created_at: string } | null = null
  let erreur = false

  try {
    // createAdminClient est utilisé server-side uniquement (Server Component, pas 'use client').
    // SUPABASE_SERVICE_ROLE_KEY n'est jamais dans NEXT_PUBLIC_ et ne transite pas vers le navigateur.
    // La requête est filtrée strictement : token de partage + partage_actif = true.
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('fichiers_dossier')
      .select('nom, contenu_html, created_at')
      .eq('lien_partage', token)
      .eq('partage_actif', true)
      .single()

    if (error || !data) {
      erreur = true
    } else {
      doc = data
    }
  } catch {
    erreur = true
  }

  const contenu = doc?.contenu_html || ''

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFF', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(10,22,40,0.96)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: 18, color: '#fff' }}>ScorgIA</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>Document partagé</span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {erreur || !doc ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F1B2D', marginBottom: 8 }}>
              Lien invalide ou expiré
            </div>
            <div style={{ fontSize: 14, color: '#5B6B85' }}>
              Ce lien de partage n&apos;est plus actif ou n&apos;existe pas.
            </div>
          </div>
        ) : (
          <>
            {/* Document header */}
            <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid rgba(15,35,65,0.08)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Document ScorgIA
              </div>
              <h1 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 26, fontWeight: 700, color: '#0F1B2D', margin: 0, marginBottom: 8 }}>
                {doc.nom || 'Document sans titre'}
              </h1>
              <div style={{ fontSize: 12, color: '#8B97AC' }}>
                Partagé via ScorgIA · {new Date(doc.created_at).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            {/* Content */}
            <div style={{ background: 'white', borderRadius: 16, padding: '32px', boxShadow: '0 2px 20px rgba(15,35,65,0.06)', border: '1px solid rgba(15,35,65,0.06)' }}>
              {contenu ? (
                <MarkdownRenderer content={contenu} className="md-doc" />
              ) : (
                <div style={{ color: '#8B97AC', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
                  Contenu non disponible
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: '#8B97AC' }}>
              Créé avec ScorgIA · La plateforme pédagogique IA pour les enseignants
            </div>
          </>
        )}
      </div>
    </div>
  )
}
