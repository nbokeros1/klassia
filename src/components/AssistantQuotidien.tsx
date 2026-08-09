'use client'

interface Props {
  prenom:         string
  isFr:           boolean
  nbClasses:      number
  nbLecons:       number
  nbTaches:       number
  nbCoursAujourd: number
  onPreparer:     () => void
  onEnseigner:    () => void
  onCreerClasse:  () => void
  onDemanderIA:   () => void
}

export default function AssistantQuotidien({
  prenom, isFr, nbClasses, nbLecons, nbTaches, nbCoursAujourd,
  onPreparer, onEnseigner, onCreerClasse, onDemanderIA,
}: Props) {

  // ── État contextuel ──────────────────────────────────────────────────────────
  let recommandation: string
  let actionLabel:    string
  let onAction:       () => void

  if (isFr) {
    if (nbClasses === 0) {
      recommandation = "Commencez par créer votre première classe pour accéder à toutes les fonctionnalités."
      actionLabel    = "+ Créer une classe"
      onAction       = onCreerClasse
    } else if (nbCoursAujourd > 0) {
      recommandation = `Vous avez ${nbCoursAujourd} cours prévu${nbCoursAujourd > 1 ? 's' : ''} aujourd'hui. Lancez votre session d'enseignement.`
      actionLabel    = "▶ Enseigner maintenant"
      onAction       = onEnseigner
    } else if (nbTaches > 0) {
      recommandation = `Vous avez ${nbTaches} tâche${nbTaches > 1 ? 's' : ''} en attente. Commencez par préparer votre prochaine leçon.`
      actionLabel    = "✨ Préparer maintenant"
      onAction       = onPreparer
    } else {
      recommandation = "Tout est à jour. Profitez-en pour préparer votre prochaine leçon avec l'IA."
      actionLabel    = "✨ Préparer une leçon"
      onAction       = onPreparer
    }
  } else {
    if (nbClasses === 0) {
      recommandation = "Start by creating your first class to access all features."
      actionLabel    = "+ Create a class"
      onAction       = onCreerClasse
    } else if (nbCoursAujourd > 0) {
      recommandation = `You have ${nbCoursAujourd} class${nbCoursAujourd > 1 ? 'es' : ''} today. Start your teaching session.`
      actionLabel    = "▶ Teach now"
      onAction       = onEnseigner
    } else if (nbTaches > 0) {
      recommandation = `You have ${nbTaches} pending task${nbTaches > 1 ? 's' : ''}. Start by preparing your next lesson.`
      actionLabel    = "✨ Prepare now"
      onAction       = onPreparer
    } else {
      recommandation = "All up to date. Take this time to prepare your next lesson with AI."
      actionLabel    = "✨ Prepare a lesson"
      onAction       = onPreparer
    }
  }

  const salutation = prenom
    ? (isFr ? `Bonjour ${prenom} 👋` : `Hello ${prenom} 👋`)
    : (isFr ? 'Bonjour 👋' : 'Hello 👋')

  const pills = isFr
    ? [
        `${nbClasses} classe${nbClasses !== 1 ? 's' : ''} active${nbClasses !== 1 ? 's' : ''}`,
        `${nbLecons} leçon${nbLecons !== 1 ? 's' : ''} préparée${nbLecons !== 1 ? 's' : ''}`,
        `${nbTaches} tâche${nbTaches !== 1 ? 's' : ''} en attente`,
      ]
    : [
        `${nbClasses} active class${nbClasses !== 1 ? 'es' : ''}`,
        `${nbLecons} lesson${nbLecons !== 1 ? 's' : ''} prepared`,
        `${nbTaches} pending task${nbTaches !== 1 ? 's' : ''}`,
      ]

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="glass-strong"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-card)',
        borderLeft: '3px solid var(--violet)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Blob décoratif — discret */}
      <div style={{
        position: 'absolute', top: -24, right: -24,
        width: 110, height: 110,
        background: 'rgba(108,92,231,0.07)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      {/* Eyebrow */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        color: 'var(--violet)', textTransform: 'uppercase' as const,
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--violet)', display: 'inline-block', flexShrink: 0,
        }} />
        {isFr ? 'ScorgIA · Assistant quotidien' : 'ScorgIA · Daily assistant'}
      </div>

      {/* Salutation */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 20, fontWeight: 700,
        color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 10,
      }}>
        {salutation}
      </div>

      {/* Pills résumé */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 14 }}>
        {pills.map((pill, i) => (
          <span key={i} style={{
            fontSize: 11, color: 'var(--text-secondary)',
            background: 'rgba(15,35,65,0.05)',
            border: '1px solid rgba(15,35,65,0.07)',
            padding: '3px 10px', borderRadius: 99,
          }}>
            {pill}
          </span>
        ))}
      </div>

      {/* Recommandation */}
      <div style={{
        fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55,
        marginBottom: 18, paddingLeft: 12,
        borderLeft: '2px solid rgba(108,92,231,0.18)',
      }}>
        {recommandation}
      </div>

      {/* Boutons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        <button
          onClick={onAction}
          style={{
            padding: '9px 18px', fontSize: 13, fontWeight: 600,
            background: 'var(--violet)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            boxShadow: '0 4px 12px var(--violet-glow)',
            fontFamily: 'inherit',
          }}
        >
          {actionLabel}
        </button>

        {nbClasses > 0 && (
          <button
            onClick={onDemanderIA}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: 600,
              color: 'var(--violet)',
              background: 'rgba(108,92,231,0.08)',
              border: '1px solid rgba(108,92,231,0.2)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {isFr ? 'Demander à ScorgIA' : 'Ask ScorgIA'}
          </button>
        )}
      </div>
    </div>
  )
}
