export function StoreDoorIcon({ opened = false }: { opened?: boolean }) {
  return <svg className={`store-door-icon${opened ? ' is-opened' : ''}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M3 21h18M5 21V3h14v18" />
    <path className="store-door-light" d="M7 5h10v15H7z" fill="currentColor" stroke="none" />
    <g className="store-door-panel">
      <path d="M7 5h10v16H7z" />
      <path d="M14 12v2" />
    </g>
  </svg>
}
