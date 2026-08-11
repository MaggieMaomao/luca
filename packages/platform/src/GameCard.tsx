import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { GameMeta } from './registry'

interface Props {
  game: GameMeta
}

/**
 * GameCard — the tile shown in the Luca Games gallery.
 * Two variants:
 *   - playable → links to /games/luca/:slug, "Play" CTA visible
 *   - coming_soon → links to /games/luca/:slug, "Coming soon" chip
 *
 * The card always shows the name + icon + description. The "play vs
 * coming soon" distinction is just a small badge + button label.
 */
export default function GameCard({ game }: Props) {
  const { t } = useTranslation()

  const name = t(`games.${game.slug}.name`, game.title)
  const description = t(`games.${game.slug}.description`, game.description)
  const isPlayable = game.status === 'playable'
  const difficultyLabel = t(`games.difficulty.${game.difficulty}`, game.difficulty)

  return (
    <Link
      to={`/games/luca/${game.slug}`}
      className={`gc-card ${isPlayable ? 'gc-card-playable' : 'gc-card-soon'}`}
    >
      <div className="gc-card-icon" aria-hidden="true">
        {game.icon}
      </div>
      <div className="gc-card-body">
        <div className="gc-card-head">
          <h3 className="gc-card-title">{name}</h3>
          {isPlayable ? (
            <span className="gc-card-badge gc-badge-playable">
              {t('games.status_playable', 'Play')}
            </span>
          ) : (
            <span className="gc-card-badge gc-badge-soon">
              {t('games.status_coming_soon', 'Soon')}
            </span>
          )}
        </div>
        <p className="gc-card-desc">{description}</p>
        <div className="gc-card-foot">
          <span className="gc-card-difficulty" title={t('games.difficulty_label', 'Difficulty')}>
            {difficultyLabel}
          </span>
          <span className="gc-card-arrow" aria-hidden="true">→</span>
        </div>
      </div>
    </Link>
  )
}