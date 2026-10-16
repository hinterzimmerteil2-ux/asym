import { useState } from 'react';
import SkillIcon from './SkillIcon';
import { STATUSES } from '../lib/statuses';

export default function StatusColumn({ statuses }) {
  const [hovered, setHovered] = useState(null);
  if (!statuses || statuses.length === 0) return null;
  return (
    <div style={styles.column}>
      {statuses.map((status) => {
        const info = STATUSES[status.id];
        if (!info) return null;
        return (
          <div
            key={status.id}
            style={styles.item(info.color)}
            onMouseEnter={() => setHovered(status.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <SkillIcon id={info.icon} size={26} />
            {status.level > 1 && <span style={styles.level}>{status.level}</span>}
            {hovered === status.id && (
              <div style={styles.tooltip}>
                <div style={{ ...styles.tooltipTitle, color: info.color }}>
                  {info.label} · nivel {status.level} · {Math.ceil(status.ms / 1000)}s
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
  item: (color) => ({
    position: 'relative',
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: `1px solid ${color}`,
    background: 'rgba(18, 19, 26, 0.9)',
    cursor: 'help',
  }),
  level: {
    position: 'absolute',
    right: 2,
    bottom: 1,
    fontSize: 11,
    fontWeight: 800,
    color: '#e8e9f0',
    textShadow: '0 0 3px #000',
  },
  tooltip: {
    position: 'absolute',
    left: 48,
    top: 0,
    width: 220,
    padding: '8px 10px',
    borderRadius: 8,
    background: '#12131a',
    border: '1px solid #2a2d3d',
    pointerEvents: 'none',
  },
  tooltipTitle: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  tooltipText: { fontSize: 12, color: '#c3c5d6', lineHeight: 1.35 },
};
