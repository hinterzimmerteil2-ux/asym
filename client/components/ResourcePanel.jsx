'use client';

function Row({ r }) {
  const empty = r.empty || (r.cur <= 0 && r.kind === 'pips');
  const name = r.id === 'tigermark' ? <span translate="no">{r.name}</span> : <span>{r.name}</span>;
  const cells = r.kind === 'pips' && r.max <= 16;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: empty ? '#ff8a8a' : '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
      {r.icon && <img src={r.icon} alt="" width={18} height={18} style={{ imageRendering: 'pixelated' }} />}
      {name}
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.cur}/{r.max}</span>
      {cells ? (
        <div style={{ display: 'flex', gap: 2 }}>
          {Array.from({ length: r.max }).map((_, i) => <div key={i} style={{ width: 9, height: 9, background: i < r.cur ? r.color : 'rgba(255,255,255,0.2)', border: '1px solid rgba(0,0,0,0.5)' }} />)}
        </div>
      ) : (
        <div style={{ width: 120, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(0, Math.min(100, (r.cur / Math.max(1, r.max)) * 100))}%`, height: '100%', background: r.color }} />
        </div>
      )}
      {r.extra && <span style={{ color: '#ffd86b' }}>{r.extra.label} {r.extra.value}</span>}
      {r.timer && <span style={{ color: '#ffb347' }}>{r.timer.label} {Math.round(r.timer.pct * 100)}%</span>}
      {(r.tags || []).map((t, i) => <span key={i} style={{ color: t.color }}>{t.text}{t.value ? ` ${t.value}` : ''}</span>)}
    </div>
  );
}

export default function ResourcePanel({ res, compact }) {
  if (!res || res.length === 0) return null;
  return (
    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: compact ? 120 : 150, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pointerEvents: 'none' }}>
      {res.map((r) => <Row key={r.id} r={r} />)}
    </div>
  );
}
