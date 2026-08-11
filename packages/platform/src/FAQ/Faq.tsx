// FAQ — collapsible Q&A component for the Luca Games gallery.
//
// Usage:
//   const items = [
//     { q: 'Why are the tiles blue?', a: 'Because math blue...' },
//     ...
//   ]
//   <Faq items={items} title="About the games" />
//
// Features:
// - All questions start collapsed (cleaner first impression)
// - Multiple can be open simultaneously (no accordion behavior)
// - Accessible: aria-expanded, aria-controls, semantic HTML
// - Localized: each item is a plain string, the caller uses t() before passing

import { useState } from 'react'
import '../css/faq.css'

interface FaqItem {
  question: string
  answer: string
}

interface Props {
  items: FaqItem[]
  title?: string
}

export function Faq({ items, title }: Props) {
  const [open, setOpen] = useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <section className="faq" aria-label={title || 'Frequently asked questions'}>
      {title && <h2 className="faq-title">{title}</h2>}
      <ul className="faq-list">
        {items.map((item, i) => {
          const isOpen = open.has(i)
          const panelId = `faq-panel-${i}`
          const btnId = `faq-btn-${i}`
          return (
            <li key={i} className={`faq-item ${isOpen ? 'faq-item-open' : ''}`}>
              <button
                type="button"
                id={btnId}
                className="faq-q"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(i)}
              >
                <span className="faq-q-text">{item.question}</span>
                <span className="faq-q-icon" aria-hidden="true">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  className="faq-a"
                >
                  {item.answer}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}