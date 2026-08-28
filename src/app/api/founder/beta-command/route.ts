import { NextResponse } from 'next/server'
import { requireFounderOrAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

type TeacherStatus = 'ACTIVE' | 'AT_RISK' | 'INACTIVE' | 'PENDING' | 'INVITED' | 'BLOCKED'

interface TeacherRow {
  id: string
  display_name: string
  email_hint: string
  status: TeacherStatus
  invitation_statut: string | null
  onboarding: boolean
  class_count: number
  first_value: boolean
  last_signal: string | null
  feedback_count: number
}

interface FunnelStage {
  code: string
  label: string
  count: number
  pct: number
  is_first_value: boolean
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function computeTeacherStatus(params: {
  onboarding: boolean
  class_count: number
  last_signal: string | null
  has_blocked_feedback: boolean
}): TeacherStatus {
  const { onboarding, class_count, last_signal, has_blocked_feedback } = params
  const now = Date.now()
  const lastMs = last_signal ? new Date(last_signal).getTime() : null
  const daysSince = lastMs ? (now - lastMs) / 86400000 : null

  if (has_blocked_feedback && (daysSince === null || daysSince >= 2)) return 'BLOCKED'
  if (!onboarding) return 'PENDING'
  if (onboarding && class_count === 0 && (daysSince === null || daysSince >= 5)) return 'AT_RISK'
  if (daysSince !== null && daysSince >= 14) return 'INACTIVE'
  if (daysSince !== null && daysSince < 7) return 'ACTIVE'
  return 'AT_RISK'
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function startOfWeek(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  const { error, profil } = await requireFounderOrAdmin()
  if (error || !profil) return error ?? NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const db = createAdminClient()

  // ── 1. Beta teachers ──────────────────────────────────────────────────────
  const { data: betaUsers } = await db
    .from('utilisateurs')
    .select('id, prenom, nom, email, onboarding_complete, created_at')
    .eq('role', 'beta')
    .order('created_at', { ascending: true })

  const betaIds = (betaUsers ?? []).map(u => u.id)

  // ── 2. Invitations ────────────────────────────────────────────────────────
  const { data: invitations } = await db
    .from('beta_invitations')
    .select('id, email, statut, created_at, sent_at, activated_at')
    .order('created_at', { ascending: true })

  const totalInvitations    = (invitations ?? []).length
  const invitationsEnvoyees = (invitations ?? []).filter(i => ['envoyee', 'acceptee'].includes(i.statut)).length
  const invitationsAcceptees= (invitations ?? []).filter(i => i.statut === 'acceptee').length

  // ── 3. Classes per beta teacher ───────────────────────────────────────────
  const { data: classes } = betaIds.length
    ? await db.from('classes').select('id, enseignant_id, created_at').in('enseignant_id', betaIds)
    : { data: [] }

  const classCountByUser: Record<string, number> = {}
  for (const c of (classes ?? [])) {
    classCountByUser[c.enseignant_id] = (classCountByUser[c.enseignant_id] ?? 0) + 1
  }

  // ── 4. Teaching packs (first value) ──────────────────────────────────────
  const { data: packs } = betaIds.length
    ? await db.from('teaching_packs').select('id, enseignant_id, statut, updated_at').in('enseignant_id', betaIds)
    : { data: [] }

  const firstValueByUser: Record<string, boolean> = {}
  const packCountByUser:  Record<string, number>  = {}
  const packDoneByUser:   Record<string, number>  = {}
  for (const p of (packs ?? [])) {
    packCountByUser[p.enseignant_id] = (packCountByUser[p.enseignant_id] ?? 0) + 1
    if (p.statut === 'pret') {
      firstValueByUser[p.enseignant_id] = true
      packDoneByUser[p.enseignant_id]   = (packDoneByUser[p.enseignant_id] ?? 0) + 1
    }
  }

  // ── 5. Last activity signal (max of generation + teaching events + classes) ─
  const { data: iaGens } = betaIds.length
    ? await db.from('generations_ia').select('enseignant_id, created_at').in('enseignant_id', betaIds).order('created_at', { ascending: false })
    : { data: [] }

  const lastSignalByUser: Record<string, string> = {}
  const updateSignal = (userId: string, ts: string) => {
    if (!lastSignalByUser[userId] || ts > lastSignalByUser[userId]) {
      lastSignalByUser[userId] = ts
    }
  }

  for (const g of (iaGens ?? [])) updateSignal(g.enseignant_id, g.created_at)
  for (const c of (classes ?? [])) updateSignal(c.enseignant_id, c.created_at)

  // ── 6. Feedback ───────────────────────────────────────────────────────────
  const { data: feedbacks } = betaIds.length
    ? await db
        .from('beta_feedback')
        .select('id, utilisateur_id, type, titre, page_url, statut, created_at')
        .in('utilisateur_id', betaIds)
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] }

  const feedbackCountByUser: Record<string, number> = {}
  const blockedFeedbackUsers = new Set<string>()
  for (const f of (feedbacks ?? [])) {
    if (!f.utilisateur_id) continue
    feedbackCountByUser[f.utilisateur_id] = (feedbackCountByUser[f.utilisateur_id] ?? 0) + 1
    if (f.type === 'blocked' && f.statut !== 'resolu' && f.statut !== 'ferme') {
      blockedFeedbackUsers.add(f.utilisateur_id)
    }
  }

  // ── 7. Beta logs (errors 7d) ──────────────────────────────────────────────
  const { data: errorLogs } = await db
    .from('beta_logs')
    .select('id, tag, message, page_url, utilisateur_id, created_at')
    .eq('level', 'error')
    .gte('created_at', daysAgo(7))
    .order('created_at', { ascending: false })
    .limit(200)

  // Group errors by message prefix (first 60 chars) for deduplication
  const errorGroups: Record<string, { message: string; count: number; users: Set<string>; last_seen: string; routes: Set<string> }> = {}
  for (const log of (errorLogs ?? [])) {
    const key = log.message.substring(0, 60)
    if (!errorGroups[key]) {
      errorGroups[key] = { message: log.message, count: 0, users: new Set(), last_seen: log.created_at, routes: new Set() }
    }
    errorGroups[key].count++
    if (log.utilisateur_id) errorGroups[key].users.add(log.utilisateur_id)
    if (log.page_url) errorGroups[key].routes.add(log.page_url)
    if (log.created_at > errorGroups[key].last_seen) errorGroups[key].last_seen = log.created_at
  }

  const topErrors = Object.entries(errorGroups)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([, g]) => ({
      message: g.message.substring(0, 120),
      count: g.count,
      affected_users: g.users.size,
      last_seen: g.last_seen,
      routes: Array.from(g.routes).slice(0, 3),
    }))

  // Error trend (last 7 days)
  const errorTrend: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    errorTrend[d.toISOString().substring(0, 10)] = 0
  }
  for (const log of (errorLogs ?? [])) {
    const day = log.created_at.substring(0, 10)
    if (day in errorTrend) errorTrend[day]++
  }

  // ── 8. Feature usage ──────────────────────────────────────────────────────
  const { data: iaGensByType } = betaIds.length
    ? await db.from('generations_ia').select('type_generation, enseignant_id').in('enseignant_id', betaIds)
    : { data: [] }

  const iaByType: Record<string, number> = {}
  for (const g of (iaGensByType ?? [])) {
    const t = g.type_generation ?? 'autre'
    iaByType[t] = (iaByType[t] ?? 0) + 1
  }

  // ── 9. Weekly summary (current week) ─────────────────────────────────────
  const weekStart = startOfWeek()

  const { data: newUsersWeek } = await db
    .from('utilisateurs')
    .select('id')
    .eq('role', 'beta')
    .gte('created_at', weekStart)

  const { data: onboardedWeek } = await db
    .from('utilisateurs')
    .select('id')
    .eq('role', 'beta')
    .eq('onboarding_complete', true)
    .gte('updated_at', weekStart)

  const { data: iaGenWeek } = betaIds.length
    ? await db.from('generations_ia').select('id').in('enseignant_id', betaIds).gte('created_at', weekStart)
    : { data: [] }

  const { data: feedbackUnread } = await db
    .from('beta_feedback')
    .select('id, type')
    .eq('statut', 'nouveau')

  const { data: errorsWeek } = await db
    .from('beta_logs')
    .select('message')
    .eq('level', 'error')
    .gte('created_at', weekStart)

  const uniqueErrorsWeek = new Set((errorsWeek ?? []).map(e => e.message.substring(0, 60))).size

  // ── 10. Build teacher rows ────────────────────────────────────────────────
  const invitationByEmail: Record<string, string> = {}
  for (const inv of (invitations ?? [])) invitationByEmail[inv.email.toLowerCase()] = inv.statut

  const teachers: TeacherRow[] = (betaUsers ?? []).map(u => {
    const first = u.prenom ?? ''
    const lastInitial = u.nom ? u.nom.charAt(0).toUpperCase() + '.' : ''
    const display_name = [first, lastInitial].filter(Boolean).join(' ') || 'Enseignant'
    const email_hint = u.email ? `${u.email.substring(0, 3)}***@${u.email.split('@')[1] ?? '…'}` : ''

    const status = computeTeacherStatus({
      onboarding: !!u.onboarding_complete,
      class_count: classCountByUser[u.id] ?? 0,
      last_signal: lastSignalByUser[u.id] ?? null,
      has_blocked_feedback: blockedFeedbackUsers.has(u.id),
    })

    return {
      id: u.id,
      display_name,
      email_hint,
      status,
      invitation_statut: invitationByEmail[u.email?.toLowerCase() ?? ''] ?? null,
      onboarding: !!u.onboarding_complete,
      class_count: classCountByUser[u.id] ?? 0,
      first_value: !!firstValueByUser[u.id],
      last_signal: lastSignalByUser[u.id] ?? null,
      feedback_count: feedbackCountByUser[u.id] ?? 0,
    }
  })

  // Sort: BLOCKED first, then AT_RISK, then by last signal ascending
  const statusOrder: Record<TeacherStatus, number> = {
    BLOCKED: 0, AT_RISK: 1, INACTIVE: 2, PENDING: 3, INVITED: 4, ACTIVE: 5,
  }
  teachers.sort((a, b) => {
    const sd = statusOrder[a.status] - statusOrder[b.status]
    if (sd !== 0) return sd
    if (!a.last_signal && !b.last_signal) return 0
    if (!a.last_signal) return -1
    if (!b.last_signal) return 1
    return a.last_signal < b.last_signal ? -1 : 1
  })

  // ── 11. Funnel ────────────────────────────────────────────────────────────
  const totalAccounts       = betaIds.length
  const totalOnboarded      = (betaUsers ?? []).filter(u => u.onboarding_complete).length
  const totalWithClass      = Object.values(classCountByUser).filter(c => c > 0).length
  const totalStartedPack    = Object.keys(packCountByUser).length
  const totalCompletedPack  = Object.values(firstValueByUser).filter(Boolean).length

  const funnelBase = Math.max(totalInvitations, 1)
  const funnel: FunnelStage[] = [
    { code: 'F0', label: 'Invitations créées',    count: totalInvitations,   pct: 100,                                    is_first_value: false },
    { code: 'F1', label: 'Invitations envoyées',  count: invitationsEnvoyees,pct: Math.round(invitationsEnvoyees / funnelBase * 100), is_first_value: false },
    { code: 'F2', label: 'Comptes créés',         count: totalAccounts,      pct: Math.round(totalAccounts / funnelBase * 100),       is_first_value: false },
    { code: 'F4', label: 'Onboarding terminé',    count: totalOnboarded,     pct: Math.round(totalOnboarded / funnelBase * 100),      is_first_value: false },
    { code: 'F5', label: 'Classe créée',          count: totalWithClass,     pct: Math.round(totalWithClass / funnelBase * 100),      is_first_value: false },
    { code: 'F7', label: 'Build My Year démarré', count: totalStartedPack,   pct: Math.round(totalStartedPack / funnelBase * 100),    is_first_value: false },
    { code: 'F8', label: 'Build My Year terminé', count: totalCompletedPack, pct: Math.round(totalCompletedPack / funnelBase * 100),  is_first_value: true  },
  ]

  // ── 12. Recent feedback (list — descriptions excluded for privacy) ─────────
  const recentFeedback = (feedbacks ?? []).slice(0, 50).map(f => {
    const teacher = (betaUsers ?? []).find(u => u.id === f.utilisateur_id)
    return {
      id: f.id,
      type: f.type,
      titre: f.titre ?? '(sans titre)',
      page_url: f.page_url ? f.page_url.substring(0, 80) : null,
      statut: f.statut,
      created_at: f.created_at,
      teacher_prenom: teacher?.prenom ?? null,
      teacher_nom:    teacher?.nom    ?? null,
    }
  })

  const feedbackByType: Record<string, number> = {}
  for (const f of (feedbacks ?? [])) {
    feedbackByType[f.type] = (feedbackByType[f.type] ?? 0) + 1
  }

  // ── Build response ────────────────────────────────────────────────────────
  return NextResponse.json({
    overview: {
      invited:    totalInvitations,
      accepted:   invitationsAcceptees,
      accounts:   totalAccounts,
      onboarded:  totalOnboarded,
      with_class: totalWithClass,
      first_value: totalCompletedPack,
    },
    funnel,
    teachers,
    feedback: {
      recent: recentFeedback,
      by_type: feedbackByType,
      unread_count: (feedbackUnread ?? []).length,
      blocking_count: (feedbackUnread ?? []).filter(f => f.type === 'blocked').length,
    },
    errors: {
      top: topErrors,
      trend: errorTrend,
      total_7d: (errorLogs ?? []).length,
    },
    usage: {
      ia_by_type: iaByType,
      packs_started: totalStartedPack,
      packs_completed: totalCompletedPack,
    },
    weekly: {
      new_accounts: (newUsersWeek ?? []).length,
      onboarded: (onboardedWeek ?? []).length,
      ia_generations: (iaGenWeek ?? []).length,
      active_users: teachers.filter(t => t.status === 'ACTIVE').length,
      at_risk: teachers.filter(t => t.status === 'AT_RISK').length,
      inactive: teachers.filter(t => t.status === 'INACTIVE').length,
      blocked: teachers.filter(t => t.status === 'BLOCKED').length,
      feedback_unread: (feedbackUnread ?? []).length,
      feedback_blocking: (feedbackUnread ?? []).filter(f => f.type === 'blocked').length,
      unique_errors_7d: uniqueErrorsWeek,
    },
  })
}
