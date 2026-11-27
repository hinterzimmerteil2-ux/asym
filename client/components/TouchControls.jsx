'use client';

import { useEffect, useRef, useState } from 'react';
import { getKey, keyLabel } from '../lib/keybinds';
import SkillIcon from './SkillIcon';
import { isBoard, watchMedia, useInputMode } from '../lib/settings';
import { useTouchLayout, useTouchEdit, setTouchPos, commitTouchLayout, resetTouchLayout, setTouchSize, setTouchEdit, TOUCH_SIZE_RANGE } from '../lib/touchLayout';
import { btn } from '../lib/ui';

let BS = 1;

const INSET_R = 'env(safe-area-inset-right, 0px)';
const INSET_B = 'env(safe-area-inset-bottom, 0px)';
const INSET_L = 'env(safe-area-inset-left, 0px)';
const GAP = 10;
const ROW_GAP = 12;

function buzz(ms = 8) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch {}
}

function press(code, down) {
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
}

function flow(rows, wrapW) {
  const out = {};
  let base = 0;
  for (const row of rows) {
    const lines = [];
    let cur = [];
    let curW = 0;
    for (const it of row) {
      const add = (cur.length ? GAP : 0) + it.size;
      if (wrapW && cur.length && curW + add > wrapW) { lines.push(cur); cur = []; curW = 0; }
      curW += (cur.length ? GAP : 0) + it.size;
      cur.push(it);
    }
    if (cur.length) lines.push(cur);
    let y = base;
    for (let li = lines.length - 1; li >= 0; li--) {
      const line = lines[li];
      let r = 0;
      let h = 0;
      for (let k = line.length - 1; k >= 0; k--) {
        out[line[k].id] = { r, b: y };
        r += line[k].size + GAP;
        h = Math.max(h, line[k].size);
      }
      y += h + (li > 0 ? GAP : ROW_GAP);
    }
    base = y;
  }
  return out;
}

function Spot({ id, size, def, custom, edit, boxRef, onDone, orient, children }) {
  const drag = useRef(null);
  const place = custom
    ? { left: `${custom.x * 100}%`, top: `${custom.y * 100}%`, transform: 'translate(-50%, -50%)' }
    : { right: `calc(${INSET_R} + ${16 + def.r}px)`, bottom: `calc(${INSET_B} + ${16 + def.b}px)` };
  function move(e) {
    const d = drag.current;
    if (!d || d.pid !== e.pointerId) return;
    const box = boxRef.current.getBoundingClientRect();
    const mx = size / 2 / box.width;
    const my = size / 2 / box.height;
    const x = Math.max(mx, Math.min(1 - mx, (e.clientX - d.dx - box.left) / box.width));
    const y = Math.max(my, Math.min(1 - my, (e.clientY - d.dy - box.top) / box.height));
    setTouchPos(orient, id, x, y);
  }
  function end(e) {
    const d = drag.current;
    if (!d || d.pid !== e.pointerId) return;
    drag.current = null;
    commitTouchLayout();
    onDone && onDone();
  }
  return (
    <div data-tc={id} style={{ position: 'absolute', width: size, height: size, pointerEvents: 'none', ...place }}>
      {children}
      {edit && (
        <div
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            const r = e.currentTarget.getBoundingClientRect();
            drag.current = { pid: e.pointerId, dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2) };
          }}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px dashed rgba(255,214,102,0.95)', background: 'rgba(255,214,102,0.12)', touchAction: 'none', pointerEvents: 'auto', cursor: 'grab', zIndex: 3 }}
        />
      )}
    </div>
  );
}

