// @luca-game/platform — completion API contract.
//
// This file defines the wire format for the completion-check and
// resolve-steps endpoints. Both the npm packages and any server-side
// implementation (FastAPI handler, Cloudflare Worker, etc.) reference
// these types to stay in sync.
//
// The contract is generic over the game state shape — callers pass
// the shape they need. The server-side validator for each game
// knows how to interpret the state.

/** What the client sends to validate a game completion. */
export interface CompletionRequest<GState = unknown, GStats = unknown> {
  /** Game identifier. e.g. "2048", "lights", "sudoku". */
  gameId: string
  /** Optional difficulty. e.g. "medium". Validator may use this to
   *  validate against per-difficulty rules (e.g. sudoku requires
   *  exactly N givens for "easy", "medium", "hard"). */
  difficulty?: string
  /** Current game state. The shape is per-game — server-side
   *  validators for each game know how to interpret it. */
  state: GState
  /** Final stats as computed by the client. Server may override
   *  with authoritative values in `record`. */
  finalStats: GStats
  /** Did the client-side engine report the game as complete? */
  reportedComplete: boolean
}

/** What the server returns after validating. */
export interface CompletionResponse {
  /** Whether the server agrees the game is complete. */
  complete: boolean

  /** Server-authoritative final stats. Only present when `complete=true`. */
  record?: {
    /** Server-verified move count. */
    validMoves: number
    /** Server-computed final score. */
    score: number
    /** Total elapsed time in seconds. */
    elapsedSeconds: number
    /** ISO timestamp of completion. */
    achievedAt: string
  }

  /** If the server detected a problem. */
  error?: {
    code: 'INVALID_STATE' | 'CHEAT_DETECTED' | 'NOT_REACHABLE' | 'TIMEOUT'
    message: string
  }
}

/** What the client sends to ask the server for next-move hints. */
export interface ResolveRequest<GState = unknown> {
  gameId: string
  /** Current game state. */
  state: GState
  /** How many steps to look ahead. Default 1 (one next move). */
  maxSteps?: number
}

/** What the server returns with hint steps. */
export interface ResolveResponse<TAction = unknown> {
  /** Suggested next moves. */
  steps: Array<{
    /** The action the client should dispatch. */
    action: TAction
    /** Human-readable explanation: "Place 5 at row 1 col 3". */
    explanation?: string
  }>
  /** True if the server determined the state has no solution. */
  unsolvable?: boolean
  /** Optional partial-help without revealing the full solution. */
  hints?: string[]
}

/** The contract every consumer implements. */
export interface CompletionClient {
  check<GState, GStats>(
    req: CompletionRequest<GState, GStats>,
  ): Promise<CompletionResponse>

  resolve<GState, TAction>(
    req: ResolveRequest<GState>,
  ): Promise<ResolveResponse<TAction>>
}

/** Error type for completion/resolve failures. */
export class CompletionError extends Error {
  constructor(
    message: string,
    public readonly code: 'NETWORK' | 'TIMEOUT' | 'SERVER' | 'INVALID',
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'CompletionError'
  }
}