// Sudoku — game renderer (uses GameEngine).

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameEngine, type GameRenderContext } from '@luca-game/engine'
import type { Difficulty } from './sudoku'
import type { SudokuState, SudokuAction, SudokuStats } from './sudokuDefinition'
import { sudokuDefinition, sudokuConflicts } from './sudokuDefinition'
import './sudoku.css'

const ONBOARD_KEY = 'luca:onboarded:sudoku'

function renderSudoku(
  state: SudokuState,
  ctx: GameRenderContext<SudokuState, SudokuAction, SudokuStats>,
) {
  return <SudokuBoard state={state} ctx={ctx} />
}

const sudokuFullDefinition = {
  ...sudokuDefinition,
  render: renderSudoku,
}

export default function Sudoku() {
  return <GameEngine definition={sudokuFullDefinition} className="sudoku" />
}

function SudokuBoard({
  state, ctx,
}: {
  state: SudokuState
  ctx: GameRenderContext<SudokuState, SudokuAction, SudokuStats>
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'play' | 'check'>('play')
  const conflicts = mode === 'check' ? sudokuConflicts(state) : null

  // Onboarding — only show on first visit
  const [showOnboard, setShowOnboard] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(ONBOARD_KEY) !== '1'
    } catch {
      return true
    }
  })

  const dismissOnboard = () => {
    setShowOnboard(false)
    try {
      window.localStorage.setItem(ONBOARD_KEY, '1')
    } catch {
      // ignore
    }
  }

  // Auto-hide onboard on first user input
  useEffect(() => {
    const hasUserInput = state.board.some((row, r) =>
      row.some((v, c) => v !== 0 && state.puzzle[r][c] === 0),
    )
    if (hasUserInput) setShowOnboard(false)
  }, [state])

  const givens = state.puzzle.map(row =>
    row.map(v => v !== 0)
  )

  const cellClick = (r: number, c: number) => {
    ctx.dispatch({ type: 'SELECT', payload: { r, c } })
  }

  const numClick = (n: number) => {
    if (!state.selected) return
    const [r, c] = state.selected
    if (givens[r][c]) return
    ctx.dispatch({ type: 'INPUT', payload: { r, c, value: n } })
  }

  const eraseClick = () => {
    if (!state.selected) return
    const [r, c] = state.selected
    if (givens[r][c]) return
    ctx.dispatch({ type: 'ERASE', payload: { r, c } })
  }

  const setDifficulty = (d: Difficulty) => {
    ctx.dispatch({ type: 'NEW_GAME', payload: { difficulty: d } })
    setMode('play')
  }

  return (
    <>
      {showOnboard && (
        <div className="sudoku-onboard" role="region" aria-label="How to play Sudoku">
          <div className="sudoku-onboard-icon" aria-hidden="true">?</div>
          <div className="sudoku-onboard-body">
            <h3 className="sudoku-onboard-title">
              {t('games.sudoku.onboard_title', 'How to play Sudoku')}
            </h3>
            <ul className="sudoku-onboard-rules">
              <li>
                {t(
                  'games.sudoku.onboard_rule_1_short',
                  'Givens can\'t be changed',
                )}
              </li>
              <li>
                {t(
                  'games.sudoku.onboard_rule_2_short',
                  'Click or arrow keys + digits',
                )}
              </li>
              <li>
                {t(
                  'games.sudoku.onboard_rule_3_short',
                  'Check highlights conflicts',
                )}
              </li>
            </ul>
          </div>
          <div className="sudoku-onboard-actions">
            <button
              type="button"
              className="cb-btn cb-btn-md cb-btn-primary"
              onClick={dismissOnboard}
            >
              {t('games.sudoku.onboard_got_it', 'Got it — start playing')}
            </button>
          </div>
        </div>
      )}

      <div className="sudoku-difficulty-picker" role="radiogroup" aria-label="Difficulty">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={state.difficulty === d}
            className={`sudoku-diff-chip ${state.difficulty === d ? 'sudoku-diff-chip-on' : ''}`}
            onClick={() => setDifficulty(d)}
          >
            {t(`games.difficulty.${d}`, d)}
          </button>
        ))}
      </div>

      <div className="sudoku-grid" role="application" aria-label="Sudoku grid">
        {state.board.map((row, r) =>
          row.map((value, c) => (
            <Cell
              key={`${r}-${c}`}
              value={value}
              r={r}
              c={c}
              isGiven={givens[r][c]}
              isSelected={state.selected?.[0] === r && state.selected?.[1] === c}
              isConflict={conflicts?.[r][c] ?? false}
              onClick={cellClick}
            />
          )),
        )}
      </div>

      <div className="sudoku-number-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button
            key={n}
            type="button"
            className="sudoku-num"
            onClick={() => numClick(n)}
            disabled={!state.selected || (state.selected && givens[state.selected[0]][state.selected[1]])}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className="sudoku-num sudoku-num-erase"
          onClick={eraseClick}
          disabled={!state.selected || (state.selected && givens[state.selected[0]][state.selected[1]])}
        >
          ⌫
        </button>
      </div>

      <div className="sudoku-actions">
        <button
          type="button"
          className={`cb-btn cb-btn-md ${mode === 'play' ? 'cb-btn-primary' : ''}`}
          onClick={() => setMode(m => m === 'play' ? 'check' : 'play')}
        >
          {mode === 'play'
            ? t('games.sudoku.check', 'Check')
            : t('games.sudoku.resume', 'Resume')}
        </button>
      </div>
    </>
  )
}

function Cell({
  value, r, c, isGiven, isSelected, isConflict, onClick,
}: {
  value: number; r: number; c: number;
  isGiven: boolean; isSelected: boolean; isConflict: boolean;
  onClick: (r: number, c: number) => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null)
  const boxR = Math.floor(r / 3)
  const boxC = Math.floor(c / 3)
  const classes = [
    'sudoku-cell',
    isGiven ? 'sudoku-cell-given' : 'sudoku-cell-user',
    isSelected ? 'sudoku-cell-selected' : '',
    isConflict ? 'sudoku-cell-conflict' : '',
    boxR > 0 ? 'sudoku-cell-box-top' : '',
    boxC > 0 ? 'sudoku-cell-box-left' : '',
    (r === 2 || r === 5) ? 'sudoku-cell-box-bottom' : '',
    (c === 2 || c === 5) ? 'sudoku-cell-box-right' : '',
  ].filter(Boolean).join(' ')

  // Scroll into view when this cell becomes the selected one
  // (triggered by keyboard navigation). Uses 'nearest' so the cell
  // only scrolls if it's already off-screen.
  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [isSelected, r, c])

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      onClick={() => onClick(r, c)}
      aria-label={`Row ${r + 1} column ${c + 1}${value ? `, value ${value}` : ', empty'}`}
    >
      {value > 0 ? value : ''}
    </button>
  )
}