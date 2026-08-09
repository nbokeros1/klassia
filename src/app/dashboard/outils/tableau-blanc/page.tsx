'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'

const COLORS = ['#0F1B2D', '#F87171', '#FBC34A', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FFFFFF']

export default function TableauBlancPage() {
  const { profil, loading } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawColor, setDrawColor] = useState('#0F1B2D')
  const [lineWidth, setLineWidth] = useState(3)
  const [tool,      setTool]      = useState<'pen' | 'eraser'>('pen')
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    canvas.width  = parent.clientWidth
    canvas.height = parent.clientHeight
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const src  = 'touches' in e ? (e as React.TouchEvent).touches[0] : (e as React.MouseEvent)
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const handleDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    lastPos.current = getPos(e)
  }

  const handleMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : drawColor
    ctx.lineWidth   = tool === 'eraser' ? 24 : lineWidth
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastPos.current = pos
  }, [isDrawing, drawColor, lineWidth, tool])

  const handleUp = () => { setIsDrawing(false); lastPos.current = null }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'tableau-blanc.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  if (loading) return <LoadingScreen />

  const isFr      = (profil as any)?.langue_interface !== 'en'
  const initiales = `${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase() || '?'
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(160deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
      <Sidebar profil={profil} activeHref="/dashboard/outils" onLogout={handleLogout} />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar notifCount={0} initiales={initiales} isFr={isFr} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Barre d'outils */}
          <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid rgba(108,92,231,0.08)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/dashboard/outils')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              ← Retour
            </button>

            <div style={{ width: 1, height: 24, background: 'rgba(108,92,231,0.12)' }} />

            {/* Outils */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ id: 'pen', icon: '✏️', label: 'Crayon' }, { id: 'eraser', icon: '⬜', label: 'Gomme' }].map(t => (
                <button key={t.id} onClick={() => setTool(t.id as 'pen' | 'eraser')} title={t.label}
                  style={{ padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${tool === t.id ? 'var(--violet, #6C5CE7)' : 'rgba(108,92,231,0.12)'}`, background: tool === t.id ? '#EDE9FE' : 'transparent', cursor: 'pointer', fontSize: 15, color: tool === t.id ? 'var(--violet, #6C5CE7)' : 'var(--text-secondary)' }}>
                  {t.icon}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 24, background: 'rgba(108,92,231,0.12)' }} />

            {/* Couleurs */}
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => { setDrawColor(c); setTool('pen') }}
                  style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', border: drawColor === c && tool === 'pen' ? '2.5px solid var(--violet, #6C5CE7)' : '1.5px solid rgba(15,27,45,0.15)', boxSizing: 'border-box', flexShrink: 0 }} />
              ))}
            </div>

            <div style={{ width: 1, height: 24, background: 'rgba(108,92,231,0.12)' }} />

            {/* Épaisseur */}
            <div style={{ display: 'flex', gap: 5 }}>
              {[{ w: 2, label: 'Fin' }, { w: 5, label: 'Moyen' }, { w: 10, label: 'Épais' }].map(b => (
                <button key={b.w} onClick={() => setLineWidth(b.w)} title={b.label}
                  style={{ width: 32, height: 28, borderRadius: 7, border: `1.5px solid ${lineWidth === b.w ? 'var(--violet, #6C5CE7)' : 'rgba(108,92,231,0.12)'}`, background: lineWidth === b.w ? '#EDE9FE' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: b.w, height: b.w, borderRadius: '50%', background: drawColor === '#FFFFFF' ? '#888' : drawColor }} />
                </button>
              ))}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={downloadCanvas} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(108,92,231,0.15)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                💾 Télécharger
              </button>
              <button onClick={clearCanvas} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑️ Effacer
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div ref={containerRef} style={{ flex: 1, position: 'relative', cursor: tool === 'eraser' ? 'cell' : 'crosshair', background: '#FFFFFF' }}>
            <canvas
              ref={canvasRef}
              style={{ display: 'block', width: '100%', height: '100%' }}
              onMouseDown={handleDown}
              onMouseMove={handleMove}
              onMouseUp={handleUp}
              onMouseLeave={handleUp}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
