interface MacroRingProps {
  calories: number
  calorieTarget: number
  protein: number
  proteinTarget: number
  carbs: number
  fat: number
}

export function MacroRing({ calories, calorieTarget, protein, proteinTarget, carbs, fat }: MacroRingProps) {
  const pct = Math.min(100, Math.round((calories / calorieTarget) * 100))
  const remaining = Math.max(0, calorieTarget - calories)

  // SVG ring
  const size = 140
  const stroke = 12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dashOffset = circ - (pct / 100) * circ

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      {/* Ring */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-muted)" strokeWidth={stroke} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={pct >= 100 ? 'var(--red)' : 'var(--accent)'}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s var(--ease-default)', filter: 'drop-shadow(0 0 6px rgba(163,230,53,0.4))' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {calories}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>kcal</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div className="flex-between" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Remaining</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: remaining === 0 ? 'var(--red)' : 'var(--accent)' }}>
              {remaining} kcal
            </span>
          </div>
        </div>
        {[
          { label: 'Protein', value: protein, color: 'var(--macro-protein)', unit: 'g' },
          { label: 'Carbs', value: carbs, color: 'var(--macro-carbs)', unit: 'g' },
          { label: 'Fat', value: fat, color: 'var(--macro-fat)', unit: 'g' },
        ].map(({ label, value, color, unit }) => (
          <div key={label} className="flex-between">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
              {Math.round(value)}{unit}
            </span>
          </div>
        ))}
        <div style={{ paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Target: {calorieTarget} kcal · {proteinTarget}g protein
          </div>
        </div>
      </div>
    </div>
  )
}
