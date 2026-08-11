import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { getGame, getGameFuzzy, PLAYABLE_GAMES } from './registry'
import './css/gallery.css'

/**
 * ComingSoon — the placeholder page shown for all 25 unimplemented games
 * AND the 3 placeholder versions of 2048/Lights/Sudoku while they're
 * still being built (Sessions 2-3).
 *
 * Shows the game's name, a short pitch, and a CTA pointing to the
 * playable games in the meantime.
 */
export default function ComingSoon() {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const game = slug ? (getGameFuzzy(slug) ?? getGame(slug)) : undefined

  if (!game) {
    // Slug not in the catalog at all (e.g. direct URL to a non-existent game).
    return (
      <article className="cs-page">
        <Link to="/games/luca" className="cs-back-link">
          ← {t('games.back_to_luca', 'Back to all games')}
        </Link>
        <div className="cs-card">
          <h1 className="cs-title">{t('games.not_found_title', 'Game not found')}</h1>
          <p className="cs-text">
            {t('games.not_found_text', 'That game is not in our catalog.')}
          </p>
        </div>
      </article>
    )
  }

  const name = t(`games.${game.slug}.name`, game.title)
  const description = t(`games.${game.slug}.description`, game.description)

  return (
    <article className="cs-page">
      <Link to="/games/luca" className="cs-back-link">
        ← {t('games.back_to_luca', 'Back to all games')}
      </Link>

      <header className="cs-hero">
        <div className="cs-hero-icon" aria-hidden="true">{game.icon}</div>
        <div className="cs-hero-text">
          <div className="cs-status-chip">
            {t('games.status_coming_soon', 'Coming soon')}
          </div>
          <h1 className="cs-name">{name}</h1>
          <p className="cs-description">{description}</p>
        </div>
      </header>

      <div className="cs-card">
        <h2 className="cs-card-title">
          {t('games.cs_card_title', 'This game is on its way')}
        </h2>
        <p className="cs-card-text">
          {t(
            'games.cs_card_text',
            "We're building it. In the meantime, try one of the games that's already playable:",
          )}
        </p>
        <ul className="cs-suggestions">
          {PLAYABLE_GAMES.map(g => (
            <li key={g.slug}>
              <Link to={`/games/luca/${g.slug}`} className="cs-suggestion">
                <span className="cs-suggestion-icon" aria-hidden="true">{g.icon}</span>
                <span className="cs-suggestion-name">
                  {t(`games.${g.slug}.name`, g.title)}
                </span>
                <span className="cs-suggestion-arrow" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="cs-actions">
          <Link to="/games/luca" className="cb-btn cb-btn-md cb-btn-secondary">
            {t('games.cs_back_gallery', 'Browse all games')}
          </Link>
        </div>
      </div>

      {/* Credit removed — game is implemented natively. */}
    </article>
  )
}