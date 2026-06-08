'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminCommunautePage() {
  const supabase = createClient()
  const [ressources, setRessources] = useState<any[]>([])
  const [signalements, setSignalements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ messages: 0, partages: 0, signalements: 0 })
  const [action, setAction] = useState<{ id: string; type: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      // Ressources communauté
      const { data: ress } = await supabase
        .from('studio_ia_ressources')
        .select('id, titre, source, type_contenu, created_at, enseignant_id')
        .eq('source', 'communaute')
        .order('created_at', { ascending: false })
        .limit(50)

      // Signalements (si table existe)
      let signaux: any[] = []
      try {
        const { data: sig } = await supabase
          .from('signalements')
          .select('*, ressource:studio_ia_ressources(titre)')
          .eq('traite', false)
          .order('created_at', { ascending: false })
        signaux = sig || []
      } catch { signaux = [] }

      // Messages communauté
      let nbMessages = 0
      try {
        const { count } = await supabase
          .from('communaute_messages')
          .select('id', { count: 'exact', head: true })
        nbMessages = count || 0
      } catch { nbMessages = 0 }

      setRessources(ress || [])
      setSignalements(signaux)
      setStats({ messages: nbMessages, partages: (ress || []).length, signalements: signaux.length })
      setLoading(false)
    }
    load()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette ressource de la communauté ?')) return
    await supabase.from('studio_ia_ressources').delete().eq('id', id)
    setRessources(prev => prev.filter(r => r.id !== id))
    setStats(s => ({ ...s, partages: s.partages - 1 }))
  }

  const handleSignalement = async (id: string, decision: 'supprimer' | 'ignorer') => {
    if (decision === 'supprimer') {
      const sig = signalements.find(s => s.id === id)
      if (sig?.ressource_id) await supabase.from('studio_ia_ressources').delete().eq('id', sig.ressource_id)
    }
    try { await supabase.from('signalements').update({ traite: true }).eq('id', id) } catch { }
    setSignalements(prev => prev.filter(s => s.id !== id))
    setStats(s => ({ ...s, signalements: Math.max(0, s.signalements - 1) }))
    setAction(null)
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>👥 Communauté</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Modération · Partages · Signalements</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { icon: '💬', label: 'Messages envoyés', value: stats.messages, color: '#60A5FA' },
              { icon: '📁', label: 'Ressources partagées', value: stats.partages, color: '#34D399' },
              { icon: '🚨', label: 'Signalements en attente', value: stats.signalements, color: stats.signalements > 0 ? '#F87171' : '#94A3B8' },
            ].map(k => (
              <div key={k.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{k.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: k.color, marginBottom: 3 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Signalements */}
          {signalements.length > 0 && (
            <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F87171', marginBottom: 14 }}>
                🚨 Signalements en attente de modération ({signalements.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {signalements.map(s => (
                  <div key={s.id} style={{ background: '#111827', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                        {s.ressource?.titre || 'Ressource inconnue'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        {s.motif || 'Motif non précisé'} · {new Date(s.created_at).toLocaleDateString('fr-CA')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleSignalement(s.id, 'supprimer')}
                        style={{ padding: '6px 12px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, color: '#F87171', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Supprimer
                      </button>
                      <button onClick={() => handleSignalement(s.id, 'ignorer')}
                        style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Ignorer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ressources partagées */}
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>
              Ressources de la communauté
            </div>
            {ressources.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Aucune ressource communauté</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {ressources.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{r.titre || 'Sans titre'}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                        {r.type_contenu} · {new Date(r.created_at).toLocaleDateString('fr-CA')}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(r.id)}
                      style={{ padding: '5px 10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 7, color: '#F87171', fontSize: 11, cursor: 'pointer' }}>
                      🗑 Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
