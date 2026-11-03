'use client';

import { useState } from 'react';
import { listCommunitySkills, publishCommunitySkill, deleteCommunitySkill } from '../lib/community';

const PATIENT_KINDS = [['strike', 'Golpe corto'], ['burst', 'Golpe en área'], ['sprint', 'Impulso'], ['projectile', 'Esfera cargada (Astral Claw)'], ['invisible', 'Invisibilidad (Paraguayizador)']];
const HEALER_KINDS = [['pulse', 'Pulso (cura)'], ['stun', 'Aturdir'], ['pull', 'Atraer'], ['boost', 'Potenciar curas'], ['purge', 'Purgar']];

const PATIENT_PARAMS = {
  common: [['cooldownSec', 'Recarga (s)', 1, 300, 1]],
  strike: [['windowMs', 'Ventana del golpe (ms)', 100, 1500, 20], ['reach', 'Alcance', 0, 15, 0.1], ['radius', 'Tamaño de la caja', 0.3, 20, 0.1]],
  burst: [['radius', 'Radio del área', 0.3, 20, 0.1]],
  hit: [['stunSec', 'Aturdimiento al Healer (s)', 0, 30, 0.1], ['ragdollSec', 'Derribo (s)', 0, 30, 0.1], ['slowSec', 'Ralentización (s)', 0, 60, 0.5], ['slowLevel', 'Nivel de ralentización', 1, 3, 1], ['revealHealerSec', 'Revela al Healer (s)', 0, 60, 1], ['knockback', 'Empuje', 0, 40, 0.5], ['hpLoss', 'Daño al Healer (HP)', 0, 1000, 1], ['endlagSec', 'Endlag extra (s)', 0, 10, 0.1]],
  sprint: [['factor', 'Velocidad (x)', 1, 10, 0.05], ['durationSec', 'Dura (s)', 0.5, 90, 0.5], ['hpCost', 'Coste de HP', 0, 100, 1]],
  projectile: [['chargeSec', 'Tiempo de carga al 100% (s)', 0.5, 30, 0.5], ['holdSec', 'Endlag al empuñarla (s)', 0, 30, 0.5], ['fireDelaySec', 'Espera tras la carga para lanzar (s)', 0, 30, 0.5], ['throwEndlagSec', 'Endlag al lanzar (s)', 0, 10, 0.1], ['projSpeed', 'Velocidad de la esfera', 2, 80, 1], ['projRadius', 'Tamaño de la esfera', 0.2, 3, 0.1], ['flySec', 'Vuelo máximo (s)', 1, 30, 0.5]],
  invisible: [['startSec', 'Endlag al empezar (s)', 0, 10, 0.1], ['durationSec', 'Dura invisible (s)', 0.5, 90, 0.5]],
};
const KIND_PRESETS = {
  projectile: { cooldownSec: 70, stunSec: 4 },
  invisible: { cooldownSec: 40, durationSec: 8, stunSec: 0 },
  strike: { cooldownSec: 30, stunSec: 1.5, durationSec: 3 },
  burst: { cooldownSec: 30, stunSec: 1.5, durationSec: 3 },
  sprint: { cooldownSec: 30, stunSec: 0, durationSec: 3 },
};

const HEALER_PARAMS = {
  common: [['cooldownSec', 'Recarga (s)', 1, 300, 1]],
  pulse: [['radius', 'Radio', 0.5, 60, 0.5], ['cureAmount', 'Cura por Paciente', 0, 500, 1], ['revealSec', 'Revela (s)', 0, 120, 1], ['selfHeal', 'Te curas por Paciente', 0, 1000, 1], ['stunSec', 'Aturde (s)', 0, 30, 0.1], ['slowSec', 'Ralentiza (s)', 0, 60, 0.5], ['slowLevel', 'Nivel de ralentización', 1, 3, 1]],
  stun: [['radius', 'Radio', 0.5, 60, 0.5], ['durationSec', 'Aturde (s)', 0.5, 30, 0.5], ['windowMs', 'Ventana (ms)', 100, 1500, 20]],
  pull: [['radius', 'Radio', 0.5, 60, 0.5], ['strength', 'Fuerza', 0.5, 40, 0.5], ['windowMs', 'Ventana (ms)', 100, 1500, 20]],
  boost: [['factor', 'Multiplicador (x)', 1, 12, 0.1], ['durationSec', 'Dura (s)', 0.5, 90, 0.5], ['selfHeal', 'Te curas (HP)', 0, 1000, 1]],
  purge: [['radius', 'Radio', 0.5, 60, 0.5], ['flojeraDrain', 'Baja flojera', 0, 500, 1], ['stunSec', 'Aturde (s)', 0, 30, 0.1], ['slowSec', 'Ralentiza (s)', 0, 60, 0.5], ['slowLevel', 'Nivel de ralentización', 1, 3, 1]],
};

