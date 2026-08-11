// @luca-game/platform — completion API public exports.

export type {
  CompletionClient,
  CompletionRequest,
  CompletionResponse,
  ResolveRequest,
  ResolveResponse,
} from './types'
export { CompletionError } from './types'
export { LocalCompletionClient } from './LocalCompletionClient'
export {
  HttpCompletionClient,
  type HttpCompletionClientOptions,
} from './HttpCompletionClient'
export { CompletionProvider, useCompletion } from './CompletionProvider'