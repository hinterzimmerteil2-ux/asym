import { useState } from 'react';
import SkillIcon from './SkillIcon';
import { KEYWORDS } from '../lib/keywords';

const MIN_S = 0.05;
const MAX_S = 600;
const secFromPos = (v) => MIN_S * Math.pow(MAX_S / MIN_S, v / 100);
const fmtSec = (sec) => (sec < 1 ? `${sec.toFixed(2)} s` : sec < 10 ? `${sec.toFixed(1)} s` : `${Math.round(sec)} s`);

export default function AdminPanel({ players, myPlayerId, isHost, phase, cards, characters, onOp, onGrant, onStatus, onTime, onClose }) {
  const [timeSec, setTimeSec] = useState(300);
  const [timeInf, setTimeInf] = useState(false);
  const [fxPos, setFxPos] = useState(40);
  const [fxInf, setFxInf] = useState(false);
  const [tab, setTab] = useState(isHost && phase === 'lobby' ? 'op' : 'cards');
  const [targets, setTargets] = useState({});
  const [all, setAll] = useState(false);
  const [slot, setSlot] = useState(0);
  const [query, setQuery] = useState('');
  const [sent, setSent] = useState('');

  const humans = players.filter((p) => !p.isBot);
  const chosen = all ? 'all' : (Object.keys(targets).filter((id) => targets[id]).length ? Object.keys(targets).filter((id) => targets[id]) : [myPlayerId]);
  const q = query.trim().toLowerCase();

  const skills = [];
  const seen = new Set();
  for (const c of characters) for (const s of c.skills) if (!seen.has(s.id)) { seen.add(s.id); skills.push({ ...s, owner: c.displayName }); }

  const give = (kind, item) => {
    onGrant({ kind, id: item.id, slot, targets: chosen });
    setSent(item.displayName || item.name);
    setTimeout(() => setSent(''), 1600);
  };

  const filterFn = (it) => !q || `${it.displayName || it.name} ${it.description || ''}`.toLowerCase().includes(q);
  const cardList = cards.filter(filterFn);
  const skillList = skills.filter(filterFn);
  const maxSlot = tab === 'skills' ? 4 : 2;
  const fxMs = fxInf ? 1e10 : Math.round(secFromPos(fxPos) * 1000);
  const slotLabel = (i) => (tab === 'skills' ? ['Q', 'E', 'R', 'F'][i] : String(i + 1));

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Panel de host</h2>
          <button type="button" onClick={onClose} style={styles.close}>×</button>
        </div>
        <div style={styles.tabs}>
          {isHost && <button type="button" onClick={() => setTab('op')} style={styles.tab(tab === 'op')}>OP</button>}
          <button type="button" onClick={() => { setTab('cards'); setSlot(0); }} style={styles.tab(tab === 'cards')}>Cartas</button>
          <button type="button" onClick={() => { setTab('skills'); setSlot(0); }} style={styles.tab(tab === 'skills')}>Habilidades del Curador</button>
          <button type="button" onClick={() => setTab('fx')} style={styles.tab(tab === 'fx')}>Estados</button>
          <button type="button" onClick={() => setTab('time')} style={styles.tab(tab === 'time')}>Tiempo</button>
        </div>

        {tab === 'op' && (
          <div style={styles.body}>
            <div style={styles.hint}>Los OP pueden abrir este panel y dar cartas o habilidades.</div>
            {humans.filter((p) => p.id !== myPlayerId).length === 0 && <div style={styles.hint}>No hay otros jugadores.</div>}
            {humans.filter((p) => p.id !== myPlayerId).map((p) => (
              <label key={p.id} style={styles.row}>
                <input type="checkbox" checked={Boolean(p.op)} onChange={(e) => onOp(p.id, e.target.checked)} />
                <span style={{ flex: 1 }}>{p.name}</span>
                <span style={{ color: p.op ? '#ffd24a' : '#8a8da3', fontSize: 11 }}>{p.op ? 'OP' : ''}</span>
              </label>
            ))}
          </div>
        )}

        {tab === 'time' && (
          <div style={styles.body}>
            {phase !== 'action' && <div style={styles.hint}>El tiempo se cambia durante la partida.</div>}
            <div style={styles.subTitle}>Tiempo restante hasta que acabe la partida</div>
            <div style={styles.chips}>
              {[30, 60, 180, 300, 600, 1200].map((v) => (
                <button key={v} type="button" onClick={() => { setTimeSec(v); setTimeInf(false); }} style={styles.chip(!timeInf && timeSec === v)}>{v >= 60 ? `${v / 60} min` : `${v} s`}</button>
              ))}
            </div>
            <label style={styles.row}>
              <input type="number" min={1} max={86400} value={timeSec} disabled={timeInf} onChange={(e) => setTimeSec(Number(e.target.value))} style={{ ...styles.search, width: 100 }} />
              <span>segundos</span>
            </label>
            <label style={styles.row}>
              <input type="checkbox" checked={timeInf} onChange={(e) => setTimeInf(e.target.checked)} />
              <span>Sin límite de tiempo</span>
            </label>
            <div style={styles.chips}>
              <button type="button" disabled={phase !== 'action'} onClick={() => { onTime({ seconds: timeSec, infinite: timeInf }); setSent('Tiempo'); setTimeout(() => setSent(''), 1600); }} style={styles.chip(true)}>Aplicar</button>
            </div>
            {phase === 'action' && <div style={styles.hint}>Usar este panel desactiva las Desgracias de la partida.</div>}
            {sent && <div style={styles.toast}>Enviado: {sent}</div>}
          </div>
        )}

        {tab !== 'op' && tab !== 'time' && (
          <div style={styles.body}>
            {phase !== 'action' && <div style={styles.hint}>Las habilidades se dan durante la partida.</div>}
            <div style={styles.subTitle}>Dar a</div>
            <div style={styles.chips}>
              <label style={styles.chip(all)}>
                <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} style={{ display: 'none' }} />
                Todos
              </label>
              {players.map((p) => (
                <label key={p.id} style={styles.chip(!all && Boolean(targets[p.id]) || (!all && !Object.values(targets).some(Boolean) && p.id === myPlayerId))}>
                  <input type="checkbox" checked={Boolean(targets[p.id])} disabled={all} onChange={(e) => setTargets({ ...targets, [p.id]: e.target.checked })} style={{ display: 'none' }} />
                  {p.id === myPlayerId ? `${p.name} (tú)` : p.name}
                </label>
              ))}
            </div>
            {tab === 'fx' ? (
              <>
                <div style={styles.subTitle}>Estado</div>
                <div style={styles.chips}><span style={styles.chip(true)}>Aturdimiento</span></div>
                <div style={styles.subTitle}>Duración: {fxInf ? 'infinita' : fmtSec(secFromPos(fxPos))}</div>
                <input type="range" min={0} max={100} step={1} value={fxPos} disabled={fxInf} onChange={(e) => setFxPos(Number(e.target.value))} />
                <label style={styles.row}>
                  <input type="checkbox" checked={fxInf} onChange={(e) => setFxInf(e.target.checked)} />
                  <span>Infinita</span>
                </label>
                <div style={styles.chips}>
                  <button type="button" onClick={() => { onStatus({ kind: 'stun', ms: fxMs, targets: chosen }); setSent('Aturdimiento'); setTimeout(() => setSent(''), 1600); }} style={styles.chip(true)} disabled={phase !== 'action'}>Aplicar</button>
                  <button type="button" onClick={() => { onStatus({ kind: 'stun', remove: true, targets: chosen }); setSent('Quitado'); setTimeout(() => setSent(''), 1600); }} style={styles.chip(false)} disabled={phase !== 'action'}>Quitar</button>
                </div>
              </>
            ) : (
              <>
            <div style={styles.subTitle}>{tab === 'skills' ? 'Tecla' : 'Casilla'}</div>
            <div style={styles.chips}>
              {Array.from({ length: maxSlot }).map((_, i) => (
                <button key={i} type="button" onClick={() => setSlot(i)} style={styles.chip(slot === i)}>{slotLabel(i)}</button>
              ))}
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" style={styles.search} />
            <div style={styles.list}>
              {tab === 'cards' && cardList.map((card) => (
                <button key={card.id} type="button" onClick={() => give('card', card)} style={styles.item}>
                  <SkillIcon id={card.id} size={24} />
                  <span style={{ ...styles.itemName, color: card.corrupt ? '#d94fd0' : '#e8e9f0' }}>{card.displayName}</span>
                  <span style={styles.itemText}>{KEYWORDS[card.keywords?.[0]]?.label || ''}</span>
                </button>
              ))}
              {tab === 'skills' && skillList.map((s) => (
                <button key={s.id} type="button" onClick={() => give('skill', s)} style={styles.item}>
                  <SkillIcon id={s.id} size={24} />
                  <span style={styles.itemName}>{s.name}</span>
                  <span style={styles.itemText}>{s.owner}</span>
                </button>
              ))}
            </div>
              </>
            )}
            {phase === 'action' && <div style={styles.hint}>Usar este panel desactiva las Desgracias de la partida.</div>}
            {sent && <div style={styles.toast}>Enviado: {sent}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, background: 'rgba(10, 11, 16, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  panel: { width: 'min(560px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#1a1c28', border: '1px solid #2e3146', borderRadius: 12, color: '#e8e9f0', fontSize: 13 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' },
  title: { margin: 0, fontSize: 16 },
  close: { background: 'transparent', border: 'none', color: '#e8e9f0', fontSize: 22, cursor: 'pointer' },
  tabs: { display: 'flex', gap: 6, padding: '4px 16px 8px', flexWrap: 'wrap' },
  tab: (on) => ({ padding: '5px 12px', borderRadius: 8, border: '1px solid', borderColor: on ? '#ffd24a' : '#2e3146', background: on ? 'rgba(255,210,74,0.12)' : 'transparent', color: on ? '#ffd24a' : '#c9cbe0', fontSize: 12, cursor: 'pointer' }),
  body: { padding: '4px 16px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 },
  hint: { color: '#8a8da3', fontSize: 12 },
  subTitle: { color: '#8a8da3', fontSize: 11, marginTop: 4 },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px', cursor: 'pointer' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: (on) => ({ padding: '4px 10px', borderRadius: 999, border: '1px solid', borderColor: on ? '#5fd58c' : '#2e3146', background: on ? 'rgba(95,213,140,0.14)' : 'transparent', color: on ? '#8ff0b4' : '#c9cbe0', fontSize: 12, cursor: 'pointer' }),
  search: { padding: '6px 10px', borderRadius: 8, border: '1px solid #2e3146', background: '#12131a', color: '#e8e9f0', fontSize: 13 },
  list: { display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', maxHeight: '38vh', minHeight: 80 },
  item: { display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 6, border: 'none', background: 'transparent', color: '#e8e9f0', textAlign: 'left', cursor: 'pointer', fontSize: 12 },
  itemName: { fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' },
  itemText: { color: '#8a8da3', fontSize: 11 },
  toast: { alignSelf: 'center', padding: '4px 12px', borderRadius: 8, background: 'rgba(95,213,140,0.18)', color: '#8ff0b4', fontSize: 12 },
};
