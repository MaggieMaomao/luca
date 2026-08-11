import { lazy, Suspense, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getGameFuzzy, getGame, PLAYABLE_GAMES } from './registry'
import ComingSoon from './ComingSoon'
import './css/play.css'

/**
 * PlayPage — /games/luca/:slug
 *
 * Routes the requested game slug to its React component. The actual
 * game components live in `@luca-game/platform/games/<slug>` and
 * are statically imported below for the original 3 games (and the
 * bulk-shipped ones). For future games added to the games/ barrel,
 * they auto-route via the dynamic import fallback.
 */

// Original Session 2-3 games — eagerly imported
import Game2048 from './games/games2048/Game2048'
import LightsOut from './games/lights/LightsOut'
import Sudoku from './games/sudoku/Sudoku'

// Phase 6 — first 3 games with real UIs
import TowersOfHanoi from './games/towers_of_hanoi/TowersOfHanoi'
import SlidingBlocks from './games/sliding_blocks/SlidingBlocks'
import Tangram from './games/tangram/Tangram'
import BombDefuser from './games/bomb_defuser/BombDefuser'
import Nim from './games/nim/Nim'
import Induction from './games/induction/Induction'
import MagicSquare from './games/magic_square/MagicSquare'
import TurtleWalk from './games/turtle_walk/TurtleWalk'
import Ichomp from './games/ichomp/Ichomp'
import Mastermind from './games/mastermind/Mastermind'
import Skyscrapers from './games/skyscrapers/Skyscrapers'
import FruitSalad from './games/fruit_salad/FruitSalad'
import SpiderWeb from './games/spider_web/SpiderWeb'
import Floodfill from './games/floodfill/Floodfill'
import Dots from './games/dots/Dots'
import GeomeTree from './games/geometree/GeomeTree'
import Mazes from './games/mazes/Mazes'
import Sokoban from './games/sokoban/Sokoban'
import Hackenbush from './games/hackenbush/Hackenbush'
import KnotColouring from './games/knot_colouring/KnotColouring'
import Unknotting from './games/unknotting/Unknotting'
import Chess from './games/chess/Chess'
import Chomp from './games/chomp/Chomp'
import Calcrostic from './games/calcrostic/Calcrostic'
import Packing from './games/packing/Packing'

// Phase 6 — Real-time game (basketball vertical slice)
import BasketballGame from './games/basketball/BasketballGame'

// Action engine — renderer-agnostic games. Hoops is 3D (three.js), so it's
// LAZY-loaded — three lands only in the hoops async chunk, never in any chunk
// that eagerly imports the platform barrel (e.g. via CompletionProvider).
import TossGame from './games/toss/TossGame'
const HoopsGame = lazy(() => import('./games/hoops/HoopsGame'))

/** Map slug → component. All currently-shipped games. */
const EAGER_GAMES: Record<string, React.ComponentType> = {
  '2048': Game2048,
  'lights': LightsOut,
  'sudoku': Sudoku,
  'towers_of_hanoi': TowersOfHanoi,
  'sliding_blocks':  SlidingBlocks,
  'tangram':         Tangram,
  'bomb_defuser':    BombDefuser,
  'nim':             Nim,
  'induction':       Induction,
  'magic_square':    MagicSquare,
  'turtle_walk':     TurtleWalk,
  'ichomp':          Ichomp,
  'mastermind':      Mastermind,
  'skyscrapers':     Skyscrapers,
  'fruit_salad':     FruitSalad,
  'spider_web':      SpiderWeb,
  'floodfill':       Floodfill,
  'dots':            Dots,
  'geometree':       GeomeTree,
  'mazes':           Mazes,
  'sokoban':         Sokoban,
  'hackenbush':      Hackenbush,
  'knot_colouring':  KnotColouring,
  'unknotting':      Unknotting,
  'chess':           Chess,
  'chomp':           Chomp,
  'calcrostic':      Calcrostic,
  'packing':         Packing,
  'basketball':      BasketballGame,
  'toss':            TossGame,
  'hoops':           HoopsGame,
}

export default function PlayPage() {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const game = slug ? (getGameFuzzy(slug) ?? getGame(slug)) : undefined

  useEffect(() => {
    if (game) {
      document.title = t(
        `games.${game.slug}.name`,
        game.title,
      ) + ' — ' + t('games.luca.doc_title', 'Luca Games')
    }
  }, [game, t])

  let inner: React.ReactNode
  if (!game || game.status === 'coming_soon') {
    inner = <ComingSoon />
  } else if (EAGER_GAMES[game.slug]) {
    const Comp = EAGER_GAMES[game.slug]
    inner = <Comp />
  } else {
    inner = <DynamicGameLoader slug={game.slug} />
  }

  return <PlayShell game={game}>{inner}</PlayShell>
}

/** Wraps every game with a top bar that links back to the Luca gallery and
 *  names the current game. Keeps routing concerns in the platform layer
 *  (the engine stays routing-agnostic). */
function PlayShell({
  game,
  children,
}: {
  game: ReturnType<typeof getGame>
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const title = game ? t(`games.${game.slug}.name`, { defaultValue: game.title }) : ''
  return (
    <div className="luca-play">
      <div className="luca-play-bar">
        <Link to="/games/luca" className="luca-play-back">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2 L4 7 L9 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('games.luca.all_games', { defaultValue: 'All games' })}
        </Link>
        {game && (
          <span className="luca-play-title">
            <span className="luca-play-title-icon" aria-hidden="true">{game.icon}</span>
            {title}
          </span>
        )}
      </div>
      <Suspense fallback={<div className="luca-play-loading" />}>{children}</Suspense>
    </div>
  )
}

function DynamicGameLoader({ slug }: { slug: string }) {
  // The actual game components are imported statically above. If a
  // game is in the registry but not in the EAGER_GAMES map, we show
  // the placeholder.
  return <DynamicGame slug={slug} />
}

function DynamicGame({ slug }: { slug: string }) {
  const Comp = EAGER_GAMES[slug]
  if (!Comp) {
    return <ComingSoon />
  }
  return <Comp />
}
