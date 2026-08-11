// Engine core — minimal typed event bus (pure).
//
// Games emit string events during step/apply (e.g. 'hit', 'score'); the host
// fans them out to sound + visual-effect subscribers. Fire-and-forget.

export class EventBus<E extends string = string> {
  private listeners = new Set<(e: E) => void>()

  emit(e: E): void {
    for (const l of this.listeners) l(e)
  }

  /** Subscribe; returns an unsubscribe fn. */
  on(cb: (e: E) => void): () => void {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }

  clear(): void {
    this.listeners.clear()
  }
}
