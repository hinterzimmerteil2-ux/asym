export const UI = {
  accent: '#d94a52',
  gold: '#f0c26b',
  bg: '#1a1215',
  panel: '#241a1e',
  line: '#3d2c33',
  text: '#f3e8e5',
  muted: '#a8959a',
};

const base = {
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.2,
  borderRadius: 8,
  border: '1px solid transparent',
  boxSizing: 'border-box',
  transition: 'background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease',
};

export const btn = {
  primary: (disabled) => ({
    ...base,
    padding: '9px 16px',
    background: disabled ? UI.line : UI.accent,
    color: disabled ? '#8a7479' : '#fff',
    cursor: disabled ? 'default' : 'pointer',
  }),
  secondary: (on, disabled) => ({
    ...base,
    padding: '7px 12px',
    background: on ? 'rgba(240, 194, 107, 0.14)' : UI.panel,
    borderColor: on ? UI.gold : UI.line,
    color: on ? UI.gold : UI.text,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'default' : 'pointer',
  }),
  ghost: (disabled) => ({
    ...base,
    padding: '7px 12px',
    background: 'transparent',
    color: UI.muted,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'default' : 'pointer',
  }),
  icon: (on) => ({
    ...base,
    width: 32,
    height: 32,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    background: 'rgba(36, 26, 30, 0.9)',
    borderColor: on ? UI.gold : UI.line,
    color: on ? UI.gold : UI.text,
    cursor: 'pointer',
  }),
};
