'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { sanitizeSvg, splitAtSvg, hasPendingSvgBlock } from '@/lib/utils/parser-svg-schema'

// ── Sous-composant : bloc SVG rendu ──────────────────────────────────────────

function SvgBlock({ raw }: { raw: string }) {
  const clean = sanitizeSvg(raw)
  if (!clean) {
    return (
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(15,35,65,0.05)', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', margin: '10px 0' }}>
        Schéma non disponible
      </div>
    )
  }
  return (
    <div style={{
      margin: '14px 0',
      padding: '16px',
      borderRadius: 'var(--radius-md, 12px)',
      background: '#FFFFFF',
      border: '1.5px solid rgba(108,92,231,0.18)',
      boxShadow: '0 2px 12px rgba(15,35,65,0.07)',
      maxWidth: '100%',
      overflowX: 'auto',
    }}>
      <div dangerouslySetInnerHTML={{ __html: clean }} style={{ lineHeight: 0 }} />
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  content:      string
  isStreaming?: boolean
  className?:   string
}

export default function MarkdownMessage({ content, isStreaming = false, className }: Props) {
  const segs              = splitAtSvg(content)
  const showSvgPending    = isStreaming && hasPendingSvgBlock(content)

  return (
    <div className={className || 'md-render'}>
      {segs.map((seg, i) =>
        seg.type === 'svg' ? (
          <SvgBlock key={i} raw={seg.value} />
        ) : (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
          >
            {seg.value}
          </ReactMarkdown>
        )
      )}

      {/* Indicateur pendant le streaming d'un bloc SVG incomplet */}
      {showSvgPending && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'var(--text-muted)',
          marginTop: 8, padding: '6px 12px',
          borderRadius: 8,
          background: 'rgba(108,92,231,0.06)',
          border: '1px solid rgba(108,92,231,0.14)',
        }}>
          📐
          <span style={{ fontStyle: 'italic' }}>Génération du schéma...</span>
          <span className="prep-dot" />
        </div>
      )}
    </div>
  )
}
