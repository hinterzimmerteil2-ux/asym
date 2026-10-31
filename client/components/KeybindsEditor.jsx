'use client';
import { useEffect, useState } from 'react';
import { ACTIONS, getBinds, setKey, resetKeys, subscribeKeys, keyLabel } from '../lib/keybinds';

export default function KeybindsEditor() {
  const [binds, setBinds] = useState(getBinds());
  const [waiting, setWaiting] = useState(null);

  useEffect(() => subscribeKeys(() => setBinds(getBinds())), []);

  useEffect(() => {
    if (!waiting) return undefined;
    function onKey(e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code !== 'Escape') setKey(waiting, e.code);
      setWaiting(null);
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [waiting]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 6 }}>
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setWaiting(a.id)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: `1px solid ${waiting === a.id ? '#f2d154' : '#2a2d3d'}`, background: '#1b1d29', color: '#e8eaf0', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
          >
            <span>{a.label}</span>
            <span translate="no" style={{ minWidth: 54, textAlign: 'center', padding: '2px 8px', borderRadius: 6, background: waiting === a.id ? '#f2d154' : '#2a2d3d', color: waiting === a.id ? '#12131a' : '#e8eaf0', fontWeight: 700 }}>
              {waiting === a.id ? '...' : keyLabel(binds[a.id])}
            </span>
          </button>
        ))}
      </div>
      <button type="button" onClick={resetKeys} style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #4a5270', background: 'transparent', color: '#e8eaf0', cursor: 'pointer' }}>Restablecer teclas</button>
    </div>
  );
}
