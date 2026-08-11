'use client'

import { useRouter } from 'next/navigation'

// DS 2.0 — Intelligent breadcrumb
// Renders a clickable path with chevron separators

export interface BreadcrumbItem {
  label:  string
  href?:  string
  icon?:  string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  style?: React.CSSProperties
}

export default function Breadcrumb({ items, style }: BreadcrumbProps) {
  const router = useRouter()

  return (
    <nav aria-label="Fil d'Ariane" className="ds-breadcrumb" style={style}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="ds-breadcrumb-item">
            {i > 0 && (
              <span className="ds-breadcrumb-sep" aria-hidden>›</span>
            )}
            {isLast ? (
              <span
                className="ds-breadcrumb-current"
                aria-current="page"
              >
                {item.icon && <span aria-hidden style={{ marginRight: 4 }}>{item.icon}</span>}
                {item.label}
              </span>
            ) : (
              <button
                className="ds-breadcrumb-link ds-focus"
                onClick={() => item.href && router.push(item.href)}
                disabled={!item.href}
                title={item.label}
              >
                {item.icon && <span aria-hidden style={{ marginRight: 4 }}>{item.icon}</span>}
                {item.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
