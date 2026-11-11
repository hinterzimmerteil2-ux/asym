'use client';

import { useEffect, useRef, useState } from 'react';

export const BOSS_NAMES = [
  'Megethoskinesis',
  'Cambio de Canal',
  'Selector del Vacío',
  'Agarre de Garra',
  'Sombra Prestada',
  'Cuadro Temporal Alterado',
  'Retrotransmisión',
  'Transmisión en Vivo',
  'Pantalla Roja',
];
export const SCREEN_MODES = ['Pantalla Azul', 'Luz Blanca', 'Barra Negra'];
export const SCREEN_COLORS = ['#2f58ff', '#f2f4ff', '#15151c'];
export const BOSS_HP_MAX = 30000000;
const SIZE_MIN = 0.18;
const SIZE_MAX = 3.5;
const FONT = "'Michroma', 'Eurostile', 'Arial Narrow', sans-serif";

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function BossIcon({ id, size = 26 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', ...S };
  switch (id) {
    case 'm1':
      return (<svg {...p}><path d="M5 19 C5 12 7 8 9 5" /><path d="M10 19 C10 12 12 7 14 4" /><path d="M15 19 C15 13 17 9 19 6" /><path d="M4 19 H20" /></svg>);
    case 0:
      return (<svg {...p}><rect x="8" y="8" width="8" height="8" /><path d="M4 9 V4 H9" /><path d="M20 15 V20 H15" /><path d="M20 9 V4 H15" /><path d="M4 15 V20 H9" /></svg>);
    case 1:
      return (<svg {...p}><rect x="3" y="6" width="12" height="9" rx="1.5" /><path d="M8 19 H10" /><path d="M17 9 L21 12 L17 15" /><path d="M21 12 H18" /></svg>);
    case 2:
      return (<svg {...p}><rect x="3" y="5" width="18" height="12" rx="1.5" /><path d="M3 17 H21" /><path d="M9 5 V17" /><path d="M15 5 V17" /><path d="M8 20 H16" /></svg>);
    case 3:
      return (<svg {...p}><path d="M4 20 C8 20 6 12 11 12 C16 12 13 5 19 5" /><circle cx="19" cy="5" r="1.4" /><path d="M13 20 C16 20 15 16 19 16" /></svg>);
    case 4:
      return (<svg {...p}><circle cx="9" cy="7" r="3" /><path d="M4 20 C4 14 14 14 14 20" /><circle cx="17" cy="9" r="2.2" strokeDasharray="2 2.4" /><path d="M16 20 C16 16 21 16 21 20" strokeDasharray="2 2.4" /></svg>);
    case 5:
      return (<svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7 V12 L15 14" /><path d="M2.5 9 L4.5 11 L6.5 9" /></svg>);
    case 6:
      return (<svg {...p}><path d="M5 8 H15 A4 4 0 0 1 15 16 H8" /><path d="M8 5 L5 8 L8 11" /><path d="M11 13 L8 16 L11 19" /></svg>);
    case 7:
      return (<svg {...p}><circle cx="12" cy="12" r="2.2" /><path d="M7 7 A7 7 0 0 0 7 17" /><path d="M17 7 A7 7 0 0 1 17 17" /><path d="M4 4.5 A11 11 0 0 0 4 19.5" /><path d="M20 4.5 A11 11 0 0 1 20 19.5" /></svg>);
    case 8:
      return (<svg {...p}><rect x="3" y="5" width="18" height="12" rx="1.5" fill="currentColor" fillOpacity="0.25" /><path d="M12 8 V12.5" /><circle cx="12" cy="14.6" r="0.4" /><path d="M8 20 H16" /></svg>);
    case 'crouch':
      return (<svg {...p}><path d="M6 8 L12 14 L18 8" /><path d="M6 14 L12 20 L18 14" /></svg>);
    default:
      return null;
  }
}

export function sizeFromT(t) {
  return SIZE_MIN * Math.pow(SIZE_MAX / SIZE_MIN, Math.max(0, Math.min(1, t)));
}

export function tFromSize(size) {
  return Math.log(Math.max(SIZE_MIN, Math.min(SIZE_MAX, size)) / SIZE_MIN) / Math.log(SIZE_MAX / SIZE_MIN);
}

function useBossFont() {
  useEffect(() => {
    if (document.getElementById('jeffrey-font')) return;
    const l = document.createElement('link');
    l.id = 'jeffrey-font';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Michroma&display=swap';
    document.head.appendChild(l);
  }, []);
}

function Bar({ value, color, height = 8, back = '#22222b', marker }) {
  return (
    <div style={{ position: 'relative', height, background: back, borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ height, width: `${Math.max(0, Math.min(100, value * 100))}%`, background: color, borderRadius: height / 2, transition: 'width 120ms linear' }} />
      {marker !== undefined && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${marker * 100}%`, width: 2, background: '#ffffffaa' }} />}
    </div>
  );
}

function bannerName(fx, vm) {
  if (!fx) return null;
  if (fx.k === 'm1') return 'Garra Violeta';
  if (fx.k === 'ultfire') return 'Pantalla Roja';
  if (fx.k === 'tparrive') return null;
  if (fx.k === 2) return SCREEN_MODES[fx.m ?? 0];
  if (fx.k === 9) return BOSS_NAMES[0];
  return BOSS_NAMES[fx.k] || null;
}

const SP_WHY = { golpe: 'golpe', fallo: 'fallo', rodeado: 'rodeado', inactividad: 'inactividad', canal: 'Cambio de Canal' };

export default function BossHud({ hud, onAbility, onSize, onCrouch }) {
  useBossFont();
  const [banner, setBanner] = useState(null);
  const lastT = useRef(hud.fx?.t);
  const [drag, setDrag] = useState(null);
  useEffect(() => {
    if (!hud.fx || hud.fx.t === lastT.current) return undefined;
    lastT.current = hud.fx.t;
    const name = bannerName(hud.fx, hud.vm);
    if (!name || hud.fx.k === 'm1') return undefined;
    setBanner(name);
    const t = setTimeout(() => setBanner(null), 1900);
    return () => clearTimeout(t);
  }, [hud.fx, hud.vm]);

  const [spLog, setSpLog] = useState([]);
  const [spShake, setSpShake] = useState(0);
  const lastSpe = useRef(0);
  useEffect(() => {
    const e = hud.spe;
    if (!e || e.id === lastSpe.current) return undefined;
    lastSpe.current = e.id;
    setSpLog((l) => [...l.slice(-2), e]);
    setSpShake((n) => n + 1);
    const t1 = setTimeout(() => setSpShake(0), 120);
    const t2 = setTimeout(() => setSpLog((l) => l.filter((x) => x.id !== e.id)), 2600);
    return undefined;
  }, [hud.spe]);

  const t = drag !== null ? drag : tFromSize(hud.size || 1);
  const sizeShown = sizeFromT(t);
  const cdSize = hud.bcd?.[0] || 0;
  const holdBanner = hud.bhold > 0 ? (
    <div style={{ position: 'fixed', top: '18%', left: 0, right: 0, zIndex: 20, textAlign: 'center', color: '#c9b8ff', fontSize: 22, pointerEvents: 'none' }}>
      {hud.bhold}
    </div>
  ) : null;
  const hpFrac = hud.bhp / (hud.bmax || BOSS_HP_MAX);

  return (
    <>
      {holdBanner}
      <div style={{ position: 'fixed', top: 52, left: '50%', transform: 'translateX(-50%)', width: 'min(380px, 80vw)', zIndex: 20, pointerEvents: 'none', color: '#fff', fontSize: 12 }}>
        <div style={{ fontFamily: FONT, letterSpacing: 6, fontSize: 15, textAlign: 'center', textShadow: '0 0 10px #9b4dff' }}>JEFFREY</div>
        <div style={{ margin: '4px 0 2px' }}><Bar value={hpFrac} color="linear-gradient(90deg,#6a2cff,#c77dff)" height={9} /></div>
        <div style={{ textAlign: 'center', opacity: 0.8, fontSize: 11 }}>{Math.round(hud.bhp).toLocaleString('es')}</div>
        {banner && <div style={{ textAlign: 'center', marginTop: 6, fontFamily: FONT, fontSize: 12, letterSpacing: 2, color: '#d8c8ff' }}>{banner}</div>}
        {!hud.isBoss && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{hud.down ? 'Caído' : 'Fatiga'}</span><span>{Math.round(hud.fat)}%</span></div>
            <Bar value={hud.fat / 100} color="#e2554f" height={9} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: '#c9a0ff', fontSize: 10 }}>
              <span>−i</span>
              <div style={{ width: 110 }}><Bar value={Math.min(1, hud.debt / 40)} color="#9b4dff" height={5} /></div>
            </div>
            {hud.tem > 30 && <div style={{ marginTop: 4, color: '#ffd0f0', fontSize: 10 }}>Interferencia</div>}
          </div>
        )}
        <div style={{ marginTop: 8, transform: spShake ? 'translateX(' + (spShake % 2 ? 3 : -3) + 'px)' : 'none', transition: 'transform 60ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cordura</span><span>{hud.sp.toFixed(1)}</span></div>
          <Bar value={(hud.sp + 45) / 45} color={hud.sp <= -34 ? '#ff4a4a' : '#9aa8ff'} height={8} marker={11 / 45} />
          <div style={{ minHeight: 14, marginTop: 2, fontSize: 10, color: '#ffb0b0' }}>
            {spLog.map((l) => <span key={l.id} style={{ marginRight: 8, opacity: 0.9 }}>{'−' + l.d + ' ' + (SP_WHY[l.w] || l.w)}</span>)}
          </div>
        </div>
      </div>
      {hud.isBoss && (
        <div style={{ position: 'fixed', left: '50%', bottom: 12, transform: 'translateX(-50%)', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#fff', width: 'min(96vw, 560px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', fontSize: 11, background: '#14141bcc', borderRadius: 10, padding: '6px 10px', border: '1px solid #3a3a4a' }}>
            <BossIcon id={0} size={20} />
            <input
              type="range"
              min="0"
              max="1000"
              value={Math.round(t * 1000)}
              disabled={cdSize > 0}
              onChange={(e) => setDrag(Number(e.target.value) / 1000)}
              onPointerUp={() => { if (drag !== null) onSize(sizeFromT(drag)); setDrag(null); }}
              onKeyUp={() => { if (drag !== null) onSize(sizeFromT(drag)); setDrag(null); }}
              style={{ flex: 1, accentColor: '#9b4dff' }}
            />
            <span style={{ width: 52, textAlign: 'right' }}>{cdSize > 0 ? `${Math.ceil(cdSize)} s` : `x${sizeShown.toFixed(2)}`}</span>
            <button type="button" onClick={() => onCrouch(!hud.cr)} title="Agacharse (C)" style={{ background: hud.cr ? '#6a2cff' : '#1b1b24', color: '#fff', border: '1px solid #556', borderRadius: 8, padding: '3px 6px', display: 'flex', alignItems: 'center' }}>
              <BossIcon id="crouch" size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
            {BOSS_NAMES.map((name, i) => {
              if (i === 0) return null;
              const cd = hud.bcd?.[i] || 0;
              const locked = i === 8 && hud.sp > -34;
              const shown = i === 2 ? SCREEN_MODES[hud.vm || 0] : name;
              return (
                <button
                  key={name}
                  type="button"
                  title={`${i + 1} ${shown}`}
                  onClick={() => onAbility(i)}
                  style={{ position: 'relative', width: 52, height: 52, borderRadius: 10, border: `1px solid ${i === 2 ? SCREEN_COLORS[hud.vm || 0] : '#4a4a5c'}`, background: '#14141bdd', color: i === 8 ? '#ff6b6b' : '#e8e4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: locked ? 0.35 : 1 }}
                >
                  <BossIcon id={i} size={28} />
                  <span style={{ position: 'absolute', left: 4, top: 1, fontSize: 9, opacity: 0.7 }}>{i + 1}</span>
                  {i === 2 && <span style={{ position: 'absolute', right: 5, bottom: 5, width: 8, height: 8, borderRadius: 4, background: SCREEN_COLORS[hud.vm || 0], border: '1px solid #888' }} />}
                  {cd > 0 && <span style={{ position: 'absolute', inset: 0, borderRadius: 10, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{Math.ceil(cd)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export function BossOverlay({ hud }) {
  const bossDark = hud.isBoss && hud.dark;
  const bg = hud.red
    ? 'radial-gradient(circle at 50% 50%, rgba(255,40,40,0.55), rgba(150,0,0,0.9))'
    : bossDark
      ? 'radial-gradient(circle at 50% 56%, rgba(0,0,0,0) 4%, rgba(0,0,0,0.94) 34%)'
      : hud.ult > 0
        ? 'radial-gradient(transparent 50%, rgba(230,20,20,0.55))'
        : hud.cen
          ? 'linear-gradient(transparent 44%, #000 44%, #000 56%, transparent 56%)'
          : 'none';
  return (
    <>
      <style>{`
        @keyframes bossDrunk { 0% { backdrop-filter: blur(0px) hue-rotate(0deg); transform: translateX(0); } 25% { backdrop-filter: blur(2.5px) hue-rotate(25deg); transform: translateX(10px); } 50% { backdrop-filter: blur(1px) hue-rotate(-20deg); transform: translateX(-8px); } 75% { backdrop-filter: blur(3px) hue-rotate(15deg); transform: translateX(6px); } 100% { backdrop-filter: blur(0px) hue-rotate(0deg); transform: translateX(0); } }
        @keyframes bossRedPulse { 0%,100% { opacity: 0.85; } 50% { opacity: 1; } }
      `}</style>
      {!hud.isBoss && hud.fat > 20 && <div style={{ position: 'fixed', inset: 0, zIndex: 13, pointerEvents: 'none', boxShadow: 'inset 0 0 ' + Math.round(60 + hud.fat * 1.6) + 'px rgba(210,30,40,' + Math.min(0.75, hud.fat / 140).toFixed(2) + ')' }} />}
      {!hud.isBoss && hud.debt > 4 && <div style={{ position: 'fixed', inset: 0, zIndex: 13, pointerEvents: 'none', boxShadow: 'inset 0 0 ' + Math.round(40 + hud.debt * 3) + 'px rgba(140,70,255,' + Math.min(0.7, hud.debt / 50).toFixed(2) + ')', animation: 'bossRedPulse 1.1s ease-in-out infinite' }} />}
      {!hud.isBoss && hud.tem > 30 && <div style={{ position: 'fixed', inset: 0, zIndex: 16, pointerEvents: 'none', opacity: Math.min(0.5, (hud.tem - 30) / 120), background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 4px)', animation: 'bossDrunk 0.35s steps(3) infinite' }} />}
      {hud.isBoss && hud.sp < -20 && <div style={{ position: 'fixed', inset: 0, zIndex: 13, pointerEvents: 'none', boxShadow: 'inset 0 0 120px rgba(255,60,60,' + Math.min(0.6, (-hud.sp - 20) / 40).toFixed(2) + ')', animation: 'bossRedPulse 0.8s ease-in-out infinite' }} />}
      {(hud.blue) && <div style={{ position: 'fixed', inset: -20, zIndex: 14, pointerEvents: 'none', background: 'rgba(40,80,255,0.22)', animation: 'bossDrunk 1.6s ease-in-out infinite' }} />}
      {bg !== 'none' && <div style={{ position: 'fixed', inset: 0, zIndex: 15, pointerEvents: 'none', background: bg, animation: hud.red ? 'bossRedPulse 0.7s linear infinite' : 'none' }} />}
    </>
  );
}
