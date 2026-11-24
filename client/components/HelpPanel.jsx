import { useState } from 'react';
import SkillIcon from './SkillIcon';
import { KEYWORDS } from '../lib/keywords';
import { btn, UI } from '../lib/ui';

export default function HelpPanel({ characters, cards, onClose }) {
  const [tab, setTab] = useState('skills');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const decks = {};
  for (const card of cards) {
    if (q && !`${card.displayName} ${card.description}`.toLowerCase().includes(q)) continue;
    const key = KEYWORDS[card.keywords?.[0]]?.label || 'Otras';
    if (!decks[key]) decks[key] = [];
    decks[key].push(card);
  }
  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} className="lb-skin" onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Ayuda</h2>
          <div style={styles.tabs}>
            <button type="button" onClick={() => setTab('skills')} style={btn.secondary(tab === 'skills')}>Habilidades</button>
            <button type="button" onClick={() => setTab('cards')} style={btn.secondary(tab === 'cards')}>Cartas</button>
          </div>
          <button type="button" onClick={onClose} style={btn.icon(false)} aria-label="Cerrar">×</button>
        </div>
        <p style={styles.note}>Las teclas se cambian en Ajustes.</p>

        {tab === 'skills' && (
          <div style={styles.body}>
            {characters.map((character) => (
              <section key={character.id} style={styles.group}>
                <h3 style={styles.groupTitle}>{character.displayName}</h3>
                {character.skills.map((skill, i) => (
                  <div key={skill.id} style={styles.item}>
                    <SkillIcon id={skill.id} size={28} />
                    <div style={styles.itemBody}>
                      <div style={styles.itemName}>{skill.name} <span style={styles.itemKey}>{['Q', 'E', 'R', 'F'][i]}</span></div>
                      <div style={styles.itemText}>{skill.description}</div>
                    </div>
                  </div>
                ))}
              </section>
            ))}
            <section style={styles.group}>
              <h3 style={styles.groupTitle}>Todos</h3>
              <div style={styles.item}>
                <SkillIcon id="golpe_aturdidor" size={28} />
                <div style={styles.itemBody}>
                  <div style={styles.itemName}>Atún Medicinal <span style={styles.itemKey}>G</span></div>
                  <div style={styles.itemText}>Cura y aturde 1.2s al Paciente frente a ti si se está moviendo.</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {tab === 'cards' && (
          <div style={styles.body}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar carta" style={styles.search} />
            {Object.entries(decks).map(([deck, list]) => (
              <section key={deck} style={styles.group}>
                <h3 style={styles.groupTitle}>{deck}</h3>
                {list.map((card) => (
                  <div key={card.id} style={styles.item}>
                    <SkillIcon id={card.id} size={28} />
                    <div style={styles.itemBody}>
                      <div style={{ ...styles.itemName, color: card.corrupt ? '#d94fd0' : UI.text }}>{card.displayName}</div>
                      <div style={styles.itemText}>{card.description}</div>
                    </div>
                  </div>
                ))}
              </section>
            ))}
            {Object.keys(decks).length === 0 && <p style={styles.note}>Ninguna carta coincide.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 50,
    background: 'rgba(10, 6, 8, 0.74)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  panel: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '88vh',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    touchAction: 'pan-y',
    padding: '18px 20px 22px',
    color: UI.text,
    boxSizing: 'border-box',
  },
  header: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 20, flex: 1 },
  tabs: { display: 'flex', gap: 6 },
  note: { margin: '10px 0 0', fontSize: 12, color: UI.muted },
  body: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 },
  search: {
    margin: '8px 0 4px',
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${UI.line}`,
    background: UI.panel,
    color: UI.text,
    fontSize: 13,
    fontFamily: 'inherit',
  },
  group: { padding: '12px 0 4px', borderTop: '1px solid rgba(240, 194, 107, 0.18)' },
  groupTitle: { margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: UI.gold },
  item: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' },
  itemBody: { minWidth: 0, flex: 1 },
  itemName: { fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere' },
  itemKey: { marginLeft: 6, fontSize: 11, fontWeight: 700, color: UI.muted, border: `1px solid ${UI.line}`, borderRadius: 4, padding: '0 5px' },
  itemText: { fontSize: 12, color: UI.muted, marginTop: 2, overflowWrap: 'anywhere' },
};
