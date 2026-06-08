'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type GabaritState = 'idle' | 'parsing' | 'analysing' | 'saving' | 'done' | 'error'

interface GabaritUploadProps {
  profilId:     string
  currentUrl?:  string | null
  onAnalysed?:  (analyse: Record<string, any>, url: string) => void
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATE_LABELS: Record<GabaritState, string> = {
  idle:      '📂 Uploader mon gabarit de leçon',
  parsing:   '⏳ Extraction du texte...',
  analysing: '✦ Analyse par KlassIA+...',
  saving:    '💾 Sauvegarde...',
  done:      '✓ Gabarit analysé et intégré',
  error:     '❌ Erreur — cliquer pour réessayer',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GabaritUpload({ profilId, currentUrl, onAnalysed }: GabaritUploadProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [state,   setState]   = useState<GabaritState>(currentUrl ? 'done' : 'idle')
  const [analyse, setAnalyse] = useState<Record<string, any> | null>(null)
  const [err,     setErr]     = useState('')

  const isLoading = ['parsing', 'analysing', 'saving'].includes(state)

  const handleFile = async (file: File) => {
    setState('parsing')
    setErr('')

    // 1. Extraire le texte
    let texte = ''
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import/docx', { method: 'POST', body: fd })
      if (res.ok) {
        const json = await res.json()
        const div  = document.createElement('div')
        div.innerHTML = json.html || ''
        texte = (div.innerText || div.textContent || '').slice(0, 8000)
      }
    } catch { }

    if (!texte.trim()) {
      try { texte = (await file.text()).slice(0, 8000) } catch { }
    }

    if (!texte.trim()) {
      setState('error')
      setErr('Impossible d\'extraire le texte du fichier.')
      return
    }

    // 2. Analyser avec Claude
    setState('analysing')
    let analyseResult: Record<string, any> = {
      sections: [], style: 'non analysé', vocabulaire: [], structure_resume: '',
    }
    try {
      const res = await fetch('/api/ia/analyser-gabarit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contenu_texte: texte }),
      })
      if (res.ok) {
        const json = await res.json()
        analyseResult = json.analyse || analyseResult
      }
    } catch { }

    // 3. Upload Storage
    setState('saving')
    let publicUrl = ''
    try {
      const path = `${profilId}/gabarit_${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const { data: up } = await supabase.storage
        .from('ressources').upload(path, file, { upsert: true })
      if (up?.path) {
        publicUrl = supabase.storage.from('ressources').getPublicUrl(up.path).data.publicUrl
      }
    } catch { }

    // 4. Sauvegarder dans utilisateurs
    await supabase.from('utilisateurs').update({
      gabarit_lecon_url:     publicUrl || null,
      gabarit_lecon_analyse: JSON.stringify(analyseResult),
    } as any).eq('id', profilId)

    // 5. Injecter dans studio_ia_ressources (mémoire IA)
    await supabase.from('studio_ia_ressources').upsert({
      enseignant_id: profilId,
      source:        'upload_personnel',
      type_contenu:  'gabarit',
      titre:         `Gabarit — ${file.name}`,
      contenu_texte: texte,
      url:           publicUrl || null,
      est_general:   true,
    })

    setAnalyse(analyseResult)
    setState('done')
    onAnalysed?.(analyseResult, publicUrl)
  }

  return (
    <div>
      <style>{`@keyframes gb-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Bouton / zone de drop */}
      <div
        onClick={() => !isLoading && inputRef.current?.click()}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 12,
          border: `1.5px solid ${
            state === 'done'  ? 'rgba(52,211,153,0.35)'  :
            state === 'error' ? 'rgba(248,113,113,0.35)' :
            'rgba(255,255,255,0.12)'
          }`,
          background: state === 'done'  ? 'rgba(52,211,153,0.07)'  :
                      state === 'error' ? 'rgba(248,113,113,0.07)' :
                      'rgba(255,255,255,0.04)',
          color: state === 'done'  ? '#34D399' :
                 state === 'error' ? '#F87171' :
                 'var(--text-2)',
          fontSize: 13, fontWeight: 600,
          cursor: isLoading ? 'wait' : 'pointer',
          transition: 'all 0.2s', userSelect: 'none' as const,
        }}>
        <input ref={inputRef} type="file" accept=".docx,.pdf,.txt,.doc"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

        {isLoading && (
          <div style={{
            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
            border: '2px solid rgba(167,139,250,0.3)',
            borderTop: '2px solid #A78BFA',
            animation: 'gb-spin 0.75s linear infinite',
          }} />
        )}

        <span>{STATE_LABELS[state]}</span>

        {!isLoading && state !== 'done' && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-4)', fontWeight: 400 }}>
            DOCX · PDF · TXT
          </span>
        )}
      </div>

      {/* Résultat analyse */}
      {state === 'done' && analyse && (
        <div style={{ marginTop: 12, padding: '14px 16px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#34D399', marginBottom: 6 }}>
            ✓ Votre gabarit a été analysé et intégré.
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 10 }}>
            L'IA reproduira votre structure dans toutes vos prochaines générations de leçons.
          </div>

          {analyse.structure_resume && (
            <div style={{ fontSize: 11, color: 'var(--text-4)', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 }}>
              "{analyse.structure_resume}"
            </div>
          )}

          {analyse.sections?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
                Sections détectées
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                {(analyse.sections as string[]).slice(0, 8).map((s, i) => (
                  <span key={i} style={{ fontSize: 10, padding: '2px 9px', background: 'rgba(52,211,153,0.12)', color: '#34D399', borderRadius: 99, fontWeight: 600 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { setState('idle'); setAnalyse(null) }}
            style={{ marginTop: 10, fontSize: 11, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            Remplacer le gabarit →
          </button>
        </div>
      )}

      {err && <div style={{ marginTop: 8, fontSize: 12, color: '#F87171' }}>{err}</div>}
    </div>
  )
}
