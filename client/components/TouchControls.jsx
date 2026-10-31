'use client';

import { useEffect, useRef, useState } from 'react';
import { getKey, keyLabel } from '../lib/keybinds';

function press(code, down) {
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
}

function Stick() {
  const [origin, setOrigin] = useState(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(new Set());
  const pointer = useRef(null);
  const RADIUS = 40;

  function apply(dx, dy) {
    const want = new Set();
    if (dy < -0.25) want.add(getKey('forward'));
    if (dy > 0.25) want.add(getKey('back'));
    if (dx < -0.25) want.add(getKey('left'));
    if (dx > 0.25) want.add(getKey('right'));
    for (const code of active.current) if (!want.has(code)) press(code, false);
    for (const code of want) if (!active.current.has(code)) press(code, true);
    active.current = want;
  }
  function move(e, o) {
    let dx = (e.clientX - o.x) / RADIUS;
    let dy = (e.clientY - o.y) / RADIUS;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    setKnob({ x: dx, y: dy });
    apply(dx, dy);
  }
  function end() {
    pointer.current = null;
    setOrigin(null);
    setKnob({ x: 0, y: 0 });
    apply(0, 0);
  }
  return (
    <div
      onPointerDown={(e) => {
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const o = { x: e.clientX, y: e.clientY };
        setOrigin(o);
        move(e, o);
      }}
      onPointerMove={(e) => { if (pointer.current === e.pointerId && origin) move(e, origin); }}
      onPointerUp={end}
      onPointerCancel={end}
      style={{ position: 'absolute', left: 0, bottom: 0, width: '40%', height: '45%', touchAction: 'none', pointerEvents: 'auto' }}
    >
      {origin ? (
        <div style={{ position: 'fixed', left: origin.x - RADIUS, top: origin.y - RADIUS, width: RADIUS * 2, height: RADIUS * 2, borderRadius: '50%', background: 'rgba(20,22,30,0.45)', border: '2px solid rgba(255,255,255,0.25)' }}>
          <div style={{ position: 'absolute', left: RADIUS - 17 + knob.x * RADIUS * 0.7, top: RADIUS - 17 + knob.y * RADIUS * 0.7, width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.65)' }} />
        </div>
      ) : (
        <div style={{ position: 'absolute', left: 32, bottom: 32, width: 72, height: 72, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.2)' }} />
      )}
    </div>
  );
}

function Btn({ label, code, act, size = 52, style, until = 0 }) {
  const real = act ? getKey(act) : code;
  const [, setTick] = useState(0);
  const remaining = until - Date.now();
  useEffect(() => {
    if (until <= Date.now()) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [until]);
  const cooling = remaining > 0;
  return (
    <button
      type="button"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); press(real, true); }}
      onPointerUp={() => press(real, false)}
      onPointerCancel={() => press(real, false)}
      style={{ width: size, height: size, borderRadius: '50%', background: cooling ? 'rgba(20,22,30,0.35)' : 'rgba(20,22,30,0.7)', color: cooling ? 'rgba(255,255,255,0.45)' : '#fff', border: '2px solid rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700, touchAction: 'none', pointerEvents: 'auto', userSelect: 'none', WebkitUserSelect: 'none', ...style }}
    >
      {cooling ? Math.ceil(remaining / 1000) : label}
    </button>
  );
}

export default function TouchControls({ lobby, ghost, onReveal, ghostUsed, isAsymRole, cardCooldowns = {}, skillCooldowns = {}, onInteract }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(window.matchMedia('(pointer: coarse)').matches);
  }, []);
  if (!show) return null;
  if (lobby) {
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
        <Stick />
        <div style={{ position: 'absolute', right: 20, bottom: 24, display: 'flex', gap: 10 }}>
          <Btn label="Lento" act="slow" size={56} style={{ fontSize: 12 }} />
          <Btn label="Salto" act="jump" size={64} style={{ fontSize: 13 }} />
        </div>
      </div>
    );
  }
  if (ghost) {
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
        <Stick />
        <button
          type="button"
          disabled={ghostUsed}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => { e.preventDefault(); onReveal && onReveal(); }}
          style={{ position: 'absolute', right: 20, bottom: 70, width: 72, height: 72, borderRadius: '50%', background: ghostUsed ? 'rgba(80,80,90,0.6)' : 'rgba(150,120,255,0.8)', color: '#fff', border: '2px solid rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700, touchAction: 'none', pointerEvents: 'auto' }}
        >
          Aparecer
        </button>
      </div>
    );
  }
  const skills = [['skill1'], ['skill2'], ['skill3'], ['skill4'], ['melee']];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      <Stick />
      <div style={{ position: 'absolute', right: 20, bottom: 24, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAsymRole
            ? skills.map(([act], i) => <Btn key={act} label={keyLabel(getKey(act))} act={act} size={48} until={skillCooldowns[i === 4 ? 'melee' : i] || 0} />)
            : [['card1', 0], ['card2', 1], ['minigame', -1]].map(([act, slot]) => <Btn key={act} label={keyLabel(getKey(act))} act={act} until={slot >= 0 ? cardCooldowns[slot] || 0 : 0} />)}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => { e.preventDefault(); onInteract && onInteract(); }}
            style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(84,104,255,0.75)', color: '#fff', border: '2px solid rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 700, touchAction: 'none', pointerEvents: 'auto', userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            {isAsymRole ? 'Curar' : 'Usar'}
          </button>
          <Btn label="Lento" act="slow" size={56} style={{ fontSize: 12 }} />
          <Btn label="Salto" act="jump" size={64} style={{ fontSize: 13 }} />
        </div>
      </div>
    </div>
  );
}
