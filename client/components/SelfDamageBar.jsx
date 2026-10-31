'use client';

import { useEffect, useState } from 'react';

const BOX = { position: 'absolute', left: '50%', bottom: 150, transform: 'translateX(-50%)', width: 'min(360px, 70vw)', padding: 12, borderRadius: 10, background: 'rgba(10,12,18,0.88)', border: '1px solid #e0555f', color: '#e8eaf0', fontFamily: 'sans-serif', textAlign: 'center', pointerEvents: 'none', zIndex: 20 };

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

  if (g.type === 'needle') {
    const ph = (((elapsed / g.period) % 1) + 1) % 1;
    const needle = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    return (
      <div style={BOX}>
        <div style={{ fontSize: 13, marginBottom: 8 }}>Aguja: pulsa [E] / clic cuando esté en la zona · {g.stage}/{g.stages}</div>
        <div style={{ position: 'relative', height: 22, borderRadius: 11, background: '#1b1f2b' }}>
          <div style={{ position: 'absolute', left: `${(g.zone - g.width) * 100}%`, width: `${g.width * 200}%`, top: 0, bottom: 0, background: '#54d1f2', opacity: 0.6, borderRadius: 11 }} />
          <div style={{ position: 'absolute', left: `calc(${needle * 100}% - 2px)`, top: -3, width: 4, height: 28, borderRadius: 2, background: '#f2d154' }} />
        </div>
      </div>
    );
  }
  if (g.type === 'mash') {
    return (
      <div style={BOX}>
        <div style={{ fontSize: 13, marginBottom: 8 }}>¡Machaca [E] / clic! · {g.count}/{g.target}</div>
        <div style={{ position: 'relative', height: 22, borderRadius: 11, background: '#1b1f2b', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(1, g.count / g.target) * 100}%`, background: '#e07cf2' }} />
        </div>
        <div style={{ height: 4, marginTop: 6, borderRadius: 2, background: '#1b1f2b' }}>
          <div style={{ height: 4, borderRadius: 2, width: `${(1 - pos) * 100}%`, background: '#f2d154' }} />
        </div>
      </div>
    );
  }
  return (
    <div style={BOX}>
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
