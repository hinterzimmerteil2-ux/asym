import { useState } from 'react';
import SkillIcon from './SkillIcon';
import { STATUSES } from '../lib/statuses';

export default function StatusColumn({ statuses, compact }) {
  const [hovered, setHovered] = useState(null);
  if (!statuses || statuses.length === 0) return null;
  return (
    <div style={compact ? { ...styles.column, top: 140, left: 8 } : styles.column}>
      {statuses.map((status) => {
        const info = STATUSES[status.id];
        if (!info) return null;
        return (
          <div
            key={status.id}
            style={styles.item(info.color, info.dynamic)}
            onMouseEnter={() => setHovered(status.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <SkillIcon id={info.icon} size={26} />
            {info.dynamic && <span style={styles.level}>{status.level}</span>}
            {hovered === status.id && (
              <div style={styles.tooltip}>
                <div style={{ ...styles.tooltipTitle, color: info.color }}>
                  {info.label}, {info.dynamic ? `nivel ${status.level}` : 'estático'}, {Math.ceil(status.ms / 1000)}s
                </div>
                <div style={styles.tooltipText}>{info.description}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  column: { position: 'absolute', top: 150, left: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 5 },
  item: (color, dynamic) => ({
    position: 'relative',
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    border: `2px ${dynamic ? 'solid' : 'dashed'} ${color}`,
    background: 'rgba(14, 31, 27, 0.9)',
    cursor: 'help',
  }),
  level: {
    position: 'absolute',
    right: 2,
    bottom: 1,
    fontSize: 11,
    fontWeight: 800,
    color: '#e8efe4',
    textShadow: '0 0 3px #000',
  },
  tooltip: {
    position: 'absolute',
    left: 48,
    top: 0,
    width: 220,
    padding: '8px 10px',
    borderRadius: 2,
    background: '#0e1f1b',
    border: '2px solid #4a7366',
    pointerEvents: 'none',
  },
  tooltipTitle: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  tooltipText: { fontSize: 12, color: '#c5d3ca', lineHeight: 1.35 },
};