const DEFAULTS_PATIENT = { chargeSec: 4, holdSec: 5, fireDelaySec: 7, throwEndlagSec: 1.8, projSpeed: 20, projRadius: 0.8, flySec: 7, startSec: 0.9, kind: 'strike', cooldownSec: 30, windowMs: 380, reach: 1.2, radius: 0.85, stunSec: 1.5, ragdollSec: 0, slowSec: 0, slowLevel: 2, revealHealerSec: 0, knockback: 0, hpLoss: 0, factor: 1.4, durationSec: 3, hpCost: 0, endlagSec: 0 };
const DEFAULTS_HEALER = { kind: 'pulse', cooldownSec: 30, windowMs: 700, radius: 6, cureAmount: 8, revealSec: 0, selfHeal: 0, durationSec: 3, strength: 4, factor: 2, flojeraDrain: 30, stunSec: 0, slowSec: 0, slowLevel: 2 };

const FX_WHEN = [['use', 'Al usarla'], ['hit', 'Si acierta'], ['miss', 'Si falla']];
const FX_TYPES = [['stun', 'Aturdir'], ['ragdoll', 'Derribar'], ['slow', 'Ralentizar'], ['endlag', 'Endlag'], ['reveal', 'Revelar'], ['hp', 'HP (+cura / −daño)'], ['flojera', 'Flojera (+/−)'], ['speed', 'Velocidad'], ['exacerbacion', 'Exacerbación'], ['pereza', 'Pereza'], ['acetilcolina', 'Acetilcolina'], ['fatiga', 'Fatiga'], ['impulso', 'Impulso'], ['respiro', 'Respiro'], ['ayuno', 'Ayuno'], ['paraguayizador', 'Paraguayizador (invisible)']];
const LEVEL_TYPES = ['slow', 'endlag', 'exacerbacion', 'pereza', 'impulso'];
const NO_TIME = ['hp', 'flojera'];
const NEW_FX = { when: 'hit', target: 'enemy', type: 'stun', amount: 10, durationSec: 2, level: 2 };

