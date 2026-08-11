import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GAMES } from './registry'
import GameCard from './GameCard'
import './css/gallery.css'

type Filter = 'all' | 'playable' | 'coming_soon'

/**
 * LucaGamesPage — /games/luca
 *
 * Gallery of all 28 games in the Luca collection. Each card links to
 * /games/luca/<slug> which either mounts the playable game or shows
 * the ComingSoon placeholder.
 *
 * Filter chips at the top: All / Playable / Coming soon.
 */
export default function LucaGamesPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let list = GAMES
    if (filter === 'playable') {
      list = list.filter(g => g.status === 'playable')
    } else if (filter === 'coming_soon') {
      list = list.filter(g => g.status === 'coming_soon')
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(g => {
        const name = t(`games.${g.slug}.name`, g.title).toLowerCase()
        const desc = t(`games.${g.slug}.description`, g.description).toLowerCase()
        return name.includes(q) || desc.includes(q) || g.slug.includes(q)
      })
    }
    return list
  }, [filter, query, t])

  const counts = useMemo(() => {
    const playable = GAMES.filter(g => g.status === 'playable').length
    const soon = GAMES.filter(g => g.status === 'coming_soon').length
    return { playable, soon, total: GAMES.length }
  }, [])

  useEffect(() => { document.title = t('games.luca.doc_title', 'Luca Games') }, [t])

  return (
    <article className="gc-page">
      <header className="gc-hero">
        <div className="gc-hero-text">
          <h1 className="gc-title">
            {t('games.luca.title', 'Luca Games')}
          </h1>
          <p className="gc-subtitle">
            {t(
              'games.luca.subtitle',
              'A curated collection of math, logic, and strategy games — built fresh, by hand, with care.',
            )}
          </p>
        </div>
        <div className="gc-hero-stats">
          <div className="gc-stat">
            <div className="gc-stat-value">{counts.total}</div>
            <div className="gc-stat-label">{t('games.stat_total', 'Total')}</div>
          </div>
          <div className="gc-stat gc-stat-playable">
            <div className="gc-stat-value">{counts.playable}</div>
            <div className="gc-stat-label">{t('games.stat_playable', 'Playable')}</div>
          </div>
          <div className="gc-stat gc-stat-soon">
            <div className="gc-stat-value">{counts.soon}</div>
            <div className="gc-stat-label">{t('games.stat_coming', 'Coming soon')}</div>
          </div>
        </div>
      </header>

      <div className="gc-filter-bar">
        <div className="gc-filter-chips" role="tablist">
          {(['all', 'playable', 'coming_soon'] as Filter[]).map(f => {
            const isActive = filter === f
            const count = f === 'playable' ? counts.playable : f === 'coming_soon' ? counts.soon : null
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`cb-btn cb-btn-sm ${isActive ? 'cb-btn-primary' : 'cb-btn-secondary'} gc-filter-chip`}
                onClick={() => setFilter(f)}
              >
                {t(
                  `games.filter.${f}`,
                  f === 'all' ? 'All' : f === 'playable' ? 'Playable' : 'Coming soon',
                )}
                {count !== null && (
                  <span className="gc-filter-count">{count}</span>
                )}
              </button>
            )
          })}
        </div>
        <input
          type="search"
          className="gc-search"
          placeholder={t('games.search_ph', 'Search games…')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label={t('games.search_ph', 'Search games…')}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="gc-empty">
          {t('games.no_match', 'No games match your search.')}
        </p>
      ) : (
        <ul className="gc-grid">
          {filtered.map(g => (
            <li key={g.slug}>
              <GameCard game={g} />
            </li>
          ))}
        </ul>
      )}

      <p className="gc-credits">
        {t('games.credits_2', 'Built with care.')}
      </p>

      {/* "About the games" FAQ is hidden for now — its content was stale
          (referenced "3 games" / "other 25 games" / old version notes).
          Re-enable with refreshed copy when ready. */}
    </article>
  )
}