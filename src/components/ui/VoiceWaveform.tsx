'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface VoiceWaveformProps {
  onStop: (transcript: string) => void
}

export default function VoiceWaveform({ onStop }: VoiceWaveformProps) {
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const audioCtxRef    = useRef<AudioContext | null>(null)
  const analyserRef    = useRef<AnalyserNode | null>(null)
  const animFrameRef   = useRef<number>(0)
  const streamRef      = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)

  const [transcript, setTranscript] = useState('')
  const [micError,   setMicError]   = useState(false)

  const drawBars = useCallback(() => {
    const canvas  = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    const ctx  = canvas.getContext('2d')
    if (!ctx) return
    const data = new Uint8Array(analyser.frequencyBinCount)

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(data)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barCount = 28
      const gap      = 3
      const totalGaps = gap * (barCount - 1)
      const barW = (canvas.width - totalGaps) / barCount
      const step  = Math.floor(data.length / barCount)
      const mid   = canvas.height / 2

      for (let i = 0; i < barCount; i++) {
        const value  = data[i * step] || 0
        const height = Math.max(3, (value / 255) * canvas.height * 0.85)
        const x      = i * (barW + gap)
        const grad   = ctx.createLinearGradient(0, mid - height / 2, 0, mid + height / 2)
        grad.addColorStop(0, '#9B8CF0')
        grad.addColorStop(1, '#6C5CE7')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.roundRect(x, mid - height / 2, barW, height, 2)
        ctx.fill()
      }
    }
    draw()
  }, [])

  useEffect(() => {
    let mounted = true

    const startAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream

        const ctx     = new AudioContext()
        audioCtxRef.current = ctx
        const source  = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser
        drawBars()
      } catch {
        if (mounted) setMicError(true)
      }
    }

    const startSpeech = () => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SR) return
      const rec = new SR()
      rec.lang = 'fr-FR'
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (ev: any) => {
        const t = Array.from(ev.results as any[]).map((r: any) => r[0].transcript).join('')
        if (mounted) setTranscript(t)
      }
      rec.onerror = () => { /* ignore */ }
      rec.start()
      recognitionRef.current = rec
    }

    startAudio()
    startSpeech()

    return () => {
      mounted = false
      cancelAnimationFrame(animFrameRef.current)
      audioCtxRef.current?.close()
      streamRef.current?.getTracks().forEach(t => t.stop())
      recognitionRef.current?.stop()
    }
  }, [drawBars])

  const handleStop = () => {
    cancelAnimationFrame(animFrameRef.current)
    audioCtxRef.current?.close()
    streamRef.current?.getTracks().forEach(t => t.stop())
    recognitionRef.current?.stop()
    onStop(transcript)
  }

  if (micError) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, color: '#EF4444' }}>
        Microphone inaccessible. Vérifiez les permissions.
        <button onClick={() => onStop('')} style={{ marginLeft: 10, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <canvas
        ref={canvasRef}
        width={200}
        height={44}
        style={{ borderRadius: 8, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {transcript ? (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            &ldquo;{transcript}&rdquo;
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'prepDots 1.2s ease-in-out infinite' }} />
            ScorgIA vous écoute…
          </div>
        )}
      </div>
      <button
        onClick={handleStop}
        style={{ flexShrink: 0, padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 20, background: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
        ⬛ Terminer
      </button>
    </div>
  )
}