function FxList({ side, s, upd }) {
  const list = s.fx || [];
  const set = (i, patch) => upd({ fx: list.map((f, k) => (k === i ? { ...f, ...patch } : f)) });
  const targets = side === 'healer' ? [['self', 'Yo'], ['enemy', 'Pacientes']] : [['self', 'Yo'], ['enemy', 'Curador'], ['allies', 'Aliados']];
  return (
    <div style={{ marginTop: 6, borderTop: '1px dashed #3d4a42', paddingTop: 4 }}>
      <p style={style.line}>Efectos extra ({list.length}/8)</p>
      {list.map((f, i) => (
        <div key={i} style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4, fontSize: 11 }}>
          <select value={f.when} onChange={(ev) => set(i, { when: ev.target.value })}>{FX_WHEN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={f.target} onChange={(ev) => set(i, { target: ev.target.value })}>{targets.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={f.type} onChange={(ev) => set(i, { type: ev.target.value })}>{FX_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {['hp', 'flojera'].includes(f.type) && <input type="number" value={f.amount} min={-500} max={500} onChange={(ev) => set(i, { amount: parseFloat(ev.target.value) || 0 })} style={{ width: 56 }} />}
          {f.type === 'speed' && <input type="number" value={f.amount} min={1} max={10} step={0.1} title="Multiplicador" onChange={(ev) => set(i, { amount: parseFloat(ev.target.value) || 1 })} style={{ width: 50 }} />}
          {!NO_TIME.includes(f.type) && <input type="number" value={f.durationSec} min={0} max={60} step={0.5} title="Segundos" onChange={(ev) => set(i, { durationSec: parseFloat(ev.target.value) || 0 })} style={{ width: 50 }} />}
          {LEVEL_TYPES.includes(f.type) && <input type="number" value={f.level} min={1} max={3} title="Nivel" onChange={(ev) => set(i, { level: Math.max(1, Math.min(3, parseInt(ev.target.value, 10) || 1)) })} style={{ width: 36 }} />}
          <button style={{ fontSize: 11 }} onClick={() => upd({ fx: list.filter((_, k) => k !== i) })}>✕</button>
        </div>
      ))}
      <button disabled={list.length >= 8} style={{ fontSize: 11 }} onClick={() => upd({ fx: [...list, { ...NEW_FX }] })}>+ Efecto</button>
    </div>
  );
}

function paramsFor(side, s) {
  const spec = side === 'healer' ? HEALER_PARAMS : PATIENT_PARAMS;
  const list = [...spec.common, ...(spec[s.kind] || [])];
  if (side === 'patient' && ['strike', 'burst', 'projectile'].includes(s.kind)) list.push(...spec.hit);
  return list;
}

function SideEditor({ side, list, setList, max, library }) {
  const kinds = side === 'healer' ? HEALER_KINDS : PATIENT_KINDS;
  const defaults = side === 'healer' ? DEFAULTS_HEALER : DEFAULTS_PATIENT;
  const [msg, setMsg] = useState('');
  const [lib, setLib] = useState(null);
  const label = side === 'healer' ? 'Healer' : 'Pacientes';

  function add(base) {
    setList((prev) => (prev.length >= max ? prev : [...prev, { ...defaults, ...base, id: `sk_${Date.now().toString(36)}${prev.length}`, name: (base && base.name) || `Skill ${prev.length + 1}` }]));
  }

  async function openLibrary() {
    setMsg('');
    try {
      const r = await listCommunitySkills(side);
      setLib(r.skills);
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function publish(s) {
    try {
      await publishCommunitySkill(side, s);
      setMsg('Publicada en la biblioteca.');
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function removeFromLibrary(id) {
    try {
      await deleteCommunitySkill(id);
      setLib((l) => l.filter((x) => x.id !== id));
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <p style={style.line}>Skills para {label}: {list.length}/{max}{side === 'healer' ? ' (reemplazan las ranuras 1, 2, 3, 4 del Healer en este mapa)' : ' (aparecen como opciones de carta en este mapa)'}</p>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <button disabled={list.length >= max} onClick={() => add()}>+ Skill</button>
        <button onClick={() => (lib ? setLib(null) : openLibrary())}>{lib ? 'Cerrar biblioteca' : 'Biblioteca'}</button>
      </div>
      {msg && <p style={{ ...style.line, color: '#f2d154' }}>{msg}</p>}
      {lib && (
        <div style={{ marginTop: 4, maxHeight: 160, overflowY: 'auto', border: '1px solid #3d4a42', borderRadius: 6, padding: 4 }}>
          {lib.length === 0 && <p style={style.line}>Todavía no hay skills publicadas.</p>}
          {lib.map((x) => (
            <div key={x.id} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
              <span style={{ flex: 1, minWidth: 0 }}>{x.name} · {x.author}</span>
              <button disabled={list.length >= max} onClick={() => add({ ...x.skill, name: x.name })}>Usar</button>
              {x.mine && <button onClick={() => removeFromLibrary(x.id)}>✕</button>}
            </div>
          ))}
        </div>
      )}
      {list.map((s, idx) => {
        const upd = (patch) => setList((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
        return (
          <div key={s.id} style={{ marginTop: 6, padding: 6, border: '1px solid #3d4a42', borderRadius: 6 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input value={s.name} maxLength={28} onChange={(ev) => upd({ name: ev.target.value })} style={{ flex: 1, minWidth: 0 }} />
              <select value={s.kind} onChange={(ev) => upd({ kind: ev.target.value, ...(side === 'patient' ? KIND_PRESETS[ev.target.value] : {}) })}>
                {kinds.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button style={{ fontSize: 11 }} title="Publicar en la biblioteca" onClick={() => publish(s)}>⇪</button>
              <button style={{ fontSize: 11 }} onClick={() => setList((prev) => prev.filter((_, i) => i !== idx))}>✕</button>
            </div>
            {paramsFor(side, s).map(([key, text, min, max2, step]) => (
              <label key={key} style={style.line}>{text}: {s[key] ?? defaults[key]}
                <input type="range" min={min} max={max2} step={step} value={s[key] ?? defaults[key]} onChange={(ev) => upd({ [key]: parseFloat(ev.target.value) })} style={{ width: '100%' }} />
              </label>
            ))}
            <FxList side={side} s={s} upd={upd} />
          </div>
        );
      })}
    </div>
  );
}

const style = { line: { fontSize: 12, color: '#c9cbd8', margin: '4px 0', display: 'block' } };

export default function SkillsEditor({ skills, setSkills, healerSkills, setHealerSkills }) {
  return (
    <div>
      <p style={{ ...style.line, fontWeight: 700 }}>Skills personalizadas (sin límite de poder: son partidas custom y no dan Desgracias)</p>
      <SideEditor side="patient" list={skills} setList={setSkills} max={12} />
      <SideEditor side="healer" list={healerSkills} setList={setHealerSkills} max={4} />
    </div>
  );
}
