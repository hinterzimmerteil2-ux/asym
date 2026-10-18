'use client';

import { useEffect, useState } from 'react';

const TOLERANCE = 150;

export default function RhythmBar({ channelRef }) {
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
  const ch = channelRef.current;
  if (!ch) return null;
  const elapsed = ch.elapsed + (performance.now() - ch.at);
  const phase = (((elapsed + ch.beatMs / 2) % ch.beatMs) + ch.beatMs) % ch.beatMs / ch.beatMs;
  const zoneHalf = TOLERANCE / ch.beatMs;
  const beat = Math.min(ch.beats, Math.max(1, Math.round(elapsed / ch.beatMs)));
  const remaining = Math.max(0, Math.ceil((ch.total - elapsed) / 1000));
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: 150, transform: 'translateX(-50%)', width: 'min(320px, 60vw)', padding: 12, borderRadius: 10, background: 'rgba(10,12,18,0.85)', border: '1px solid #2a2f3d', color: '#e8eaf0', fontFamily: 'sans-serif', textAlign: 'center', pointerEvents: 'none' }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>
        Grito de Ánimo — pulsa [E] al ritmo · {ch.hits}/{ch.beats} · {remaining}s
      </div>
      <div style={{ position: 'relative', height: 18, borderRadius: 9, background: '#1b1f2b' }}>
        <div style={{ position: 'absolute', left: `${(0.5 - zoneHalf) * 100}%`, width: `${zoneHalf * 200}%`, top: 0, bottom: 0, background: '#54d1f2', opacity: 0.55, borderRadius: 9 }} />
        <div style={{ position: 'absolute', left: `calc(${phase * 100}% - 6px)`, top: -3, width: 12, height: 24, borderRadius: 4, background: '#f2d154' }} />
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
        {Array.from({ length: ch.beats }, (_, i) => (
          <span key={i} style={{ width: 14, height: 6, borderRadius: 3, background: ch.scored.includes(i + 1) ? '#54d1f2' : i + 1 < beat ? '#5a2a30' : '#2a2f3d' }} />
        ))}
      </div>
    </div>
  );
}
