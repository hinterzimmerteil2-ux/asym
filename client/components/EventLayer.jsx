'use client';
import { useEffect, useState } from 'react';

const TEXT = {
  blackout: { warn: '¡Apagón en', active: 'Apagón', color: '#9aa5ff' },
  alarm: { warn: '¡Alarma en', active: 'Alarma: se ve a todos los Pacientes', color: '#ff6b6b' },
  shuffle: { warn: '¡Reubicación de objetos en', active: 'Objetos reubicados', color: '#ffd166' },
};

function label(ev) {
  if (ev.kind === 'gates') {
    const open = ev.mode === 'open';
    return { warn: open ? '¡Puertas abiertas en' : '¡Puertas cerradas en', active: open ? 'Puertas abiertas' : 'Puertas cerradas', color: open ? '#5fd58c' : '#ffb454' };
  }
  return TEXT[ev.kind];
}

function inside(ev, pos) {
  if (!pos) return true;
  if (ev.r > 0 && Math.hypot(pos.x - ev.x, pos.z - ev.z) > ev.r) return false;
  const y = pos.y || 0;
  if (ev.yMin !== null && ev.yMin !== undefined && y < ev.yMin) return false;
  if (ev.yMax !== null && ev.yMax !== undefined && y > ev.yMax) return false;
  return true;
}

export default function EventLayer({ events, posRef, tr }) {
  const [pos, setPos] = useState(null);
  const dark = (events || []).some((e) => e.kind === 'blackout' && e.phase === 'active');
  useEffect(() => {
    if (!dark) return undefined;
    const id = setInterval(() => setPos(posRef.current ? { ...posRef.current } : null), 150);
    return () => clearInterval(id);
  }, [dark, posRef]);
  if (!events || events.length === 0) return null;
  const black = events.some((e) => e.kind === 'blackout' && e.phase === 'active' && inside(e, pos));
  const t = tr || ((s) => s);
  return (
    <>
      {black && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 4,
            background: 'radial-gradient(circle at 50% 55%, rgba(2,3,12,0.25) 0, rgba(2,3,12,0.9) 140px, rgba(2,3,12,0.96) 100%)',
          }}
        />
      )}
      <div style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 6, zIndex: 6, pointerEvents: 'none' }}>
        {events.map((ev) => {
          const l = label(ev);
          if (!l) return null;
          const secs = Math.ceil(ev.ms / 1000);
          return (
            <div key={ev.id} style={{ padding: '6px 16px', borderRadius: 10, background: 'rgba(18,19,26,0.92)', border: `1px solid ${l.color}`, color: l.color, fontWeight: 700, fontSize: 14, textAlign: 'center' }}>
              {ev.phase === 'warn' ? `${t(l.warn)} ${secs}s` : `${t(l.active)} · ${secs}s`}
            </div>
          );
        })}
      </div>
    </>
  );
}
