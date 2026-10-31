'use client';

import { useEffect, useState } from 'react';
import { getKey, keyLabel } from '../lib/keybinds';

const BOX = { position: 'absolute', left: '50%', bottom: 150, transform: 'translateX(-50%)', width: 'min(440px, 82vw)', padding: 12, borderRadius: 12, background: 'rgba(10,12,18,0.9)', border: '1px solid #e0555f', color: '#e8eaf0', fontFamily: 'sans-serif', textAlign: 'center', pointerEvents: 'none', zIndex: 20 };
const TRACK = { position: 'relative', height: 40, borderRadius: 12, background: '#1b1f2b', overflow: 'hidden' };

function Key() {
  return <span translate="no" style={{ display: 'inline-block', minWidth: 22, padding: '1px 7px', margin: '0 4px', borderRadius: 5, background: '#2a2d3d', border: '1px solid #4a5270', fontWeight: 700 }}>{keyLabel(getKey('minigame'))}</span>;
}

function TapButton({ onPress, color }) {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => { setCoarse(window.matchMedia('(pointer: coarse)').matches); }, []);
  if (!coarse) return null;
  return (
    <button
      type="button"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => { e.preventDefault(); onPress && onPress(); }}
      style={{ pointerEvents: 'auto', marginTop: 10, width: '100%', height: 84, borderRadius: 16, border: `3px solid ${color}`, background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: 2, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', animation: 'sdTap 0.9s infinite' }}
    >
      TOCA AQUÍ
    </button>
  );
}

export default function SelfDamageBar({ gameRef, onPress }) {
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
  const style = <style>{'@keyframes sdTap{0%,100%{transform:scale(1);box-shadow:0 0 0 rgba(255,255,255,0)}50%{transform:scale(1.03);box-shadow:0 0 18px rgba(255,255,255,0.4)}}'}</style>;

  if (g.type === 'needle') {
    const ph = (((elapsed / g.period) % 1) + 1) % 1;
    const needle = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const inZone = Math.abs(needle - g.zone) <= g.width;
    return (
      <div style={BOX}>
        {style}
        <div style={{ fontSize: 14, marginBottom: 8 }}>Aguja: pulsa<Key />o toca cuando esté en la zona / {g.stage}/{g.stages}</div>
        <div style={TRACK}>
          <div style={{ position: 'absolute', left: `${(g.zone - g.width) * 100}%`, width: `${g.width * 200}%`, top: 0, bottom: 0, background: inZone ? '#7dff8a' : '#54d1f2', opacity: inZone ? 0.9 : 0.55, borderRadius: 12 }} />
          <div style={{ position: 'absolute', left: `calc(${needle * 100}% - 3px)`, top: 0, width: 6, height: 40, borderRadius: 3, background: '#f2d154', boxShadow: '0 0 8px #f2d154' }} />
        </div>
        <TapButton onPress={onPress} color="#54d1f2" />
      </div>
    );
  }
  if (g.type === 'mash') {
    return (
      <div style={BOX}>
        {style}
        <div style={{ fontSize: 14, marginBottom: 8 }}>¡Machaca<Key />o toca! / {g.count}/{g.target}</div>
        <div style={TRACK}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(1, g.count / g.target) * 100}%`, background: '#e07cf2' }} />
        </div>
        <div style={{ height: 5, marginTop: 6, borderRadius: 3, background: '#1b1f2b' }}>
          <div style={{ height: 5, borderRadius: 3, width: `${(1 - pos) * 100}%`, background: '#f2d154' }} />
        </div>
        <TapButton onPress={onPress} color="#e07cf2" />
      </div>
    );
  }
  if (g.type === 'meter') {
    const ph = (((elapsed / g.period) % 1) + 1) % 1;
    const m = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const hot = Math.abs(m - 0.5) < 0.12;
    return (
      <div style={BOX}>
        {style}
        <div style={{ fontSize: 14, marginBottom: 8 }}>Medidor: pulsa<Key />o toca en el centro verde</div>
        <div style={{ ...TRACK, background: 'linear-gradient(90deg,#e0555f 0%,#f2d154 25%,#7dff8a 50%,#f2d154 75%,#e0555f 100%)' }}>
          <div style={{ position: 'absolute', left: `calc(${m * 100}% - 4px)`, top: 0, width: 8, height: 40, borderRadius: 4, background: '#fff', boxShadow: hot ? '0 0 14px #fff' : '0 0 5px #000' }} />
        </div>
        <TapButton onPress={onPress} color="#7dff8a" />
      </div>
    );
  }
  const winPct = ((g.tolerance * 2) / g.total) * 100;
  return (
    <div style={BOX}>
      {style}
      <div style={{ fontSize: 14, marginBottom: 8 }}>{g.variant === 'doble' ? 'Ritmo doble' : 'Ritmo'}: pulsa<Key />o toca dentro de cada marca / {g.scored.length}/{g.beats.length}</div>
      <div style={TRACK}>
        {g.beats.map((b, i) => {
          const done = g.scored.includes(i);
          const missed = !done && elapsed > b + g.tolerance;
          const live = !done && !missed && Math.abs(elapsed - b) <= g.tolerance;
          return (
            <div key={i} style={{ position: 'absolute', left: `${((b - g.tolerance) / g.total) * 100}%`, width: `${winPct}%`, top: 3, bottom: 3, borderRadius: 8, background: done ? '#54d17a' : missed ? '#4a2a30' : live ? '#7dff8a' : 'rgba(224,85,95,0.55)', border: `2px solid ${done ? '#54d17a' : live ? '#fff' : '#e0555f'}`, boxShadow: live ? '0 0 14px #7dff8a' : 'none' }} />
          );
        })}
        <div style={{ position: 'absolute', left: `calc(${pos * 100}% - 3px)`, top: 0, width: 6, height: 40, borderRadius: 3, background: '#f2d154', boxShadow: '0 0 8px #f2d154' }} />
      </div>
      <TapButton onPress={onPress} color="#ffd166" />
    </div>
  );
}
