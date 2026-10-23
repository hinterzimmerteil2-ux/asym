import SkillIcon from './SkillIcon';

const CONTROLS = [
  ['W A S D', 'Moverte'],
  ['Espacio', 'Saltar'],
  ['Shift', 'Paso normal, sin gastar Flojera'],
  ['Click', 'Curar (Curador) / auto-dañarte en objeto rojo (Paciente)'],
  ['Q E R F', 'Habilidades del Curador'],
  ['G', 'Golpe Aturdidor (Curador)'],
  ['E', 'Acertar el ritmo de Grito de Ánimo'],
  ['1 2', 'Usar carta (Paciente)'],
  ['H', 'Abrir o cerrar esta ayuda'],
  ['B', 'Mostrar u ocultar hitboxes'],
];

export default function HelpPanel({ characters, cards, onClose }) {
  const decks = {};
  for (const card of cards) {
    const key = card.deck || 'Generales';
    if (!decks[key]) decks[key] = [];
    decks[key].push(card);
  }
  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Ayuda</h2>
          <button type="button" onClick={onClose} style={styles.close}>×</button>
        </div>

        <h3 style={styles.section}>Controles</h3>
        <div style={styles.grid}>
          {CONTROLS.map(([key, text]) => (
            <div key={key} style={styles.row}>
              <span style={styles.key}>{key}</span>
              <span style={styles.text}>{text}</span>
            </div>
          ))}
        </div>

        <h3 style={styles.section}>Habilidades del Curador</h3>
        {characters.map((character) => (
          <div key={character.id} style={styles.block}>
            <div style={styles.blockTitle}>{character.displayName}</div>
            {character.skills.map((skill, i) => (
              <div key={skill.id} style={styles.item}>
                <SkillIcon id={skill.id} size={24} />
                <span style={styles.itemKey}>{['Q', 'E', 'R', 'F'][i]}</span>
                <span style={styles.itemName}>{skill.name}</span>
                <span style={styles.itemText}>{skill.description}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={styles.block}>
          <div style={styles.blockTitle}>Todos</div>
          <div style={styles.item}>
            <SkillIcon id="golpe_aturdidor" size={24} />
            <span style={styles.itemKey}>G</span>
            <span style={styles.itemName}>Golpe Aturdidor</span>
            <span style={styles.itemText}>Aturde 1.2s al Paciente frente a ti. Su versión corrupta es IS THAT THE RED MIST?</span>
          </div>
        </div>

        <h3 style={styles.section}>Cartas de los Pacientes</h3>
        {Object.entries(decks).map(([deck, list]) => (
          <div key={deck} style={styles.block}>
            <div style={styles.blockTitle}>{deck}</div>
            {list.map((card) => (
              <div key={card.id} style={styles.item}>
                <SkillIcon id={card.id} size={24} />
                <span />
                <span style={{ ...styles.itemName, color: card.corrupt ? '#d94fd0' : '#e8e9f0' }}>{card.displayName}</span>
                <span style={styles.itemText}>{card.description}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    background: 'rgba(10, 11, 16, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  panel: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '88vh',
    overflowY: 'auto',
    background: '#12131a',
    border: '1px solid #2a2d3d',
    borderRadius: 12,
    padding: '16px 20px 20px',
    color: '#e8e9f0',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { margin: 0, fontSize: 20 },
  close: { background: 'none', border: 'none', color: '#8a8da3', fontSize: 26, cursor: 'pointer', lineHeight: 1 },
  section: { margin: '18px 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, color: '#8a8da3' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 6 },
  row: { display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center', gap: 10 },
  key: {
    justifySelf: 'start',
    fontSize: 12,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 6,
    border: '1px solid #2a2d3d',
    background: '#1b1d29',
  },
  text: { fontSize: 13, color: '#c3c5d6' },
  note: { margin: '0 0 8px', fontSize: 12, color: '#f2a154' },
  block: { marginBottom: 10 },
  blockTitle: { fontSize: 12, fontWeight: 700, color: '#5fd58c', marginBottom: 4 },
  item: {
    display: 'grid',
    gridTemplateColumns: '24px 18px 170px 1fr',
    alignItems: 'center',
    columnGap: 8,
    padding: '3px 0',
    fontSize: 12,
  },
  itemKey: { fontWeight: 800, color: '#8a8da3', textAlign: 'center' },
  itemName: { fontWeight: 600 },
  itemText: { color: '#8a8da3', gridColumn: 'auto' },
  chip: {
    gridColumn: '1 / 4',
    justifySelf: 'start',
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: 4,
    border: '1px solid',
    textTransform: 'uppercase',
  },
};
