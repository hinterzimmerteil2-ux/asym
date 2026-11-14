'use client';
import { useEffect, useState } from 'react';
import KeybindsEditor from './KeybindsEditor';
import { useSettings, setSettings, gfx } from '../lib/settings';
import { resetKeys } from '../lib/keybinds';

const PRESETS = [
  [0.025, 'Mínimo++'],
  [0.05, 'Mínimo+'],
  [0.1, 'Mínimo'],
  [0.5, 'Bajo'],
  [1, 'Medio'],
  [2, 'Alto'],
  [4, 'Ultra'],
];

function describe(q) {
  const g = gfx(q);
  const lines = [];
  lines.push(`Resolución de dibujo: ${Math.round(g.dpr * 100)}%`);
  lines.push(g.antialias ? 'Bordes suavizados: sí' : 'Bordes suavizados: no');
  lines.push(g.textures ? `Texturas: sí (filtrado ${g.aniso}x)` : 'Texturas: no (colores planos)');
  lines.push(g.decor === 'none' ? 'Decoración del hospital: apagada' : g.decor === 'light' ? 'Decoración del hospital: solo paredes' : 'Decoración del hospital: completa (vigas, escombros, polvo)');
  lines.push(`Polígonos: ${Math.round(g.poly * 100)}%`);
  lines.push(g.lights ? 'Luces dinámicas: sí' : 'Luces dinámicas: no');
  lines.push(g.stars ? 'Cielo con estrellas y luna: sí' : 'Cielo con estrellas y luna: no');
  if (g.dust) lines.push(`Partículas de polvo: ${g.dust}`);
  return lines;
}

async function goFullscreen() {
  try { await document.documentElement.requestFullscreen(); } catch {}
  try { await screen.orientation.lock('landscape'); } catch {}
}

export default function SettingsPanel({ onClose, lang, onLang, langs = [] }) {
  const s = useSettings();
  const [local, setLocal] = useState(s.quality);
  useEffect(() => setLocal(s.quality), [s.quality]);
  const q = Math.round(local * 20) / 20;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Ajustes</h2>
          <button type="button" onClick={onClose} style={styles.close}>×</button>
        </div>

        <h3 style={styles.section}>Gráficos</h3>
        <div style={styles.card}>
          <div style={styles.rowTop}>
            <span>Calidad gráfica</span>
            <strong style={{ color: '#f2d154' }}>{q.toFixed(2)}</strong>
          </div>
          <input
            type="range"
            min="0.025"
            max="4"
            step="0.025"
            value={local}
            onChange={(e) => setLocal(parseFloat(e.target.value))}
            onPointerUp={() => setSettings({ quality: q })}
            onKeyUp={() => setSettings({ quality: q })}
            onTouchEnd={() => setSettings({ quality: q })}
            style={{ width: '100%' }}
          />
          <div style={styles.presets}>
            {PRESETS.map(([v, label]) => (
              <button key={v} type="button" onClick={() => { setLocal(v); setSettings({ quality: v }); }} style={styles.preset(Math.abs(v - s.quality) < 0.02)}>
                {label} ({v})
              </button>
            ))}
          </div>
          <ul style={styles.list}>
            {describe(q).map((l) => <li key={l}>{l}</li>)}
          </ul>
          <p style={styles.hint}>0.025 es el nivel más bajo: sacrifica casi todo lo visual para ganar rendimiento. Si tu equipo va lento, baja este valor.</p>
          <label style={styles.check}>
            <input type="checkbox" checked={s.auto} onChange={(e) => setSettings({ auto: e.target.checked })} />
            Calidad automática (baja sola si los FPS caen)
          </label>
          <label style={styles.check}>
            <input type="checkbox" checked={s.fps} onChange={(e) => setSettings({ fps: e.target.checked })} />
            Mostrar FPS
          </label>
        </div>

        {langs.length > 0 && (
          <>
            <h3 style={styles.section}>Idioma</h3>
            <div style={{ ...styles.card, display: 'flex', flexWrap: 'wrap', gap: 6 }} translate="no">
              {langs.map((l) => (
                <button key={l} type="button" onClick={() => onLang(l)} style={styles.preset(lang === l)}>{l === 'en-GB' ? 'English' : l === 'de' ? 'Deutsch' : l === 'pie' ? 'PIE' : l === 'skb' ? 'SKB' : 'Español'}</button>
              ))}
            </div>
          </>
        )}

        <h3 style={styles.section}>Pantalla</h3>
        <div style={styles.card}>
          <button type="button" onClick={goFullscreen} style={styles.reset}>Pantalla completa (horizontal)</button>
          <p style={styles.hint}>Recomendado en móvil: oculta las barras del navegador y fija la pantalla en horizontal.</p>
        </div>

        <h3 style={styles.section}>Sonido</h3>
        <div style={styles.card}>
          <div style={styles.rowTop}><span>Volumen de sonidos</span><span>{Math.round((s.sfx ?? 0.6) * 100)}%</span></div>
          <input type="range" min="0" max="1" step="0.05" value={s.sfx ?? 0.6} onChange={(e) => setSettings({ sfx: parseFloat(e.target.value) })} style={{ width: '100%' }} />
          <p style={styles.hint}>Pasos, lanzas clavadas y curas se oyen según la distancia y el piso. A 0% se silencian.</p>
        </div>

        <h3 style={styles.section}>Modo de teclas</h3>
        <div style={styles.card}>
          {[['shiftMode', 'Shiftlock'], ['slowMode', 'Paso lento']].map(([key, label]) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <div style={styles.rowTop}><span>{label}</span></div>
              <div style={styles.presets}>
                {[['toggle', 'Alternar'], ['hold', 'Mantener'], ['mixed', 'Mixto']].map(([v, name]) => (
                  <button key={v} type="button" onClick={() => setSettings({ [key]: v })} style={styles.preset(s[key] === v)}>{name}</button>
                ))}
              </div>
            </div>
          ))}
          <p style={styles.hint}>Alternar: pulsas para activar y vuelves a pulsar para desactivar. Mantener: activo solo mientras lo pulsas. Mixto: un toque rápido alterna y mantenerlo funciona como pulsar.</p>
        </div>

        <h3 style={styles.section}>Controles (haz clic y pulsa la nueva tecla)</h3>
        <KeybindsEditor />
        <button type="button" onClick={resetKeys} style={styles.reset}>Restablecer teclas</button>

        <p style={styles.hint}>El idioma se cambia con los botones es / en / de de arriba a la derecha.</p>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, background: 'rgba(10, 11, 16, 0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  panel: { width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto', background: '#1a1215', border: '1px solid #3d2c33', borderRadius: 12, padding: '16px 20px 20px', color: '#e8e9f0' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { margin: 0, fontSize: 20 },
  close: { background: 'none', border: 'none', color: '#a8959a', fontSize: 26, cursor: 'pointer', lineHeight: 1 },
  section: { margin: '18px 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, color: '#a8959a' },
  card: { background: '#181a24', border: '1px solid #3d2c33', borderRadius: 10, padding: 12 },
  rowTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 },
  presets: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  preset: (on) => ({ background: on ? '#d94a52' : '#242738', color: '#e8e9f0', border: '1px solid #3a3d52', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }),
  list: { margin: '10px 0 0', paddingLeft: 18, fontSize: 12, color: '#b9bbcc', lineHeight: 1.6 },
  hint: { fontSize: 12, color: '#a8959a', margin: '8px 0 0' },
  check: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13 },
  reset: { marginTop: 8, background: '#242738', color: '#e8e9f0', border: '1px solid #3a3d52', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
};
