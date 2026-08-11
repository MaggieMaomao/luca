// @luca-game/platform — LocalCompletionClient.
//
// The default CompletionClient implementation that trusts the client.
// Suitable for single-player local-only apps and for development.
//
// For production, replace with HttpCompletionClient (see example) or
// your own implementation that POSTs to your backend's /api/luca/v1/*
// endpoints.

import { CompletionError } from './types'
import type {
  CompletionClient,
  CompletionRequest,
  CompletionResponse,
  ResolveRequest,
  ResolveResponse,
} from './types'

export class LocalCompletionClient implements CompletionClient {
  async check<GState, GStats>(
    req: CompletionRequest<GState, GStats>,
  ): Promise<CompletionResponse> {
    if (!req.reportedComplete) {
      return { complete: false }
    }

    // Trust the client. Just echo back the stats it sent.
    const stats = (req.finalStats ?? {}) as Record<string, unknown>
    return {
      complete: true,
      record: {
        validMoves: typeof stats.moves === 'number' ? stats.moves : 0,
        score: typeof stats.score === 'number' ? stats.score : 0,
        elapsedSeconds: typeof stats.elapsed === 'number' ? stats.elapsed : 0,
        achievedAt: new Date().toISOString(),
      },
    }
  }

  async resolve<GState, TAction>(
    _req: ResolveRequest<GState>,
  ): Promise<ResolveResponse<TAction>> {
    // No solver — local mode can't solve games.
    throw new CompletionError(
      'LocalCompletionClient cannot resolve games; provide your own implementation',
      'SERVER',
    )
  }
}