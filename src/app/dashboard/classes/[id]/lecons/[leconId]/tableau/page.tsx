'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useSearchParams, useRouter } from 'next/navigation'

type DrawEvent =
  | { type: 'begin'; x: number; y: number; color: string; size: number }
  | { type: 'point'; x: number; y: number }
  | { type: 'end' }
  | { type: 'clear' }

const COLORS = ['#FFFFFF', '#F87171', '#FBC34A', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#1a1a1a']
const BG = '#050510'

function TableauPageInner() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const channelRef = useRef<any>(null)
  const drawStateRef = useRef({ color: '#FFFFFF', size: 4 })
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)
  const isDrawingRef = useRef(false)

  const [color, setColor] = useState('#FFFFFF')
  const [brushSize, setBrushSize] = useState(4)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [copied, setCopied] = useState(false)
  const [isTbi, setIsTbi] = useState(false)

  const supabase = createClient()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const classeId = params.id as string
  const leconId = params.leconId as string

  useEffect(() => {
    setIsTbi(searchParams.get('mode') === 'tbi')
  }, [searchParams])

  // Initialize canvas background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fill = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      ctx.fillStyle = BG
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    fill()

    const obs = new ResizeObserver(fill)
    obs.observe(canvas)
    return () => obs.disconnect()
  }, [])

  // Supabase Realtime — subscribe to drawing events
  useEffect(() => {
    const channel = supabase.channel(`tableau-${leconId}`)
    channelRef.current = channel

    const ctx = canvasRef.current?.getContext('2d')
    let remoteColor = '#FFFFFF'
    let remoteSize = 4

    channel
      .on('broadcast', { event: 'draw' }, ({ payload }: { payload: DrawEvent }) => {
        if (!ctx || !canvasRef.current) return
        const w = canvasRef.current.width
        const h = canvasRef.current.height

        if (payload.type === 'begin') {
          remoteColor = payload.color
          remoteSize = payload.size
          ctx.beginPath()
          ctx.strokeStyle = remoteColor
          ctx.lineWidth = remoteSize
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.moveTo(payload.x * w, payload.y * h)
        } else if (payload.type === 'point') {
          const px = payload.x * w
          const py = payload.y * h
          ctx.lineTo(px, py)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(px, py)
        } else if (payload.type === 'end') {
          ctx.closePath()
        } else if (payload.type === 'clear') {
          ctx.fillStyle = BG
          ctx.fillRect(0, 0, w, h)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [leconId])

  const getRelPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / canvas.width,
      y: (e.clientY - rect.top) / canvas.height,
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isTbi) return
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawingRef.current = true

    const { x, y } = getRelPos(e)
    const activeColor = tool === 'eraser' ? BG : color
    const activeSize = tool === 'eraser' ? brushSize * 5 : brushSize
    drawStateRef.current = { color: activeColor, size: activeSize }

    const ctx = canvasRef.current?.getContext('2d')
    const canvas = canvasRef.current
    if (ctx && canvas) {
      ctx.beginPath()
      ctx.strokeStyle = activeColor
      ctx.lineWidth = activeSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(x * canvas.width, y * canvas.height)
      lastPtRef.current = { x: x * canvas.width, y: y * canvas.height }
    }

    channelRef.current?.send({ type: 'broadcast', event: 'draw', payload: { type: 'begin', x, y, color: activeColor, size: activeSize } })
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isTbi) return
    const { x, y } = getRelPos(e)

    const ctx = canvasRef.current?.getContext('2d')
    const canvas = canvasRef.current
    if (ctx && canvas) {
      const px = x * canvas.width
      const py = y * canvas.height
      ctx.lineTo(px, py)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(px, py)
      lastPtRef.current = { x: px, y: py }
    }

    channelRef.current?.send({ type: 'broadcast', event: 'draw', payload: { type: 'point', x, y } })
  }

  const onPointerUp = () => {
    if (isTbi) return
    isDrawingRef.current = false
    channelRef.current?.send({ type: 'broadcast', event: 'draw', payload: { type: 'end' } })
  }

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d')
    const canvas = canvasRef.current
    if (ctx && canvas) {
      ctx.fillStyle = BG
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    channelRef.current?.send({ type: 'broadcast', event: 'draw', payload: { type: 'clear' } })
  }

  const tbiUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard/classes/${classeId}/lecons/${leconId}/tableau?mode=tbi`
    : ''

  return (
    <div style={{ width: '100vw', height: '100vh', background: BG, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui', overflow: 'hidden', touchAction: 'none' }}>

      {/* Toolbar — hidden on TBI display */}
      {!isTbi && (
        <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', flexShrink: 0, flexWrap: 'wrap' as const }}>

          {/* Back */}
          <button
            onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconId}`)}
            style={{ padding: '5px 11px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '7px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer' }}
          >← Retour</button>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)' }} />

          {/* Tools */}
          {(['pen', 'eraser'] as const).map(t => (
            <button key={t} onClick={() => setTool(t)} style={{
              padding: '5px 11px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              background: tool === t ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${tool === t ? '#A78BFA' : 'rgba(255,255,255,0.08)'}`,
              color: tool === t ? '#A78BFA' : 'rgba(255,255,255,0.65)',
            }}>{t === 'pen' ? '✏️ Stylet' : '⬜ Gomme'}</button>
          ))}

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)' }} />

          {/* Color palette */}
          {COLORS.map(c => (
            <button key={c} onClick={() => { setColor(c); setTool('pen') }} style={{
              width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0,
              border: `2.5px solid ${color === c && tool === 'pen' ? 'white' : 'transparent'}`,
              outline: c === '#050510' || c === '#1a1a1a' ? '1px solid rgba(255,255,255,0.2)' : 'none',
            }} />
          ))}

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)' }} />

          {/* Brush size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Taille</span>
            <input type="range" min={2} max={24} value={brushSize}
              onChange={e => setBrushSize(parseInt(e.target.value))}
              style={{ width: '70px', accentColor: '#A78BFA' }}
            />
            <div style={{ width: brushSize + 2, height: brushSize + 2, borderRadius: '50%', background: color, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
          </div>

          <div style={{ flex: 1 }} />

          {/* Clear */}
          <button onClick={clearCanvas} style={{ padding: '5px 11px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '7px', color: '#F87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            🗑 Effacer
          </button>

          {/* Copy TBI URL */}
          <button
            onClick={() => { navigator.clipboard.writeText(tbiUrl); setCopied(true); setTimeout(() => setCopied(false), 2500) }}
            style={{ padding: '5px 11px', background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(107,63,160,0.25)', border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : 'rgba(107,63,160,0.5)'}`, borderRadius: '7px', color: copied ? '#34D399' : '#A78BFA', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >{copied ? '✓ Lien copié !' : '📋 Lien TBI'}</button>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          flex: 1, display: 'block', width: '100%',
          cursor: isTbi ? 'none' : (tool === 'eraser' ? 'cell' : 'crosshair'),
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    </div>
  )
}

export default function TableauPage() {
  return (
    <Suspense>
      <TableauPageInner />
    </Suspense>
  )
}