// @luca-game/platform — CompletionProvider.
//
// React context that injects a CompletionClient into the tree.
// The engine's useCompletionOnWin hook reads from this context.
//
// Usage:
//   <CompletionProvider client={httpClient}>
//     <Gallery />
//     <PlayPage />
//   </CompletionProvider>

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { GameLifecycleProvider, type GameCompletionInfo } from '@luca-game/engine'
import { LocalCompletionClient } from './LocalCompletionClient'
import type { CompletionClient } from './types'

const CompletionContext = createContext<CompletionClient>(
  new LocalCompletionClient(),
)

export interface CompletionProviderProps {
  client?: CompletionClient
  children: ReactNode
}

export function CompletionProvider({
  client,
  children,
}: CompletionProviderProps) {
  // Resolve the client once (a new LocalCompletionClient per render would
  // be wasteful and would change identity each time).
  const resolved = useMemo(
    () => client ?? new LocalCompletionClient(),
    [client],
  )

  // Bridge the engine's lifecycle event to the completion client. Fires
  // only on a win; failures are swallowed (logged) so a flaky/offline
  // backend can never degrade gameplay. This is the seam that makes
  // server-side validation actually happen — every <GameEngine> in the
  // subtree reports its win here.
  const onComplete = useCallback(
    (info: GameCompletionInfo) => {
      if (info.status !== 'won') return
      void resolved
        .check({
          gameId: info.slug,
          difficulty: info.difficulty,
          state: info.state,
          finalStats: info.stats,
          reportedComplete: info.reportedComplete,
        })
        .catch((err) => {
          // Non-fatal: the local game already recorded the win.
          console.warn('[luca] completion check failed:', err)
        })
    },
    [resolved],
  )

  return (
    <CompletionContext.Provider value={resolved}>
      <GameLifecycleProvider onComplete={onComplete}>
        {children}
      </GameLifecycleProvider>
    </CompletionContext.Provider>
  )
}

export function useCompletion(): CompletionClient {
  return useContext(CompletionContext)
}