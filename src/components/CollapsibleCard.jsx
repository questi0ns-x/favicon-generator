import { useState } from 'react'
import { COLORS } from '../utils/constants'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

const card = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '12px',
  marginBottom: '10px',
}

const cardHeader = {
  width: '100%',
  padding: '1.25rem',
  background: 'transparent',
  border: 'none',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  ...mono,
}

const sectionLabel = {
  fontSize: '10px',
  letterSpacing: '0.12em',
  color: COLORS.accent,
  ...mono,
}

const chevron = {
  fontSize: '10px',
  color: COLORS.textDim,
  transition: 'transform 0.2s',
}

const cardContent = {
  padding: '0 1.25rem 1.25rem',
}

export default function CollapsibleCard({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={card}>
      <button
        onClick={() => setOpen(!open)}
        style={cardHeader}
      >
        <span style={sectionLabel}>{title}</span>
        <span style={{ ...chevron, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          ▼
        </span>
      </button>
      {open && <div style={cardContent}>{children}</div>}
    </div>
  )
}
