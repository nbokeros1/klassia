'use client'

import { getTemplate } from '@/lib/constants/templates-provinciaux'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrintForm {
  titre: string
  intention: string
  objectifs: string
  avant_amorce: string
  avant_duree: string
  pendant_modelisation: string
  pendant_pratique_guidee: string
  pendant_pratique_autonome: string
  pendant_duree: string
  apres_cloture: string
  apres_billet: string
  apres_duree: string
  materiel: string
  criteres: string
  differentiation: string
  vocabulaire: string
}

interface Props {
  open: boolean
  onClose: () => void
  lecon: any
  classe: any
  profil: any
  form: PrintForm
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeProvince(p: string): string {
  const s = (p || '')
    .toLowerCase()
    .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u')
  if (s.includes('ontario'))                          return 'ontario'
  if (s.includes('albert'))                           return 'alberta'
  if (s.includes('qu') || s === 'qc')                return 'quebec'
  if (s.includes('colomb') || s.includes('bc'))       return 'bc'
  if (s.includes('sask'))                             return 'saskatchewan'
  if (s.includes('manit'))                            return 'manitoba'
  if (s.includes('nouveau') || s.includes('new bru')) return 'nouveau_brunswick'
  if (s.includes('ib') || s.includes('baccal'))       return 'ib'
  if (s.includes('france'))                           return 'france'
  if (s.includes('common') || s.includes('usa'))      return 'common_core'
  return 'alberta'
}

function stripHtml(html: string): string {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s{2,}/g, ' ').trim()
}

