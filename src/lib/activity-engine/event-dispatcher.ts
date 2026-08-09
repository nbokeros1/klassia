// ── Activity Engine — Event Dispatcher (ME-15) ────────────────────────────────
//
// Lit le registre et appelle les handlers pour chaque événement reçu du bus.

import type { ActivityEvent } from './event-types'
import type { ActivityRegistry } from './event-registry'

export class EventDispatcher {
  constructor(private registry: ActivityRegistry) {}

  dispatch(event: ActivityEvent): void {
    const handlers = this.registry.getHandlers(event.type)

    for (const handler of handlers) {
      try {
        const result = handler(event)
        if (result instanceof Promise) {
          result.catch(err => {
            console.error('[KLASSIA][ACTIVITY_DISPATCHER][HANDLER_ERROR]', {
              type: event.type,
              err:  String(err),
            })
          })
        }
      } catch (err) {
        console.error('[KLASSIA][ACTIVITY_DISPATCHER][HANDLER_THROW]', {
          type: event.type,
          err:  String(err),
        })
      }
    }
  }
}
