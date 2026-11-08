'use client';

import { useEffect, useRef, useState } from 'react';
import { getKey, keyLabel } from '../lib/keybinds';

const CSS = `
@keyframes sdTap{0%,100%{transform:scale(1);box-shadow:0 0 0 rgba(255,255,255,0)}50%{transform:scale(1.04);box-shadow:0 0 22px rgba(255,255,255,0.45)}}
@keyframes sdIn{from{opacity:0;transform:translateX(-50%) translateY(26px) scale(0.92)}to{opacity:1;transform:translateX(-50%) none}}
@keyframes sdKey{0%,100%{transform:translateY(0);box-shadow:0 3px 0 #11131c}50%{transform:translateY(2px);box-shadow:0 1px 0 #11131c}}
@keyframes sdHit{0%{transform:scale(1);filter:brightness(1)}35%{transform:scale(1.07);filter:brightness(1.8)}100%{transform:scale(1);filter:brightness(1)}}
@keyframes sdPulse{0%,100%{box-shadow:0 0 6px var(--c)}50%{box-shadow:0 0 22px var(--c)}}
@keyframes sdIn2{from{opacity:0;transform:scale(0.4) rotate(-12deg)}to{opacity:1;transform:none}}
@keyframes sdFlash{0%{opacity:0.85}100%{opacity:0}}
@keyframes sdShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
@media (prefers-reduced-motion: reduce){.sd-anim{animation:none !important}}
`;

const BOX = { position: 'absolute', left: '50%', bottom: 150, transform: 'translateX(-50%)', width: 'min(520px, 90vw)', padding: '14px 16px 16px', borderRadius: 16, background: 'linear-gradient(180deg, rgba(22,16,22,0.95), rgba(10,12,18,0.95))', color: '#e8eaf0', fontFamily: 'inherit', textAlign: 'center', pointerEvents: 'none', zIndex: 20, overflow: 'hidden', animation: 'sdIn 380ms cubic-bezier(.2,.9,.3,1.15) both' };
const TRACK = { position: 'relative', height: 52, borderRadius: 14, background: '#161a26', overflow: 'hidden', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)' };

function Key() {
  return <span translate="no" className="sd-anim" style={{ display: 'inline-block', minWidth: 26, padding: '2px 9px', margin: '0 6px', borderRadius: 6, background: '#2e3247', border: '1px solid #6a7396', fontWeight: 800, color: '#fff', animation: 'sdKey 0.8s ease-in-out infinite' }}>{keyLabel(getKey('minigame'))}</span>;
}

function Head({ title, right, color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 18, fontWeight: 800, color }}>{title}</span>
      <span style={{ fontSize: 13, opacity: 0.9 }}>{children}</span>
      <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{right}</span>
    </div>
  );
}

function TimeBar({ left, color }) {
  return (
    <div style={{ height: 6, marginTop: 10, borderRadius: 3, background: '#161a26' }}>
      <div style={{ height: 6, borderRadius: 3, width: `${Math.max(0, left) * 100}%`, background: left < 0.25 ? '#e0555f' : color }} />
    </div>
  );
}

function TapButton({ onPress, color }) {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => { setCoarse(window.matchMedia('(pointer: coarse)').matches); }, []);
  if (!coarse) return null;
  return (
    <button
      type="button"
      className="sd-anim"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => { e.preventDefault(); onPress && onPress(); }}
      style={{ pointerEvents: 'auto', marginTop: 12, width: '100%', height: 92, borderRadius: 18, border: `3px solid ${color}`, background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: 2, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', animation: 'sdTap 0.9s infinite' }}
    >
      TOCA AQUÍ
    </button>
  );
}

const CARDS = [
  { g: 'A', c: '#e0555f' },
  { g: 'B', c: '#f2d154' },
  { g: 'C', c: '#7dff8a' },
  { g: 'D', c: '#54d1f2' },
  { g: 'E', c: '#e07cf2' },
  { g: 'F', c: '#ff9a5a' },
];

