// @luca-game/platform — HttpCompletionClient example.
//
// Reference implementation of CompletionClient that POSTs to a
// backend endpoint. Consumers copy this and adapt (auth headers,
// URL prefix, error handling, etc.) for their own backend.
//
// This is a working starting point — the contract is what matters.
// Real apps may want to add retry logic, auth headers, timeout
// handling, or batching.

import { CompletionError } from './types'
import type {
  CompletionClient,
  CompletionRequest,
  CompletionResponse,
  ResolveRequest,
  ResolveResponse,
} from './types'

export interface HttpCompletionClientOptions {
  /** Base URL of the completion API. Defaults to '/api/luca/v1'. */
  baseUrl?: string
  /** Request timeout in ms. Default 10000. */
  timeoutMs?: number
  /** Optional fetch override (for tests / custom transports). */
  fetchImpl?: typeof fetch
  /** Optional additional headers (auth, tracing, etc.). */
  headers?: Record<string, string>
  /**
   * Async hook that returns the current actor_id. Called per request
   * so the value reflects the current session. If null/undefined,
   * the X-Luca-Actor-Id header is omitted (server returns 401).
   * Use this to inject whatever opaque identifier your auth system
   * provides (Keycloak sub, session UUID, etc.).
   */
  getActorId?: () => string | null | undefined | Promise<string | null | undefined>
}

export class HttpCompletionClient implements CompletionClient {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof fetch
  private readonly baseHeaders: Record<string, string>
  private readonly getActorId?: HttpCompletionClientOptions['getActorId']

  constructor(options: HttpCompletionClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '/api/luca/v1'
    this.timeoutMs = options.timeoutMs ?? 10000
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
    this.baseHeaders = options.headers ?? {}
    this.getActorId = options.getActorId
  }

  async check<GState, GStats>(
    req: CompletionRequest<GState, GStats>,
  ): Promise<CompletionResponse> {
    return this.post<CompletionRequest<GState, GStats>, CompletionResponse>(
      '/complete',
      req,
    )
  }

  async resolve<GState, TAction>(
    req: ResolveRequest<GState>,
  ): Promise<ResolveResponse<TAction>> {
    return this.post<ResolveRequest<GState>, ResolveResponse<TAction>>(
      '/resolve',
      req,
    )
  }

  private async post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.baseHeaders,
    }
    // Resolve actor_id fresh on every request (session can change).
    if (this.getActorId) {
      const actorId = await this.getActorId()
      if (actorId) {
        headers['X-Luca-Actor-Id'] = actorId
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const r = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        credentials: 'include',  // include cookies for session auth
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!r.ok) {
        // Try to parse a CompletionResponse-shaped error body
        let errMsg = `HTTP ${r.status} from ${path}`
        try {
          const data = (await r.json()) as unknown
          if (typeof data === 'object' && data !== null && 'detail' in data) {
            errMsg = String((data as { detail: unknown }).detail) || errMsg
          }
        } catch {
          // ignore
        }
        throw new CompletionError(
          errMsg,
          r.status >= 500 ? 'SERVER' : 'INVALID',
          r.status,
        )
      }
      return (await r.json()) as TRes
    } catch (e) {
      if (e instanceof CompletionError) throw e
      if (e instanceof Error && e.name === 'AbortError') {
        throw new CompletionError(`Timeout after ${this.timeoutMs}ms`, 'TIMEOUT')
      }
      throw new CompletionError(
        `Network error: ${e instanceof Error ? e.message : String(e)}`,
        'NETWORK',
      )
    } finally {
      clearTimeout(timer)
    }
  }
}