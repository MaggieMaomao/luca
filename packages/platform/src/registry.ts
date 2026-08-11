// Luca Games metadata — 28 classic games in the native collection.
//
// Each entry powers:
//   - The gallery card on /games/luca (title, icon, description, status)
//   - The "Coming soon" page (full description + suggestion to try a playable game)
//   - The route resolution for /games/luca/:slug
//
// `playable` games have actual game logic (Sessions 2-3). `coming_soon` games
// show a placeholder with the description.
//
// `description` is a 1-2 sentence pitch (generic + localizable). For localizable strings,
// use the i18n key `games.<slug>.name` and `games.<slug>.description`.
//
// Difficulty is subjective — rated by the source's likely complexity.

export type GameStatus = 'playable' | 'coming_soon'
export type GameDifficulty = 'easy' | 'medium' | 'hard'

export interface GameMeta {
  /** URL slug — also used as the i18n key suffix for name/description. */
  slug: string
  /** Short title for the card. Localizable via `games.${slug}.name`. */
  title: string
  /** Single emoji or short glyph for the card icon (no external assets). */
  icon: string
  /** 1-2 sentence pitch. Localizable via `games.${slug}.description`. */
  description: string
  /** Implementation status. */
  status: GameStatus
  difficulty: GameDifficulty
}

// All 28 games in the Luca collection, in gallery order.
// `playable` = 2048, Lights, Sudoku (the 3 showcase games).
// `coming_soon` = the other 25.

