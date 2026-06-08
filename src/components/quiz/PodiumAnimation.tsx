'use client'

import { useEffect, useRef, useState } from 'react'

interface PodiumProps {
  top3:       Array<{ pseudo: string; avatar: string; score: number }>
  recompense?: string
  onClose?:   () => void
}

export default function PodiumAnimation({ top3, recompense, onClose }: PodiumProps) {
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const rafRef        = useRef<number>(0)
  const [step, setStep] = useState(0)   // 0=noir → 1=3e → 2=2e → 3=1er+confetti → 4=recompense

  const p1 = top3[0]
  const p2 = top3[1]
  const p3 = top3[2]

  // ── Animation séquentielle ────────────────────────────────────────────────
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 500)
    const t2 = setTimeout(() => setStep(2), 1500)
    const t3 = setTimeout(() => setStep(3), 2500)
    const t4 = setTimeout(() => setStep(4), 4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  // ── Confettis canvas ──────────────────────────────────────────────────────
  useEffect(() => {
    if (step < 3) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const COLORS = ['#A78BFA','#60A5FA','#34D399','#F59E0B','#F87171','#C084FC','#FCD34D']
    type Piece = { x:number; y:number; w:number; h:number; color:string; rot:number; vx:number; vy:number; vr:number; alpha:number }
    const pieces: Piece[] = Array.from({ length: 120 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * -canvas.height * 0.5,
      w:     7 + Math.random() * 9,
      h:     4 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot:   Math.random() * 360,
      vx:    (Math.random() - 0.5) * 3,
      vy:    2.5 + Math.random() * 4,
      vr:    (Math.random() - 0.5) * 5,
      alpha: 1,
    }))

    let elapsed = 0
    const draw = () => {
      elapsed += 16
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        // Fade out after 2.5s
        if (elapsed > 2500) p.alpha = Math.max(0, p.alpha - 0.008)
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
        p.x   += p.vx
        p.y   += p.vy
        p.rot += p.vr
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; p.alpha = 1 }
      })
      if (elapsed < 5000) rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [step])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg, #050D1A 0%, #1A0533 100%)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(80px) scale(0.85); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes glowPulse {
          0%,100% { text-shadow: 0 0 16px #F59E0B80; }
          50%     { text-shadow: 0 0 40px #F59E0B, 0 0 80px #F59E0B60; }
        }
        @keyframes recompenseFade {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1);   }
        }
      `}</style>

      {/* Confetti canvas (par-dessus mais pointer-events:none) */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10 }} />

      <div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: 4, textTransform: 'uppercase' }}>
        🏆 Podium Final
      </div>

      {/* Colonnes podium */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, position: 'relative', zIndex: 11 }}>

        {/* 2e place */}
        {step >= 2 && p2 && (
          <div style={{ textAlign: 'center', animation: 'slideUp 0.7s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div style={{ fontSize: 44 }}>{p2.avatar}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#E2E8F0', marginBottom: 4 }}>{p2.pseudo}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#C0C0C0', marginBottom: 10 }}>{p2.score.toLocaleString()} pts</div>
            <div style={{ width: 120, height: 160, background: 'rgba(192,192,192,0.15)', border: '2px solid #C0C0C0', borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🥈</div>
          </div>
        )}

        {/* 1re place */}
        {step >= 3 && p1 && (
          <div style={{ textAlign: 'center', animation: 'slideUp 0.7s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div style={{ fontSize: 56, animation: 'glowPulse 2s ease-in-out infinite' }}>{p1.avatar}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#F59E0B', marginBottom: 4 }}>{p1.pseudo}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#F59E0B', marginBottom: 10, animation: 'glowPulse 2s ease-in-out infinite' }}>{p1.score.toLocaleString()} pts</div>
            <div style={{ width: 140, height: 200, background: 'rgba(245,158,11,0.2)', border: '2px solid #F59E0B', borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, boxShadow: '0 0 40px rgba(245,158,11,0.3)' }}>🥇</div>
          </div>
        )}

        {/* 3e place */}
        {step >= 1 && p3 && (
          <div style={{ textAlign: 'center', animation: 'slideUp 0.7s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div style={{ fontSize: 36 }}>{p3.avatar}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 4 }}>{p3.pseudo}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#CD7F32', marginBottom: 10 }}>{p3.score.toLocaleString()} pts</div>
            <div style={{ width: 100, height: 120, background: 'rgba(205,127,50,0.15)', border: '2px solid #CD7F32', borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🥉</div>
          </div>
        )}
      </div>

      {/* Récompense physique */}
      {step >= 4 && recompense && (
        <div style={{ padding: '14px 28px', background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.5)', borderRadius: 16, fontSize: 16, fontWeight: 700, color: '#F59E0B', animation: 'recompenseFade 0.5s ease both', position: 'relative', zIndex: 11 }}>
          🎁 Récompense : {recompense}
        </div>
      )}

      {step >= 3 && onClose && (
        <button onClick={onClose}
          style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer', position: 'relative', zIndex: 11 }}>
          Fermer ✕
        </button>
      )}
    </div>
  )
}