function htmlToLines(html: string): string[] {
  const text = (html || '')
    .replace(/<\/li>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  return text.split('\n').map(s => s.trim()).filter(Boolean)
}

// ─── PrintPanel ───────────────────────────────────────────────────────────────

export default function PrintPanel({ open, onClose, lecon, classe, profil, form }: Props) {
  if (!open) return null

  const province = normalizeProvince(profil?.province || '')
  const template = getTemplate(province)
  const dateStr  = new Date().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
  const totalMin = (parseInt(form.avant_duree) || 0) + (parseInt(form.pendant_duree) || 0) + (parseInt(form.apres_duree) || 0)

  // ── Map champ.id → valeur du formulaire ────────────────────────────────────
  const cj = lecon?.contenu_json || {}
  const getVal = (id: string): string => {
    const map: Record<string, string> = {
      // en-tête
      nom_enseignant:         `${profil?.prenom || ''} ${profil?.nom || ''}`.trim(),
      niveau:                 classe?.niveau || '',
      matiere:                classe?.matiere || '',
      duree:                  `${totalMin} min`,
      titre:                  form.titre,
      // cadre
      intention:              form.intention,
      objectifs:              form.objectifs,
      criteres:               form.criteres,
      criteres_succes:        form.criteres,
      evaluation:             form.criteres,
      differentiation:        form.differentiation,
      rag:                    cj.rag || '',
      ras:                    cj.ras || '',
      rat:                    cj.rat || '',
      attentes_curriculum:    cj.attentes_curriculum || '',
      competences_disciplinaires: form.objectifs,
      competences_transversales:  cj.competences_transversales || '',
      integration_langue:     cj.integration_langue || '',
      perspective_autochtone: cj.perspective_autochtone || '',
      pistes_observation:     cj.pistes_observation || '',
      big_ideas:              cj.big_ideas || '',
      curricular_competencies: form.objectifs,
      first_peoples:          cj.first_peoples || '',
      indicateurs_rendement:  cj.indicateurs_rendement || '',
      approches_peda:         cj.approches_peda || '',
      domaines_formation:     cj.domaines_formation || '',
      accommodements:         cj.accommodements || '',
      psac:                   cj.psac || '',
      // avant
      avant_amorce:           form.avant_amorce,
      avant_connexion:        form.avant_amorce,
      avant_temps:            `${form.avant_duree} min`,
      avant_materiel:         form.materiel,
      // pendant
      pendant_modelisation:   form.pendant_modelisation,
      pendant_guidee:         form.pendant_pratique_guidee,
      pendant_autonome:       form.pendant_pratique_autonome,
      pendant_temps:          `${form.pendant_duree} min`,
      pendant_materiel:       form.materiel,
      // après
      apres_retour:           form.apres_cloture,
      reinvestissement:       form.apres_billet,
      apres_materiel:         form.materiel,
      apres_temps:            `${form.apres_duree} min`,
    }
    return map[id] ?? cj[id] ?? ''
  }

  const hasContent = (id: string) => {
    const v = getVal(id)
    return v && stripHtml(v).length > 0
  }

  // ── DOCX download ──────────────────────────────────────────────────────────
  const handleDownloadDocx = async () => {
    try {
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecon: {
            titre: form.titre,
            intention: stripHtml(form.intention),
            objectifs: htmlToLines(form.objectifs),
            avant_amorce: stripHtml(form.avant_amorce),
            avant_duree: form.avant_duree,
            pendant_modelisation: stripHtml(form.pendant_modelisation),
            pendant_pratique_guidee: stripHtml(form.pendant_pratique_guidee),
            pendant_pratique_autonome: stripHtml(form.pendant_pratique_autonome),
            pendant_duree: form.pendant_duree,
            apres_cloture: stripHtml(form.apres_cloture),
            apres_billet: stripHtml(form.apres_billet),
            apres_duree: form.apres_duree,
            criteres: htmlToLines(form.criteres),
            differentiation: stripHtml(form.differentiation),
            materiel: htmlToLines(form.materiel),
          },
          classe: { nom: classe?.nom, niveau: classe?.niveau, matiere: classe?.matiere, nombre_eleves: classe?.nombre_eleves },
          enseignant: { prenom: profil?.prenom, nom: profil?.nom, ecole: profil?.ecole },
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = `KlassIA_${(form.titre || 'lecon').replace(/\s+/g, '_')}.docx`
        document.body.appendChild(a); a.click(); a.remove()
        URL.revokeObjectURL(url)
      }
    } catch { /* silent */ }
  }

  // ── Styles inline réutilisables ────────────────────────────────────────────
  const S = {
    sectionHeader: (bg: string, color = 'white'): React.CSSProperties => ({
      background: bg, color, padding: '6px 14px',
      fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.8px', textTransform: 'uppercase' as const,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }),
    fieldLabel: { fontSize: 9.5, fontWeight: 700, color: '#374151', fontFamily: 'system-ui,sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 4 },
    fieldContent: { fontSize: 10.5, color: '#111827', fontFamily: 'Georgia,serif', lineHeight: 1.6 },
    cell: (borderTop = true, borderRight = false): React.CSSProperties => ({
      padding: '8px 12px', verticalAlign: 'top',
      borderTop: borderTop ? '1px solid #E5E7EB' : 'none',
      borderRight: borderRight ? '1px solid #E5E7EB' : 'none',
    }),
    champ: (champ: any): React.CSSProperties => ({
      padding: '7px 12px', borderTop: '1px solid #E5E7EB',
      borderRight: '1px solid #E5E7EB',
    }),
  }

  // ── Moment block helper ────────────────────────────────────────────────────
  const MomentBlock = ({
    label, color, bg, champs, temps,
  }: {
    label: string; color: string; bg: string
    champs: { id: string; label: string; type: string }[]
    temps: string
  }) => (
    <div className="klassia-print-moment" style={{ marginBottom: 12, border: `2px solid ${color}`, borderRadius: 4, overflow: 'hidden', pageBreakInside: 'avoid' }}>
      <div style={S.sectionHeader(color)}>
        <span>{label}</span>
        <span style={{ fontWeight: 400, fontSize: 10 }}>Temps prévu : {temps}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup><col style={{ width: '70%' }}/><col style={{ width: '30%' }}/></colgroup>
        <tbody>
          {champs.filter(c => c.id !== 'avant_temps' && c.id !== 'pendant_temps' && c.id !== 'apres_temps').map((c, i) => {
            if (c.id.includes('materiel')) return null
            const val = getVal(c.id)
            if (!val && !['avant_amorce','pendant_modelisation','pendant_guidee','apres_retour'].includes(c.id)) return null
            return (
              <tr key={c.id}>
                <td style={{ ...S.cell(i > 0, true), background: i === 0 ? bg : 'white' }}>
                  <div style={S.fieldLabel}>{c.label}</div>
                  <div style={S.fieldContent} dangerouslySetInnerHTML={{ __html: val || '<span style="color:#9CA3AF;font-style:italic">—</span>' }} />
                </td>
                {i === 0 && (
                  <td rowSpan={champs.filter(c2 => !c2.id.includes('materiel') && !c2.id.includes('temps')).length} style={{ ...S.cell(false, false), background: '#F9FAFB', verticalAlign: 'top' }}>
                    <div style={S.fieldLabel}>Matériaux / Ressources</div>
                    <div style={S.fieldContent} dangerouslySetInnerHTML={{ __html: form.materiel || '<span style="color:#9CA3AF">—</span>' }} />
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Print CSS ──────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .klassia-print-area,
          .klassia-print-area * { visibility: visible !important; }
          .klassia-print-area {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100vh !important;
            padding: 1.5cm 2cm !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            z-index: 99999 !important;
          }
          .klassia-print-moment { page-break-inside: avoid; margin-bottom: 14pt !important; }
          .klassia-print-footer { margin-top: 24pt !important; }
          @page { margin: 1.5cm 2cm; size: A4; }
        }
      `}</style>

      {/* ── Backdrop ───────────────────────────────────────────────────────── */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 800 }} />

      {/* ── Panel wrapper ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 720,
        background: '#FFFFFF', zIndex: 900,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-12px 0 48px rgba(0,0,0,0.5)',
        borderLeft: '1px solid #E5E7EB',
      }}>

        {/* ── Barre de contrôle (screen-only) ────────────────────────────── */}
        <div style={{
          padding: '10px 16px', background: '#F3F4F6', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => window.print()} style={{
              padding: '7px 16px', background: '#1E3A5F', color: 'white',
              border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              🖨️ Imprimer
            </button>
            <button onClick={handleDownloadDocx} style={{
              padding: '7px 14px', background: 'white', color: '#374151',
              border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              📄 Télécharger Word
            </button>
            <div style={{ fontSize: 11, color: '#6B7280', paddingLeft: 8, borderLeft: '1px solid #E5E7EB' }}>
              Template : {template.province} · {dateStr}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: '50%', border: 'none',
            background: '#E5E7EB', color: '#374151', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* ── Zone imprimable ─────────────────────────────────────────────── */}
        <div className="klassia-print-area" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', background: 'white', color: '#111827' }}>

          {/* ── EN-TÊTE ─────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '3px solid #1E3A5F' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#6B3FA0,#4F46E5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 900, color: 'white', fontFamily: 'system-ui,sans-serif',
                flexShrink: 0,
              }}>K</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', fontFamily: 'system-ui,sans-serif' }}>KlassIA+</div>
                <div style={{ fontSize: 9, color: '#6B7280', fontFamily: 'system-ui,sans-serif' }}>Plan de leçon</div>
              </div>
            </div>
            {/* Date + classe */}
            <div style={{ textAlign: 'right', fontSize: 9.5, color: '#6B7280', fontFamily: 'system-ui,sans-serif' }}>
              <div>{dateStr}</div>
              <div style={{ marginTop: 2, fontWeight: 600, color: '#374151' }}>{classe?.nom} · {classe?.annee_scolaire || '2025-2026'}</div>
            </div>
          </div>

          {/* Titre de la leçon */}
          <h1 style={{ fontSize: 17, fontWeight: 800, color: '#111827', fontFamily: 'system-ui,sans-serif', margin: '0 0 12px 0', lineHeight: 1.2 }}>
            {form.titre || 'Plan de leçon'}
          </h1>

          {/* Tableau en-tête (champs_entete du template) */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, border: '1px solid #E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
            <tbody>
              <tr>
                {template.champs_entete.map((c, i) => (
                  <td key={c.id} style={{
                    padding: '6px 10px', fontSize: 9.5, fontFamily: 'system-ui,sans-serif',
                    borderRight: i < template.champs_entete.length - 1 ? '1px solid #E5E7EB' : 'none',
                    background: i % 2 === 0 ? '#F9FAFB' : 'white',
                    verticalAlign: 'top',
                  }}>
                    <div style={{ fontWeight: 700, color: '#6B7280', fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{getVal(c.id) || '—'}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* ── CADRE PÉDAGOGIQUE ──────────────────────────────────────── */}
          <div style={{ marginBottom: 14 }}>
            <div style={S.sectionHeader('#1E3A5F')}>
              <span>Cadre pédagogique</span>
              <span style={{ fontWeight: 400, fontSize: 10 }}>{template.province}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E7EB' }}>
              <colgroup><col style={{ width: '50%' }}/><col style={{ width: '50%' }}/></colgroup>
              <tbody>
                {template.champs_cadre.reduce<React.ReactElement[]>((rows, c, i) => {
                  const val = getVal(c.id)
                  if (!hasContent(c.id) && !c.obligatoire) return rows
                  if (i % 2 === 0) {
                    const next = template.champs_cadre[i + 1]
                    const nextVal = next ? getVal(next.id) : ''
                    rows.push(
                      <tr key={c.id}>
                        <td style={{ ...S.cell(true, true) }}>
                          <div style={S.fieldLabel}>{c.label}</div>
                          <div style={S.fieldContent} dangerouslySetInnerHTML={{ __html: val || '<span style="color:#9CA3AF;font-style:italic">—</span>' }} />
                        </td>
                        {next ? (
                          <td style={S.cell(true, false)}>
                            <div style={S.fieldLabel}>{next.label}</div>
                            <div style={S.fieldContent} dangerouslySetInnerHTML={{ __html: nextVal || '<span style="color:#9CA3AF;font-style:italic">—</span>' }} />
                          </td>
                        ) : <td style={S.cell(true, false)} />}
                      </tr>
                    )
                  }
                  return rows
                }, [])}
              </tbody>
            </table>
          </div>

          {/* ── LES 3 MOMENTS ──────────────────────────────────────────── */}
          <MomentBlock
            label={template.label_avant}
            color="#B45309"
            bg="#FFFBEB"
            champs={template.champs_avant as any[]}
            temps={`${form.avant_duree} min`}
          />
          <MomentBlock
            label={template.label_pendant}
            color="#1E3A5F"
            bg="#EFF6FF"
            champs={template.champs_pendant as any[]}
            temps={`${form.pendant_duree} min`}
          />
          <MomentBlock
            label={template.label_apres}
            color="#065F46"
            bg="#ECFDF5"
            champs={template.champs_apres as any[]}
            temps={`${form.apres_duree} min`}
          />

          {/* ── Notes / Vocabulaire si rempli ──────────────────────────── */}
          {hasContent('vocabulaire') && (
            <div style={{ marginBottom: 14, border: '1px solid #E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
              <div style={S.sectionHeader('#4B5563')}>Vocabulaire clé</div>
              <div style={{ padding: '8px 12px', ...S.fieldContent }} dangerouslySetInnerHTML={{ __html: form.vocabulaire }} />
            </div>
          )}

          {/* ── FOOTER ───────────────────────────────────────────────── */}
          <div className="klassia-print-footer" style={{
            marginTop: 20, paddingTop: 10, borderTop: '1px solid #E5E7EB',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 8.5, color: '#9CA3AF', fontFamily: 'system-ui,sans-serif',
          }}>
            <span>Généré par KlassIA+ — klassia.app · {dateStr}</span>
            <span style={{ fontWeight: 600 }}>klassia.app</span>
            <span>{profil?.prenom} {profil?.nom} · {profil?.ecole || ''}</span>
          </div>

        </div>{/* /klassia-print-area */}
      </div>{/* /panel wrapper */}
    </>
  )
}
