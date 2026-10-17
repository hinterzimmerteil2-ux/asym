'use client';

import { useEffect, useRef, useState } from 'react';

function press(code, down) {
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
}

function Stick() {
  const base = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(new Set());
  const pointer = useRef(null);

  function apply(dx, dy) {
    const want = new Set();
    if (dy < -0.35) want.add('KeyW');
    if (dy > 0.35) want.add('KeyS');
    if (dx < -0.35) want.add('KeyA');
    if (dx > 0.35) want.add('KeyD');
    for (const code of active.current) if (!want.has(code)) press(code, false);
    for (const code of want) if (!active.current.has(code)) press(code, true);
    active.current = want;
  }
  function move(e) {
    const rect = base.current.getBoundingClientRect();
    const r = rect.width / 2;
    let dx = (e.clientX - (rect.left + r)) / r;
    let dy = (e.clientY - (rect.top + r)) / r;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    setKnob({ x: dx, y: dy });
    apply(dx, dy);
  }
  function end() {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    apply(0, 0);
  }
  return (
    <div
      ref={base}
      onPointerDown={(e) => { pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={(e) => { if (pointer.current === e.pointerId) move(e); }}
      onPointerUp={end}
      onPointerCancel={end}
      style={{ position: 'absolute', left: 24, bottom: 28, width: 128, height: 128, borderRadius: '50%', background: 'rgba(20,22,30,0.55)', border: '2px solid rgba(255,255,255,0.25)', touchAction: 'none', pointerEvents: 'auto' }}
    >
      <div style={{ position: 'absolute', left: 44 + knob.x * 40, top: 44 + knob.y * 40, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
    </div>
  );
}

function Btn({ label, code, size = 52, style }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); press(code, true); }}
      onPointerUp={() => press(code, false)}
      onPointerCancel={() => press(code, false)}
      style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(20,22,30,0.65)', color: '#fff', border: '2px solid rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700, touchAction: 'none', pointerEvents: 'auto', userSelect: 'none', WebkitUserSelect: 'none', ...style }}
    >
      {label}
    </button>
  );
}

export default function TouchControls({ isAsymRole }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(window.matchMedia('(pointer: coarse)').matches);
  }, []);
  if (!show) return null;
  const skills = [['Q', 'KeyQ'], ['E', 'KeyE'], ['R', 'KeyR'], ['F', 'KeyF'], ['G', 'KeyG']];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      <Stick />
      <div style={{ position: 'absolute', right: 20, bottom: 24, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAsymRole
            ? skills.map(([label, code]) => <Btn key={code} label={label} code={code} size={48} />)
            : [['1', 'Digit1'], ['2', 'Digit2'], ['E', 'KeyE']].map(([label, code]) => <Btn key={code} label={label} code={code} />)}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn label="Lento" code="ShiftLeft" size={56} style={{ fontSize: 12 }} />
          <Btn label="Salto" code="Space" size={64} style={{ fontSize: 13 }} />
        </div>
      </div>
    </div>
  );
}
