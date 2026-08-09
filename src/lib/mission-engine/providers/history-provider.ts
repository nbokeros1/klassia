// ── Mission Engine — History Provider ─────────────────────────────────────
//
// Charge l'historique de conversation IA Préparer depuis conversations_ia.
// Retourne les 10 derniers messages de la conversation la plus récente non archivée.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MessageSnapshot } from '../types'

interface HistoryProviderDeps {
  supabase: SupabaseClient
}

interface RawMessage {
  role:       string
  content:    unknown
  timestamp?: string
}

export class HistoryProvider {
  private supabase: SupabaseClient

  constructor({ supabase }: HistoryProviderDeps) {
    this.supabase = supabase
  }

  async loadConversation(
    enseignantId: string,
    classeId:     string,
  ): Promise<MessageSnapshot[]> {
    const { data } = await this.supabase
      .from('conversations_ia')
      .select('messages')
      .eq('enseignant_id', enseignantId)
      .eq('classe_id', classeId)
      .eq('est_archivee', false)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (!data?.length || !data[0].messages) return []

    const messages = (data[0].messages as RawMessage[])

    return messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({
        role:      m.role as 'user' | 'assistant',
        content:   typeof m.content === 'string' ? m.content : String(m.content ?? ''),
        createdAt: m.timestamp ? new Date(m.timestamp) : null,
      }))
  }
}