export const GAMES: GameMeta[] = [
  // ── Playable showcase (Sessions 2-3) ────────────────────────────────
  {
    slug: '2048',
    title: '2048',
    icon: '🔢',
    description:
      'Combine tiles in this number-matching puzzle to reach the 2048 tile. Slide with arrow keys or swipe on mobile.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'lights',
    title: 'Lights Out',
    icon: '💡',
    description:
      'Toggle the lights to turn them all off. Click a light and its neighbors flip. Deceptively simple, surprisingly deep.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'sudoku',
    title: 'Sudoku',
    icon: '🔲',
    description:
      'Fill the 9×9 grid so every row, column, and 3×3 box contains the digits 1-9 exactly once. Three difficulty levels.',
    status: 'playable',
    difficulty: 'hard',
  },

  // ── Coming soon (25 games) ─────────────────────────────────────────
  {
    slug: 'bomb_defuser',
    title: 'Bomb Defuser',
    icon: '💣',
    description:
      'Defuse the bomb before time runs out. Read cryptic clues and cut the right wire — alone or with a partner giving instructions.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'calcrostic',
    title: 'Calcrostic',
    icon: '✖',
    description:
      'A daily math cross-number puzzle. Each row and column forms a true equation. Number to find the missing digits.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'chess',
    title: 'Chess',
    icon: '♟',
    description:
      'The classic strategy game. Play against a friend locally, or test yourself against the built-in engine.',
    status: 'playable',
    difficulty: 'hard',
  },
  {
    slug: 'chomp',
    title: 'Chomp',
    icon: '🍫',
    description:
      'A poison-chocolate game. Take a bite, your opponent takes a bite. Whoever takes the poisoned corner loses.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'dots',
    title: 'Dots',
    icon: '🔵',
    description:
      'Connect dots to form boxes. Each box you complete scores a point. Strategic territory control in 60 seconds.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'floodfill',
    title: 'Floodfill',
    icon: '🟦',
    description:
      'Flood the board with one color at a time. Minimize the number of moves to fill the entire grid.',
    status: 'playable',
    difficulty: 'easy',
  },
  {
    slug: 'fruit_salad',
    title: 'Fruit Salad',
    icon: '🍓',
    description:
      'Match the fruits. A fast, family-friendly card-matching game with a little strategy mixed in.',
    status: 'playable',
    difficulty: 'easy',
  },
  {
    slug: 'geometree',
    title: 'GeomeTree',
    icon: '🌳',
    description:
      'Grow a tree of geometric shapes. Each branch follows a rule, and the tree scores based on how well the rule is followed.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'hackenbush',
    title: 'Hackenbush',
    icon: '🌲',
    description:
      'Cut branches from a tree. Whoever makes the last cut wins. A combinatorial game with surprising strategy depth.',
    status: 'playable',
    difficulty: 'hard',
  },
  {
    slug: 'ichomp',
    title: 'iChomp',
    icon: '🍫',
    description:
      'Chomp\'s iOS cousin. A solo strategy variant with extra rules and escalating difficulty.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'induction',
    title: 'Induction',
    icon: '🧲',
    description:
      'A logic puzzle about magnetic fields. Place the magnets to satisfy the constraints without breaking the field.',
    status: 'playable',
    difficulty: 'hard',
  },
  {
    slug: 'knot_colouring',
    title: 'Knot Colouring',
    icon: '🪢',
    description:
      'Colour the strands of a knot to show that two diagrams are equivalent. A hands-on intro to knot theory.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'magic_square',
    title: 'Magic Square',
    icon: '🔮',
    description:
      'Fill the grid so every row, column, and diagonal sums to the same magic number. Find the pattern.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'mastermind',
    title: 'Mastermind',
    icon: '🧠',
    description:
      'Crack the code. Logical deduction against the computer\'s hidden color sequence in as few guesses as possible.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'mazes',
    title: 'Mazes',
    icon: '🌀',
    description:
      'A new maze every day. Navigate from start to finish. Traps, portals, and multi-level paths.',
    status: 'playable',
    difficulty: 'easy',
  },
  {
    slug: 'nim',
    title: 'Nim',
    icon: '🪨',
    description:
      'The classic strategy game. Take turns removing stones. The player who takes the last stone wins.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'packing',
    title: 'Packing',
    icon: '📦',
    description:
      'Pack the boxes. A 2D bin-packing puzzle. Decide what goes in each box to fit the most while staying organized.',
    status: 'playable',
    difficulty: 'hard',
  },
  {
    slug: 'skyscrapers',
    title: 'Skyscrapers',
    icon: '🏙',
    description:
      'Place skyscrapers of different heights in the grid so the row and column clues match. A skyline from every angle.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'sliding_blocks',
    title: 'Sliding Blocks',
    icon: '⬜',
    description:
      'Slide the numbered tiles to arrange them in order. Tap a tile next to the empty space to slide it there. 3×3, 4×4, or 5×5 grid.',
    status: 'playable',
    difficulty: 'easy',
  },
  {
    slug: 'sokoban',
    title: 'Sokoban',
    icon: '📦',
    description:
      'Push the boxes onto the targets. The classic warehouse keeper puzzle. Logic, not reflexes.',
    status: 'playable',
    difficulty: 'hard',
  },
  {
    slug: 'spider_web',
    title: 'Spider Web',
    icon: '🕸',
    description:
      'A web-building puzzle. Connect the threads without crossing them, or build the strongest web you can.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'tangram',
    title: 'Tangram',
    icon: '🔷',
    description:
      'Seven pieces, infinite shapes. Use the tangram to match the silhouette. Spatial reasoning at its purest.',
    status: 'playable',
    difficulty: 'easy',
  },
  {
    slug: 'towers_of_hanoi',
    title: 'Towers of Hanoi',
    icon: '🗼',
    description:
      'Move the stack of disks from one peg to another, one at a time, never placing a larger disk on a smaller one.',
    status: 'playable',
    difficulty: 'easy',
  },
  {
    slug: 'turtle_walk',
    title: 'Turtle Walk',
    icon: '🐢',
    description:
      'A Logo-style turtle that follows your commands. Draw shapes, solve mazes, teach the turtle to dance.',
    status: 'playable',
    difficulty: 'medium',
  },
  {
    slug: 'unknotting',
    title: 'Unknotting',
    icon: '🔗',
    description:
      'Untangle the knots. A hands-on puzzle about topology. Move, flip, and rotate the strands until they lie flat.',
    status: 'playable',
    difficulty: 'hard',
  },

  // ── Phase 6 — Real-Time Engine + Basketball (Phase 6 MVP) ─────────
  {
    slug: 'basketball',
    title: 'Basketball',
    icon: '🏀',
    description:
      'Swipe to shoot. Real-time physics with Matter.js. The first real-time game in the luca platform — a vertical slice that drives the new real-time engine.',
    status: 'playable',
    difficulty: 'medium',
  },

  // ── Action engine — renderer-agnostic games (2D canvas + 3D r3f) ──
  {
    slug: 'toss',
    title: 'Toss',
    icon: '🗑️',
    description:
      'Flick the ball into the bin. A quick, one-more-go 2D skill game — angle plus strength decide where it lands. Runs on the action engine (canvas2d).',
    status: 'playable',
    difficulty: 'easy',
  },
  {
    slug: 'hoops',
    title: 'Hoops',
    icon: '🏀',
    description:
      'First-person 3D basketball. Line up, flick to shoot, and watch the ball arc to the rim with real photo-frame hands. Runs on the action engine (3D / react-three-fiber).',
    status: 'playable',
    difficulty: 'medium',
  },
]

/** Look up a game by slug. Returns undefined if not found. */
export function getGame(slug: string): GameMeta | undefined {
  return GAMES.find(g => g.slug === slug)
}

/** Look up a game by URL slug with case-insensitive + underscore-insensitive
 * matching. Some legacy URLs use snake_case ("sliding_Blocks") but our app
 * uses kebab-case in routes. So `/games/luca/sliding-blocks` and
 * `/games/luca/sliding_blocks` should both resolve. */
export function getGameFuzzy(slug: string): GameMeta | undefined {
  const normalized = slug.toLowerCase().replace(/-/g, '_')
  return GAMES.find(g => g.slug.toLowerCase() === normalized)
}

/** Convenience: just the playable games (used by the ComingSoon page). */
export const PLAYABLE_GAMES: GameMeta[] = GAMES.filter(g => g.status === 'playable')
