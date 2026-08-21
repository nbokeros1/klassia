interface AIUseNoticeProps {
  style?:   React.CSSProperties
  compact?: boolean
}

export default function AIUseNotice({ style, compact = false }: AIUseNoticeProps) {
  if (compact) {
    return (
      <p style={{
        fontSize: '12px',
        color:    'rgba(255,255,255,0.3)',
        lineHeight: 1.5,
        margin: 0,
        ...style,
      }}>
        ✦ ScorgIA utilise l&apos;IA pour assister certaines tâches pédagogiques. Vérifiez le contenu généré avant utilisation.
      </p>
    )
  }

  return (
    <div style={{
      background:   'rgba(167,139,250,0.06)',
      border:       '1px solid rgba(167,139,250,0.15)',
      borderRadius: '10px',
      padding:      '12px 16px',
      fontSize:     '13px',
      color:        'rgba(255,255,255,0.5)',
      lineHeight:   1.6,
      ...style,
    }}>
      <span style={{ color: '#A78BFA', fontWeight: 600, marginRight: '6px' }}>✦ IA</span>
      ScorgIA utilise des systèmes d&apos;intelligence artificielle pour assister certaines tâches pédagogiques. Les résultats générés doivent être vérifiés par l&apos;enseignant avant utilisation.
    </div>
  )
}
