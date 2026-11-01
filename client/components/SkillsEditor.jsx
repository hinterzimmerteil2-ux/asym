'use client';

import { useState } from 'react';
import { listCommunitySkills, publishCommunitySkill, deleteCommunitySkill } from '../lib/community';

const PATIENT_KINDS = [['strike', 'Golpe corto'], ['burst', 'Golpe en área'], ['sprint', 'Impulso']];
const HEALER_KINDS = [['pulse', 'Pulso (cura)'], ['stun', 'Aturdir'], ['pull', 'Atraer'], ['boost', 'Potenciar curas'], ['purge', 'Purgar']];

const PATIENT_PARAMS = {
  common: [['cooldownSec', 'Recarga (s)', 1, 300, 1]],
  strike: [['windowMs', 'Ventana del golpe (ms)', 100, 1500, 20], ['reach', 'Alcance', 0, 15, 0.1], ['radius', 'Tamaño de la caja', 0.3, 20, 0.1]],
  burst: [['radius', 'Radio del área', 0.3, 20, 0.1]],
  hit: [['stunSec', 'Aturdimiento al Healer (s)', 0, 30, 0.1], ['ragdollSec', 'Derribo (s)', 0, 30, 0.1], ['slowSec', 'Ralentización (s)', 0, 60, 0.5], ['slowLevel', 'Nivel de ralentización', 1, 3, 1], ['revealHealerSec', 'Revela al Healer (s)', 0, 60, 1], ['knockback', 'Empuje', 0, 40, 0.5], ['hpLoss', 'Daño al Healer (HP)', 0, 1000, 1], ['endlagSec', 'Endlag extra (s)', 0, 10, 0.1]],
  sprint: [['factor', 'Velocidad (x)', 1, 10, 0.05], ['durationSec', 'Dura (s)', 0.5, 90, 0.5], ['hpCost', 'Coste de HP', 0, 100, 1]],
};

const HEALER_PARAMS = {
  common: [['cooldownSec', 'Recarga (s)', 1, 300, 1]],
  pulse: [['radius', 'Radio', 0.5, 60, 0.5], ['cureAmount', 'Cura por Paciente', 0, 500, 1], ['revealSec', 'Revela (s)', 0, 120, 1], ['selfHeal', 'Te curas por Paciente', 0, 1000, 1], ['stunSec', 'Aturde (s)', 0, 30, 0.1], ['slowSec', 'Ralentiza (s)', 0, 60, 0.5], ['slowLevel', 'Nivel de ralentización', 1, 3, 1]],
  stun: [['radius', 'Radio', 0.5, 60, 0.5], ['durationSec', 'Aturde (s)', 0.5, 30, 0.5], ['windowMs', 'Ventana (ms)', 100, 1500, 20]],
  pull: [['radius', 'Radio', 0.5, 60, 0.5], ['strength', 'Fuerza', 0.5, 40, 0.5], ['windowMs', 'Ventana (ms)', 100, 1500, 20]],
  boost: [['factor', 'Multiplicador (x)', 1, 12, 0.1], ['durationSec', 'Dura (s)', 0.5, 90, 0.5], ['selfHeal', 'Te curas (HP)', 0, 1000, 1]],
  purge: [['radius', 'Radio', 0.5, 60, 0.5], ['flojeraDrain', 'Baja flojera', 0, 500, 1], ['stunSec', 'Aturde (s)', 0, 30, 0.1], ['slowSec', 'Ralentiza (s)', 0, 60, 0.5], ['slowLevel', 'Nivel de ralentización', 1, 3, 1]],
};

const DEFAULTS_PATIENT = { kind: 'strike', cooldownSec: 30, windowMs: 380, reach: 1.2, radius: 0.85, stunSec: 1.5, ragdollSec: 0, slowSec: 0, slowLevel: 2, revealHealerSec: 0, knockback: 0, hpLoss: 0, factor: 1.4, durationSec: 3, hpCost: 0, endlagSec: 0 };
const DEFAULTS_HEALER = { kind: 'pulse', cooldownSec: 30, windowMs: 700, radius: 6, cureAmount: 8, revealSec: 0, selfHeal: 0, durationSec: 3, strength: 4, factor: 2, flojeraDrain: 30, stunSec: 0, slowSec: 0, slowLevel: 2 };

function paramsFor(side, s) {
  const spec = side === 'healer' ? HEALER_PARAMS : PATIENT_PARAMS;
  const list = [...spec.common, ...(spec[s.kind] || [])];
  if (side === 'patient' && s.kind !== 'sprint') list.push(...spec.hit);
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
              <select value={s.kind} onChange={(ev) => upd({ kind: ev.target.value })}>
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
