// ── Activity Engine — Event Bus (ME-15) ───────────────────────────────────────
//
// Bus synchrone O(1). Les handlers async sont fire-and-forget.

import type { ActivityType, ActivityEvent } from './event-types'

export type ActivityEventHandler = (event: ActivityEvent) => void | Promise<void>

type SubscriptionKey = ActivityType | '*'

export class ActivityBus {
  private subscribers = new Map<SubscriptionKey, Set<ActivityEventHandler>>()

  // ── publish — O(1) dispatch synchrone ──────────────────────────────────────

  publish(event: ActivityEvent): void {
    const typeSet     = this.subscribers.get(event.type) ?? new Set<ActivityEventHandler>()
    const wildcardSet = this.subscribers.get('*')        ?? new Set<ActivityEventHandler>()

    for (const handler of [...typeSet, ...wildcardSet]) {
      try {
        const result = handler(event)
        if (result instanceof Promise) {
          result.catch(err => {
            console.error('[KLASSIA][ACTIVITY_BUS][HANDLER_ERROR]', {
              type: event.type,
              err:  String(err),
            })
          })
        }
      } catch (err) {
        console.error('[KLASSIA][ACTIVITY_BUS][HANDLER_THROW]', {
          type: event.type,
          err:  String(err),
        })
      }
    }
  }

  // ── subscribe — retourne un unsubscriber ───────────────────────────────────

  subscribe(type: SubscriptionKey, handler: ActivityEventHandler): () => void {
    if (!this.subscribers.has(type)) this.subscribers.set(type, new Set())
    this.subscribers.get(type)!.add(handler)
    return () => this.unsubscribe(type, handler)
  }

  // ── unsubscribe ────────────────────────────────────────────────────────────

  unsubscribe(type: SubscriptionKey, handler: ActivityEventHandler): void {
    this.subscribers.get(type)?.delete(handler)
  }

  // ── diagnostics ───────────────────────────────────────────────────────────

  subscriberCount(type?: SubscriptionKey): number {
    if (type !== undefined) return this.subscribers.get(type)?.size ?? 0
    let count = 0
    for (const s of this.subscribers.values()) count += s.size
    return count
  }

  clear(): void {
    this.subscribers.clear()
  }
}