function cardStyle(c, extra) {
  return { width: 54, height: 70, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#10131c', background: CARDS[c].c, boxShadow: '0 4px 10px rgba(0,0,0,0.5)', userSelect: 'none', ...extra };
}

function KeysInput({ pool, onOrder }) {
  const [placed, setPlaced] = useState([]);
  const sent = useRef(false);
  const put = (c) => setPlaced((p) => (p.includes(c) || p.length >= pool.length ? p : [...p, c]));
  useEffect(() => {
    if (placed.length === pool.length && !sent.current) { sent.current = true; onOrder && onOrder(placed); }
  }, [placed]);
  useEffect(() => {
    const h = (e) => {
      if (e.detail === 'Backspace') { if (!sent.current) setPlaced((p) => p.slice(0, -1)); return; }
      const n = Number(e.detail.slice(-1)) - 1;
      if (!sent.current && pool[n] !== undefined) put(pool[n]);
    };
    window.addEventListener('sd-keys', h);
    return () => window.removeEventListener('sd-keys', h);
  }, [pool]);
  const slotDrop = (e) => { e.preventDefault(); const c = Number(e.dataTransfer.getData('text/plain')); if (Number.isInteger(c) && pool.includes(c)) put(c); };
  return (
    <div style={{ pointerEvents: 'auto' }}>
      <div onDragOver={(e) => e.preventDefault()} onDrop={slotDrop} style={{ display: 'flex', gap: 8, justifyContent: 'center', minHeight: 76, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>
        {pool.map((_, i) => placed[i] !== undefined
          ? <button type="button" key={i} onClick={() => !sent.current && setPlaced((p) => p.filter((x) => x !== placed[i]))} style={{ ...cardStyle(placed[i]), border: 'none', cursor: 'pointer' }}>{CARDS[placed[i]].g}</button>
          : <div key={i} style={{ width: 54, height: 70, borderRadius: 10, border: '2px dashed #6a7396', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a7396', fontWeight: 800 }}>{i + 1}</div>)}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
        {pool.map((c, i) => (
          <button type="button" key={c} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(c))} onClick={() => put(c)} disabled={placed.includes(c)} style={{ ...cardStyle(c), border: 'none', cursor: 'grab', opacity: placed.includes(c) ? 0.25 : 1, transition: 'transform 120ms' }}>
            {CARDS[c].g}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>arrastra o pulsa las tarjetas en orden. Teclas 1 a {pool.length} y Retroceso</div>
    </div>
  );
}

export default function SelfDamageBar({ gameRef, onPress, onDir }) {
  const [, setTick] = useState(0);
  const prev = useRef({ key: '', n: 0, hitAt: 0 });
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
  const now = performance.now();
  const progress = g.type === 'needle' ? g.stage : g.type === 'mash' ? g.count : g.type === 'rhythm' ? g.scored.length : 0;
  const key = `${g.type}:${g.objectId || ''}:${g.total}`;
  if (prev.current.key !== key) prev.current = { key, n: progress, hitAt: 0 };
  else if (progress > prev.current.n) prev.current = { key, n: progress, hitAt: now };
  else if (progress < prev.current.n) prev.current.n = progress;
  const sinceHit = now - prev.current.hitAt;
  const hitting = prev.current.hitAt > 0 && sinceHit < 420;
  const hitAnim = hitting ? { animation: 'sdHit 420ms ease-out' } : null;
  const frame = (color) => ({ ...BOX, border: `2px solid ${color}`, boxShadow: `0 0 34px ${color}55, 0 10px 30px rgba(0,0,0,0.5)` });
  const flash = (color) => hitting ? <div className="sd-anim" key={prev.current.hitAt} style={{ position: 'absolute', inset: 0, background: color, animation: 'sdFlash 420ms ease-out forwards', pointerEvents: 'none' }} /> : null;
  const left = 1 - pos;

  if (g.type === 'needle') {
    const ph = (((elapsed / g.period) % 1) + 1) % 1;
    const needle = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const inZone = Math.abs(needle - g.zone) <= g.width;
    return (
      <div style={frame('#54d1f2')}>
        <style>{CSS}</style>
        {flash('#7dff8a22')}
        <Head title="Aguja" color="#54d1f2" right={`${g.stage}/${g.stages}`}>pulsa<Key />con la aguja en la zona</Head>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
          {Array.from({ length: g.stages }).map((_, i) => (
            <span key={i} className={i === g.stage - 1 && hitting ? 'sd-anim' : undefined} style={{ width: 28, height: 8, borderRadius: 4, background: i < g.stage ? '#7dff8a' : '#2a2f40', ...(i === g.stage - 1 ? hitAnim : null) }} />
          ))}
        </div>
        <div style={{ ...TRACK, ...hitAnim }} className="sd-anim">
          <div className="sd-anim" style={{ '--c': inZone ? '#7dff8a' : '#54d1f2', position: 'absolute', left: `${(g.zone - g.width) * 100}%`, width: `${g.width * 200}%`, top: 0, bottom: 0, background: inZone ? '#7dff8a' : '#54d1f2', opacity: inZone ? 0.95 : 0.5, borderRadius: 12, animation: 'sdPulse 0.7s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', left: `calc(${needle * 100}% - 4px)`, top: 0, width: 8, height: 52, borderRadius: 4, background: '#f2d154', boxShadow: '0 0 12px #f2d154, -14px 0 14px rgba(242,209,84,0.35)' }} />
        </div>
        <TimeBar left={left} color="#54d1f2" />
        <TapButton onPress={onPress} color="#54d1f2" />
      </div>
    );
  }
  if (g.type === 'lock') {
    const pe = g.pinElapsed + (now - g.at);
    const ph = (((pe / g.period) % 1) + 1) % 1;
    const needle = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const inZone = Math.abs(needle - g.zone) <= g.width;
    if (g.phase === 'hand') {
      const hl = Math.max(0, g.handMs - (now - g.at));
      return (
        <div style={frame('#ff5a5a')}>
          <style>{CSS}</style>
          <Head title="Cerradura abierta" color="#ff5a5a" right={`${(hl / 1000).toFixed(1)} s`}>pulsa<Key />para poner la mano</Head>
          <div className="sd-anim" style={{ height: 70, borderRadius: 14, background: 'linear-gradient(90deg,#7a1d24,#ff5a5a)', animation: 'sdTap 0.35s infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900 }}>MANO</div>
          <TimeBar left={hl / 1800} color="#ff5a5a" />
          <TapButton onPress={onPress} color="#ff5a5a" />
        </div>
      );
    }
    return (
      <div style={frame('#c8a2ff')}>
        <style>{CSS}</style>
        {flash('#7dff8a22')}
        <Head title="Cerradura" color="#c8a2ff" right={`${g.stage}/${g.stages}`}>pulsa<Key />en la zona, un fallo reinicia</Head>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
          {Array.from({ length: g.stages }).map((_, i) => (
            <span key={i} style={{ width: 34, height: 10, borderRadius: 5, background: i < g.stage ? '#7dff8a' : '#2a2f40' }} />
          ))}
        </div>
        <div style={{ ...TRACK, ...hitAnim }} className="sd-anim">
          <div className="sd-anim" style={{ '--c': inZone ? '#7dff8a' : '#c8a2ff', position: 'absolute', left: `${(g.zone - g.width) * 100}%`, width: `${g.width * 200}%`, top: 0, bottom: 0, background: inZone ? '#7dff8a' : '#c8a2ff', opacity: inZone ? 0.95 : 0.55, borderRadius: 12, animation: 'sdPulse 0.6s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', left: `calc(${needle * 100}% - 4px)`, top: 0, width: 8, height: 52, borderRadius: 4, background: '#f2d154', boxShadow: '0 0 12px #f2d154, -14px 0 14px rgba(242,209,84,0.35)' }} />
        </div>
        <TapButton onPress={onPress} color="#c8a2ff" />
      </div>
    );
  }
  if (g.type === 'keys') {
    const pl = Math.max(0, g.phaseMs - (now - g.at));
    const title = g.phase === 'connect' ? 'Conectando' : g.phase === 'show' ? 'Memoriza el orden' : 'Ordena las tarjetas';
    const col = g.phase === 'show' ? '#ffd166' : g.phase === 'input' ? '#7dff8a' : '#ff9a5a';
    return (
      <div style={frame('#ff9a5a')}>
        <style>{CSS}</style>
        {flash('#7dff8a22')}
        <Head title={title} color={col} right={`${g.round}/${g.rounds}`}>fallos {g.fails}/{g.maxFails}, daño {g.dealt}</Head>
        {g.phase === 'connect' && <div className="sd-anim" style={{ minHeight: 76, fontSize: 22, fontWeight: 800, animation: 'sdTap 0.5s infinite' }}>...</div>}
        {g.phase === 'show' && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', minHeight: 76 }}>
            {g.seq.map((c, i) => <div key={i} className="sd-anim" style={{ ...cardStyle(c), animation: `sdIn2 300ms ${i * 140}ms both` }}>{CARDS[c].g}</div>)}
          </div>
        )}
        {g.phase === 'input' && <KeysInput key={`${g.round}:${g.fails}:${g.pool.join('')}`} pool={g.pool} onOrder={onDir} />}
        {g.phase !== 'connect' && <TimeBar left={pl / (g.phase === 'show' ? 1000 + g.len * 350 : 3200 + g.len * 550)} color={col} />}
      </div>
    );
  }
  if (g.type === 'mash') {
    const fill = Math.min(1, g.count / g.target);
    return (
      <div style={frame('#e07cf2')}>
        <style>{CSS}</style>
        {flash('#e07cf222')}
        <Head title="Machaca" color="#e07cf2" right={`${g.count}/${g.target}`}>pulsa<Key />sin parar</Head>
        <div className="sd-anim" style={{ ...TRACK, height: 60, ...(hitting ? { animation: 'sdShake 140ms linear' } : null) }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: 'linear-gradient(90deg,#a23fc0,#f08cff)', transition: 'width 90ms ease-out', boxShadow: '0 0 18px #e07cf2' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, textShadow: '0 2px 6px #000', ...hitAnim }} className="sd-anim">{Math.round(fill * 100)}%</div>
        </div>
        <TimeBar left={left} color="#f2d154" />
        <TapButton onPress={onPress} color="#e07cf2" />
      </div>
    );
  }
  if (g.type === 'meter') {
    const ph = (((elapsed / g.period) % 1) + 1) % 1;
    const m = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const hot = Math.abs(m - 0.5) < 0.12;
    return (
      <div style={frame(hot ? '#7dff8a' : '#e0b55f')}>
        <style>{CSS}</style>
        <Head title="Medidor" color="#7dff8a">pulsa<Key />en el centro verde</Head>
        <div style={{ ...TRACK, background: 'linear-gradient(90deg,#e0555f 0%,#f2d154 25%,#7dff8a 50%,#f2d154 75%,#e0555f 100%)' }}>
          <div style={{ position: 'absolute', left: `calc(${m * 100}% - 5px)`, top: 0, width: 10, height: 52, borderRadius: 5, background: '#fff', boxShadow: hot ? '0 0 22px #fff, 0 0 40px #7dff8a' : '0 0 6px #000' }} />
        </div>
        <TimeBar left={left} color="#7dff8a" />
        <TapButton onPress={onPress} color="#7dff8a" />
      </div>
    );
  }
  const winPct = ((g.tolerance * 2) / g.total) * 100;
  return (
    <div style={frame('#ffd166')}>
      <style>{CSS}</style>
      {flash('#7dff8a22')}
      <Head title={g.variant === 'doble' ? 'Ritmo doble' : 'Ritmo'} color="#ffd166" right={`${g.scored.length}/${g.beats.length}`}>pulsa<Key />dentro de cada marca</Head>
      <div style={TRACK}>
        {g.beats.map((b, i) => {
          const done = g.scored.includes(i);
          const missed = !done && elapsed > b + g.tolerance;
          const live = !done && !missed && Math.abs(elapsed - b) <= g.tolerance;
          const soon = !done && !missed && !live && b - elapsed < 700 && b > elapsed;
          return (
            <div key={i} className="sd-anim" style={{ '--c': '#7dff8a', position: 'absolute', left: `${((b - g.tolerance) / g.total) * 100}%`, width: `${winPct}%`, top: 3, bottom: 3, borderRadius: 9, background: done ? '#54d17a' : missed ? '#3a2228' : live ? '#7dff8a' : 'rgba(224,85,95,0.55)', border: `2px solid ${done ? '#54d17a' : live ? '#fff' : soon ? '#ffd166' : '#e0555f'}`, animation: live ? 'sdPulse 0.35s ease-in-out infinite' : 'none', opacity: missed ? 0.6 : 1 }} />
          );
        })}
        <div style={{ position: 'absolute', left: `calc(${pos * 100}% - 4px)`, top: 0, width: 8, height: 52, borderRadius: 4, background: '#f2d154', boxShadow: '0 0 12px #f2d154, -14px 0 14px rgba(242,209,84,0.35)' }} />
      </div>
      <TapButton onPress={onPress} color="#ffd166" />
    </div>
  );
}
