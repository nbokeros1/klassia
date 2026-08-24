'use client'

import { useEffect } from 'react'

const SESSION_KEY = 'scorgia_dash_tracked'

// Fires dashboard_entered once per browser session (sessionStorage deduplication)
// Non-blocking — analytics failure never surfaces to user
export default function BetaSessionTracker() {
  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return
    if (sessionStorage.getItem(SESSION_KEY)) return
    sessionStorage.setItem(SESSION_KEY, '1')

    fetch('/api/beta/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'dashboard_entered',
        feature: 'dashboard',
        page_url: window.location.pathname,
      }),
    }).catch(() => {/* swallow */})
  }, [])

  return null
}
