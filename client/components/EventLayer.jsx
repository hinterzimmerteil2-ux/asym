'use client';
import { useEffect, useState } from 'react';

const COLORS = { blackout: '#9aa5ff', alarm: '#ff6b6b', shuffle: '#ffd166', gatesLock: '#ffb454', gatesOpen: '#5fd58c' };

const CRACKS = [
  'M32 8 L29 18 L34 24 L30 33',
  'M30 33 L22 38 L19 46',
  'M34 24 L43 27 L47 35',
  'M30 33 L36 41 L34 50',
  'M29 18 L21 17 L16 22',
];

function colorOf(ev) {
  return ev.kind === 'gates' ? (ev.mode === 'open' ? COLORS.gatesOpen : COLORS.gatesLock) : COLORS[ev.kind];
}

function Glyph({ ev, color }) {
  const c = { stroke: color, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (ev.kind === 'gates') {
    return ev.mode === 'open'
      ? <g {...c}><rect x="25" y="29" width="14" height="10" rx="2" /><path d="M28 29 v-4 a4 4 0 0 1 8 0" /></g>
      : <g {...c}><rect x="25" y="29" width="14" height="10" rx="2" /><path d="M28 29 v-4 a4 4 0 0 1 8 0 v4" /></g>;
  }
  if (ev.kind === 'alarm') return <g {...c}><path d="M26 40 v-8 a6 6 0 0 1 12 0 v8 z" /><path d="M24 44 h16" /><path d="M32 21 v-3" /></g>;
  if (ev.kind === 'shuffle') return <g {...c}><path d="M24 29 h14 l-4 -4 M38 29" /><path d="M40 37 h-14 l4 4" /></g>;
  return <g {...c}><path d="M28 40 h8 M29 44 h6" /><path d="M32 22 v6" /></g>;
}

function Lamp({ ev }) {
  const color = colorOf(ev);
  const warn = ev.phase === 'warn';
  const progress = warn ? Math.max(0, Math.min(1, 1 - ev.ms / Math.max(1, ev.warnMs))) : 1;
  const left = warn ? 0 : Math.max(0, Math.min(1, ev.ms / Math.max(1, ev.durMs)));
  const shown = warn ? Math.ceil(progress * CRACKS.length - 0.001) : 0;
  const R = 29;
  const C = 2 * Math.PI * R;
  return (
    <div style={{ width: 64, height: 64, animation: warn ? `evShake ${Math.max(0.12, 0.6 - progress * 0.45)}s infinite` : 'evPop .4s' }}>
      <svg viewBox="0 0 64 64" width="64" height="64">
        <circle cx="32" cy="32" r={R} fill="rgba(14,16,28,0.88)" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
        {!warn && <circle cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="3" strokeDasharray={C} strokeDashoffset={C * (1 - left)} transform="rotate(-90 32 32)" />}
        {warn && <circle cx="32" cy="32" r={R} fill="none" stroke={color} strokeOpacity={0.35 + progress * 0.6} strokeWidth="3" strokeDasharray="4 5" />}
        <g opacity={warn ? 1 : 0.95} style={{ filter: `drop-shadow(0 0 ${warn ? 2 + progress * 5 : 7}px ${color})` }}>
          <path d="M32 12 a12 12 0 0 0 -7 21.7 V37 h14 v-3.3 A12 12 0 0 0 32 12 z" fill={color} fillOpacity={warn ? 0.1 + progress * 0.25 : 0.28} stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M27 40 h10 M28.5 44 h7" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Glyph ev={ev} color={color} />
        </g>
        {CRACKS.slice(0, shown).map((d, i) => (
          <path key={d} d={d} fill="none" stroke="#fff" strokeWidth={1.6 + (i === shown - 1 ? 0.6 : 0)} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
        ))}
      </svg>
    </div>
  );
}

function inside(ev, pos) {
  if (!pos) return true;
  if (ev.r > 0 && Math.hypot(pos.x - ev.x, pos.z - ev.z) > ev.r) return false;
  const y = pos.y || 0;
  if (ev.yMin !== null && ev.yMin !== undefined && y < ev.yMin) return false;
  if (ev.yMax !== null && ev.yMax !== undefined && y > ev.yMax) return false;
  return true;
}

export default function EventLayer({ events, posRef }) {
  const [pos, setPos] = useState(null);
  const dark = (events || []).some((e) => e.kind === 'blackout' && e.phase === 'active');
  useEffect(() => {
    if (!dark) return undefined;
    const id = setInterval(() => setPos(posRef.current ? { ...posRef.current } : null), 150);
    return () => clearInterval(id);
  }, [dark, posRef]);
  if (!events || events.length === 0) return null;
  const black = events.some((e) => e.kind === 'blackout' && e.phase === 'active' && inside(e, pos));
  return (
    <>
      <style>{'@keyframes evShake{0%,100%{transform:translate(0,0)}25%{transform:translate(-1.5px,1px)}50%{transform:translate(1.5px,-1px)}75%{transform:translate(-1px,-1.5px)}}@keyframes evPop{0%{transform:scale(1.6);opacity:0}100%{transform:scale(1);opacity:1}}'}</style>
      {black && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, background: 'radial-gradient(circle at 50% 55%, rgba(2,3,12,0.25) 0, rgba(2,3,12,0.9) 140px, rgba(2,3,12,0.96) 100%)' }} />
      )}
      <div style={{ position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 6, pointerEvents: 'none' }}>
        {events.map((ev) => <Lamp key={ev.id} ev={ev} />)}
      </div>
    </>
  );
}
