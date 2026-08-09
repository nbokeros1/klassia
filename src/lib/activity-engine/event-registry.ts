// ── Activity Engine — Event Registry (ME-15) ──────────────────────────────────
//
// Registre des handlers de domaine. Utilisé par EventDispatcher.

import type { ActivityType, ActivityEvent } from './event-types'

export type RegistryHandler = (event: ActivityEvent) => void | Promise<void>

type RegistryKey = ActivityType | '*'

export class ActivityRegistry {
  private handlers = new Map<RegistryKey, Set<RegistryHandler>>()

  register(type: RegistryKey, handler: RegistryHandler): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler)
  }

  unregister(type: RegistryKey, handler: RegistryHandler): void {
    this.handlers.get(type)?.delete(handler)
  }

  getHandlers(type: ActivityType): RegistryHandler[] {
    const typeSet     = this.handlers.get(type) ?? new Set<RegistryHandler>()
    const wildcardSet = this.handlers.get('*')  ?? new Set<RegistryHandler>()
    return [...typeSet, ...wildcardSet]
  }

  registeredTypes(): (ActivityType | '*')[] {
    return [...this.handlers.keys()]
  }

  clear(): void {
    this.handlers.clear()
  }
}
