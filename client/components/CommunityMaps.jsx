'use client';
import { useEffect, useState } from 'react';
import { listCommunityMaps, voteCommunityMap, deleteCommunityMap } from '../lib/community';

const box = { position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', zIndex: 40, display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(20,24,40,0.97)', border: '1px solid #8fc6ea', borderRadius: 10, padding: 10, width: 'min(94vw, 460px)', maxHeight: 'calc(100% - 70px)', overflow: 'auto' };
const btn = (on) => ({ padding: '3px 9px', borderRadius: 6, border: `1px solid ${on ? '#ff6b81' : '#4a5270'}`, background: on ? 'rgba(255,107,129,0.18)' : 'transparent', color: '#eee', cursor: 'pointer', fontSize: 12 });

export default function CommunityMaps({ isHost, currentMapId, onUse, onClose }) {
  const [sort, setSort] = useState('top');
  const [maps, setMaps] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    setMaps(null);
    listCommunityMaps(sort).then((d) => { if (live) { setMaps(d.maps); setError(null); } }).catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [sort]);

  async function vote(id) {
    try {
      const r = await voteCommunityMap(id);
      setMaps((prev) => prev.map((m) => (m.id === id ? { ...m, voted: r.voted, votes: r.votes } : m)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    try {
      await deleteCommunityMap(id);
      setMaps((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div style={box}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <strong style={{ flex: 1 }}>Mapas de la comunidad</strong>
        <button style={btn(sort === 'top')} onClick={() => setSort('top')}>Más votados</button>
        <button style={btn(sort === 'new')} onClick={() => setSort('new')}>Nuevos</button>
        <button style={btn(false)} onClick={onClose}>✕</button>
      </div>
      {error && <div style={{ color: '#ff9aa8', fontSize: 13 }}>{error}</div>}
      {!maps && !error && <div style={{ fontSize: 13 }}>Cargando…</div>}
      {maps && maps.length === 0 && <div style={{ fontSize: 13 }}>Aún no hay mapas publicados. Crea el primero en el editor.</div>}
      {(maps || []).map((m) => (
        <div key={m.id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: 6, border: `1px solid ${m.id === currentMapId ? '#5fd58c' : '#2a2d3d'}`, borderRadius: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div translate="no" style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
            <div translate="no" style={{ fontSize: 11, opacity: 0.7 }}>{m.author}</div>
          </div>
          <button style={btn(m.voted)} onClick={() => vote(m.id)}>♥ {m.votes}</button>
          {isHost && <button style={btn(false)} onClick={() => onUse(m)}>{m.id === currentMapId ? 'En uso' : 'Usar'}</button>}
          {m.mine && <button style={btn(false)} onClick={() => remove(m.id)}>Borrar</button>}
        </div>
      ))}
      {!isHost && <div style={{ fontSize: 11, opacity: 0.7 }}>Solo el host puede elegir el mapa.</div>}
    </div>
  );
}
