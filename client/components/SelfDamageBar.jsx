'use client';

import { useEffect, useState } from 'react';

export default function SelfDamageBar({ gameRef }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    let raf;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const g = gameRef.current;
  if (!g) return null;
  const elapsed = g.elapsed + (performance.now() - g.at);
  const pos = Math.min(1, elapsed / g.total);
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: 150, transform: 'translateX(-50%)', width: 'min(360px, 70vw)', padding: 12, borderRadius: 10, background: 'rgba(10,12,18,0.88)', border: '1px solid #e0555f', color: '#e8eaf0', fontFamily: 'sans-serif', textAlign: 'center', pointerEvents: 'none', zIndex: 20 }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>Pulsa [E] / clic en cada marca · {g.scored.length}/{g.beats.length}</div>
      <div style={{ position: 'relative', height: 22, borderRadius: 11, background: '#1b1f2b' }}>
        {g.beats.map((b, i) => (
          <div key={i} style={{ position: 'absolute', left: `calc(${(b / g.total) * 100}% - 8px)`, top: 2, width: 16, height: 18, borderRadius: 5, background: g.scored.includes(i) ? '#54d17a' : elapsed > b + g.tolerance ? '#5a2a30' : '#e0555f', opacity: g.scored.includes(i) ? 1 : 0.9 }} />
        ))}
        <div style={{ position: 'absolute', left: `calc(${pos * 100}% - 2px)`, top: -3, width: 4, height: 28, borderRadius: 2, background: '#f2d154' }} />
      </div>
    </div>
  );
}
