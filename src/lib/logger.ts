// ─── KlassIA+ — Logger bêta (SC-03K) ─────────────────────────────────────────
// Capture les erreurs client et les envoie à /api/beta/log.
// Niveau debug est local uniquement (pas envoyé au serveur).

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogPayload {
  level:   LogLevel
  tag:     string
  message: string
  data?:   unknown
}

const IS_DEV = process.env.NODE_ENV === 'development'

function send(payload: LogPayload): void {
  if (payload.level === 'debug') return  // debug uniquement en console
  // Fire-and-forget — ne pas bloquer le flux applicatif
  fetch('/api/beta/log', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      ...payload,
      page_url: typeof window !== 'undefined' ? window.location.pathname : undefined,
    }),
  }).catch(() => {})  // silencieux — le logger ne doit jamais crasher l'app
}

function log(level: LogLevel, tag: string, message: string, data?: unknown): void {
  if (IS_DEV || level === 'warn' || level === 'error') {
    const prefix = `[KLASSIA]${tag}`
    if (level === 'error') console.error(prefix, message, data ?? '')
    else if (level === 'warn') console.warn(prefix, message, data ?? '')
    else console.log(prefix, message, data ?? '')
  }
  if (level !== 'debug') {
    send({ level, tag, message, data })
  }
}

export const logger = {
  debug: (tag: string, msg: string, data?: unknown) => log('debug', tag, msg, data),
  info:  (tag: string, msg: string, data?: unknown) => log('info',  tag, msg, data),
  warn:  (tag: string, msg: string, data?: unknown) => log('warn',  tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) => log('error', tag, msg, data),
}

// ─── Capture globale des erreurs non gérées ───────────────────────────────────
// À appeler une seule fois, depuis un Client Component racine.
export function installGlobalErrorCapture(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('error', ev => {
    logger.error('[UNCAUGHT]', ev.message, {
      filename: ev.filename,
      line: ev.lineno,
      col:  ev.colno,
    })
  })

  window.addEventListener('unhandledrejection', ev => {
    const msg = ev.reason instanceof Error ? ev.reason.message : String(ev.reason)
    logger.error('[UNHANDLED_REJECTION]', msg)
  })
}