function Stick({ pos, dims, edit, boxRef, orient }) {
  const [origin, setOrigin] = useState(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(new Set());
  const pointer = useRef(null);
  const RADIUS = 56 * BS;
  const homeSize = 96 * BS;
  const zoneW = dims.w * 0.42;
  const zoneH = dims.h * (BS > 1 ? 0.7 : 0.55);
  const custom = pos.custom;
  const zone = custom
    ? { left: Math.max(0, Math.min(dims.w - zoneW, custom.x * dims.w - zoneW / 2)), top: Math.max(0, Math.min(dims.h - zoneH, custom.y * dims.h - zoneH / 2)) }
    : { left: 0, top: dims.h - zoneH };

  function apply(dx, dy) {
    const want = new Set();
    if (dy < -0.3) want.add(getKey('forward'));
    if (dy > 0.3) want.add(getKey('back'));
    if (dx < -0.3) want.add(getKey('left'));
    if (dx > 0.3) want.add(getKey('right'));
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
    <>
      {!edit && (
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
          style={{ position: 'absolute', left: zone.left, top: zone.top, width: zoneW, height: zoneH, touchAction: 'none', pointerEvents: 'auto' }}
        >
          {origin && (
            <div style={{ position: 'fixed', left: origin.x - RADIUS, top: origin.y - RADIUS, width: RADIUS * 2, height: RADIUS * 2, borderRadius: '50%', background: 'rgba(20,22,30,0.45)', border: '2px solid rgba(255,255,255,0.25)' }}>
              <div style={{ position: 'absolute', left: RADIUS - 22 * BS + knob.x * RADIUS * 0.7, top: RADIUS - 22 * BS + knob.y * RADIUS * 0.7, width: 44 * BS, height: 44 * BS, borderRadius: '50%', background: 'rgba(255,255,255,0.65)' }} />
            </div>
          )}
        </div>
      )}
      {(edit || !origin) && (
        <StickHome size={homeSize} custom={custom} edit={edit} boxRef={boxRef} orient={orient} />
      )}
    </>
  );
}

function StickHome({ size, custom, edit, boxRef, orient }) {
  const drag = useRef(null);
  const place = custom
    ? { left: `${custom.x * 100}%`, top: `${custom.y * 100}%`, transform: 'translate(-50%, -50%)' }
    : { left: `calc(${INSET_L} + 16px)`, bottom: `calc(${INSET_B} + 16px)` };
  function move(e) {
    const d = drag.current;
    if (!d || d.pid !== e.pointerId) return;
    const box = boxRef.current.getBoundingClientRect();
    const mx = size / 2 / box.width;
    const my = size / 2 / box.height;
    setTouchPos(orient, 'stick', Math.max(mx, Math.min(1 - mx, (e.clientX - d.dx - box.left) / box.width)), Math.max(my, Math.min(1 - my, (e.clientY - d.dy - box.top) / box.height)));
  }
  function end(e) {
    const d = drag.current;
    if (!d || d.pid !== e.pointerId) return;
    drag.current = null;
    commitTouchLayout();
  }
  return (
    <div data-tc="stick" style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.28)', background: 'rgba(20,22,30,0.18)', pointerEvents: 'none', ...place }}>
      {edit && (
        <div
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            const r = e.currentTarget.getBoundingClientRect();
            drag.current = { pid: e.pointerId, dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2) };
          }}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px dashed rgba(255,214,102,0.95)', background: 'rgba(255,214,102,0.12)', touchAction: 'none', pointerEvents: 'auto', cursor: 'grab', zIndex: 3 }}
        />
      )}
    </div>
  );
}

function Btn({ label, code, act, size, style, until = 0, icon, tint, onTap }) {
  const real = act ? getKey(act) : code;
  const [, setTick] = useState(0);
  const remaining = until - Date.now();
  useEffect(() => {
    if (until <= Date.now()) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [until]);
  const cooling = remaining > 0;
  const down = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    buzz();
    if (onTap) onTap(); else press(real, true);
  };
  const up = () => { if (!onTap) press(real, false); };
  return (
    <button
      type="button"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      style={{ width: size, height: size, borderRadius: '50%', background: tint || (cooling ? 'rgba(20,22,30,0.35)' : 'rgba(20,22,30,0.7)'), color: cooling ? 'rgba(255,255,255,0.45)' : '#fff', border: '2px solid rgba(255,255,255,0.3)', fontWeight: 700, touchAction: 'none', pointerEvents: 'auto', userSelect: 'none', WebkitUserSelect: 'none', padding: 0, ...style, fontSize: (style?.fontSize || 15) * BS }}
    >
      {cooling ? Math.ceil(remaining / 1000) : icon ? <SkillIcon id={icon} size={Math.round(size * 0.62)} /> : label}
    </button>
  );
}

