'use client';
import { useEffect, useState } from 'react';
import { btn } from '../lib/ui';
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
            style={{ ...btn.secondary(waiting === a.id), display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, textAlign: 'left', fontWeight: 500 }}
          >
            <span>{a.label}</span>
            <span translate="no" style={{ minWidth: 54, textAlign: 'center', padding: '2px 8px', borderRadius: 2, background: waiting === a.id ? '#f0b429' : '#2f4d44', color: waiting === a.id ? '#0e1f1b' : '#e8efe4', fontWeight: 700 }}>
              {waiting === a.id ? '...' : keyLabel(binds[a.id])}
            </span>
          </button>
        ))}
      </div>
      <button type="button" onClick={resetKeys} style={{ ...btn.secondary(false), marginTop: 8 }}>Restablecer teclas</button>
    </div>
  );
}