function EditBar({ orient, lay, onExit, portrait }) {
  const [lo, hi] = TOUCH_SIZE_RANGE;
  return (
    <div data-tc-edit="1" style={{ position: 'absolute', top: `calc(env(safe-area-inset-top, 0px) + ${portrait ? 100 : 50}px)`, left: 8, width: 'min(340px, calc(46% - 8px))', minWidth: 230, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', borderRadius: 12, background: 'rgba(14,16,24,0.92)', border: '1px solid rgba(255,214,102,0.6)', color: '#fff', fontSize: 12, pointerEvents: 'auto', zIndex: 5 }}>
      <strong style={{ fontSize: 13 }}>Editar botones</strong>
      <span style={{ opacity: 0.8, lineHeight: 1.3 }}>Arrastra cada botón a donde te quede cómodo.</span>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        Tamaño
        <input type="range" min={lo} max={hi} step="0.05" value={lay.size} onChange={(e) => setTouchSize(parseFloat(e.target.value))} style={{ flex: 1, minWidth: 0 }} />
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => resetTouchLayout(orient)} style={{ ...btn.secondary(false), flex: 1, padding: '6px 8px', fontSize: 12 }}>Restablecer</button>
        <button type="button" onClick={onExit} style={{ ...btn.secondary(true), flex: 1, padding: '6px 8px', fontSize: 12 }}>Listo</button>
      </div>
    </div>
  );
}

export default function TouchControls({ lobby, ghost, onReveal, ghostUsed, isAsymRole, cardCooldowns = {}, skillCooldowns = {}, onInteract, cardIds = [], skillIds = [], getCarry, supIcons = null, canLayer = false, cardLayer = false, onLayer }) {
  const { touch: show } = useInputMode();
  const lay = useTouchLayout();
  const edit = useTouchEdit();
  BS = (isBoard() ? 1.8 : 1) * lay.size;
  const [portrait, setPortrait] = useState(false);
  const [carrying, setCarrying] = useState(false);
  const [dims, setDims] = useState({ w: 800, h: 400 });
  const boxRef = useRef(null);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const on = () => setPortrait(mq.matches);
    on();
    return watchMedia(mq, on);
  }, []);
  useEffect(() => {
    const on = () => {
      const r = boxRef.current && boxRef.current.getBoundingClientRect();
      setDims(r && r.width && r.height ? { w: r.width, h: r.height } : { w: window.innerWidth, h: window.innerHeight });
    };
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [show, portrait]);
  useEffect(() => {
    if (!getCarry) return undefined;
    const id = setInterval(() => setCarrying(Boolean(getCarry())), 200);
    return () => clearInterval(id);
  }, [getCarry]);
  useEffect(() => () => setTouchEdit(false), []);
  if (!show) return null;

  const orient = portrait ? 'port' : 'land';
  const saved = lay[orient];
  const sz = Math.round((portrait ? 50 : 54) * BS);
  const cardSz = sz + Math.round(6 * BS);
  const add = (id, size, node) => ({ id, size, node });

  const skillNodes = ['skill1', 'skill2', 'skill3', 'skill4', ...['skill5', 'skill6', 'skill7', 'skill8'].slice(0, Math.max(0, skillIds.length - 4)), 'melee'].map((act, i) => add(act, sz, <Btn label={act === 'melee' ? 'Golpe' : keyLabel(getKey(act))} icon={act === 'melee' ? 'golpe_aturdidor' : skillIds[i]} act={act} size={sz} style={{ fontSize: 12 }} until={skillCooldowns[act === 'melee' ? 'melee' : i] || 0} />));
  const supNodes = (supIcons || []).map((ic, i) => add('sup' + (i + 1), cardSz, <Btn label={keyLabel(getKey('sup' + (i + 1)))} icon={ic} act={'sup' + (i + 1)} size={cardSz} style={{ fontSize: 12 }} />));
  const cardNodes = Array.from({ length: Math.max(2, Math.min(10, cardIds.length)) }, (_, n) => ['card' + (n + 1), n])
    .filter(([, n]) => !String(cardIds[n] || '').startsWith('super_'))
    .map(([act, slot]) => add(act, cardSz, <Btn label={keyLabel(getKey(act))} icon={cardIds[slot]} act={act} size={cardSz} style={{ fontSize: 12 }} until={cardCooldowns[slot] || 0} />));
  const carryNode = add('carry', sz + Math.round(2 * BS), <Btn label={carrying ? 'Soltar' : 'Módulo'} act={carrying ? 'dropmod' : 'carry'} size={sz + Math.round(2 * BS)} style={{ fontSize: 11 }} tint={carrying ? 'rgba(242,161,84,0.8)' : undefined} />);
  const layerSz = Math.round(46 * BS);
  const layerNode = add('layer', layerSz, <Btn label={cardLayer ? 'Cartas' : 'Súper'} size={layerSz} style={{ fontSize: 10 }} tint="rgba(120,90,200,0.8)" onTap={onLayer} />);
  const useSz = Math.round(72 * BS);
  const useNode = add('use', useSz, <Btn label={isAsymRole ? 'Curar' : 'Usar'} size={useSz} style={{ fontSize: 13 }} tint="rgba(84,104,255,0.75)" onTap={() => onInteract && onInteract()} />);
  const jumpSz = Math.round((portrait ? 50 : 60) * BS);
  const jumpNode = add('jump', jumpSz, <Btn label="Salto" act="jump" size={jumpSz} style={{ fontSize: portrait ? 11 : 12 }} />);
  const slowSz = Math.round((portrait ? 84 : lobby ? 76 : 76) * BS);
  const slowNode = add('slow', slowSz, <Btn label="Lento" act="slow" size={slowSz} style={{ fontSize: 14 }} />);
  const emoteSz = Math.round((portrait ? 50 : 48) * BS);
  const emoteNode = add('emote', emoteSz, <Btn label="Emote" act="emote" size={emoteSz} style={{ fontSize: 11 }} />);
  const revealSz = Math.round(84 * BS);
  const revealNode = add('reveal', revealSz, (
    <button
      type="button"
      disabled={ghostUsed}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => { e.preventDefault(); onReveal && onReveal(); }}
      style={{ width: revealSz, height: revealSz, borderRadius: '50%', background: ghostUsed ? 'rgba(80,80,90,0.6)' : 'rgba(150,120,255,0.8)', color: '#fff', border: '2px solid rgba(255,255,255,0.35)', fontSize: 12 * BS, fontWeight: 700, touchAction: 'none', pointerEvents: 'auto', padding: 0 }}
    >
      Aparecer
    </button>
  ));

  let rows;
  if (lobby && edit) {
    const cardsDemo = ['card1', 'card2', 'card3'].map((act) => add(act, cardSz, <Btn label={keyLabel(getKey(act))} act={act} size={cardSz} style={{ fontSize: 12 }} />));
    const supsDemo = ['sup1', 'sup2', 'sup3', 'sup4'].map((act) => add(act, cardSz, <Btn label={keyLabel(getKey(act))} act={act} size={cardSz} style={{ fontSize: 12 }} />));
    const skillsDemo = ['skill1', 'skill2', 'skill3', 'skill4', 'melee'].map((act) => add(act, sz, <Btn label={act === 'melee' ? 'Golpe' : keyLabel(getKey(act))} act={act} size={sz} style={{ fontSize: 12 }} />));
    rows = portrait
      ? [[useNode, slowNode], [layerNode, ...skillsDemo, ...cardsDemo, ...supsDemo, carryNode, jumpNode, emoteNode]]
      : [[useNode, emoteNode, jumpNode, slowNode], skillsDemo, cardsDemo, [layerNode, ...supsDemo, carryNode]];
  } else if (lobby) {
    rows = [[jumpNode, slowNode]];
  } else if (ghost) {
    rows = [[revealNode]];
  } else {
    const actions = isAsymRole ? skillNodes : [...(supIcons ? supNodes : cardNodes), carryNode];
    const withLayer = canLayer && !isAsymRole ? [layerNode, ...actions] : actions;
    rows = portrait ? [[useNode, slowNode], [...withLayer, jumpNode, emoteNode]] : [[useNode, emoteNode, jumpNode, slowNode], withLayer];
  }

  const defs = flow(rows, portrait ? dims.w * 0.52 : dims.w * 0.56);
  const shown = rows.flat();
  const stickPos = { custom: saved.stick };

  return (
    <div ref={boxRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 20 }}>
      <Stick pos={stickPos} dims={dims} edit={edit} boxRef={boxRef} orient={orient} />
      {shown.map((it) => (
        <Spot key={it.id} id={it.id} size={it.size} def={defs[it.id]} custom={saved[it.id]} edit={edit} boxRef={boxRef} orient={orient}>
          {it.node}
        </Spot>
      ))}
      {edit && <EditBar orient={orient} lay={lay} portrait={portrait} onExit={() => setTouchEdit(false)} />}
    </div>
  );
}
