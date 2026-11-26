export const MC_AIM = { on: false, has: false, x: 0, z: 0, slopeOn: false, sy: 0, aimAt: null };

export function setAimSlope(on) {
  MC_AIM.slopeOn = on;
  if (!on) MC_AIM.sy = 0;
}

export function aimSlope() {
  return MC_AIM.slopeOn ? Math.round(MC_AIM.sy * 100) / 100 : undefined;
}

export function setMcAim(on) {
  MC_AIM.on = on;
  if (!on) MC_AIM.has = false;
}

export function mcAimAt(clientX, clientY) {
  return MC_AIM.aimAt ? MC_AIM.aimAt(clientX, clientY) : null;
}

export function mcAimPoint() {
  return MC_AIM.on && MC_AIM.has ? { x: Math.round(MC_AIM.x * 100) / 100, z: Math.round(MC_AIM.z * 100) / 100 } : null;
}

export const FACING = new Map();

export function facingOf(id) {
  const y = FACING.get(id);
  return y === undefined ? null : { x: Math.round(Math.sin(y) * 100) / 100, z: Math.round(Math.cos(y) * 100) / 100 };
}

export const LOBBY_THEME_LIST = [
  { id: 'espera', name: 'Sala de espera' },
  { id: 'pasillo', name: 'Pasillo nocturno' },
  { id: 'quirofano', name: 'Quirófano' },
  { id: 'patio', name: 'Patio interior' },
];

export const lobbyThemeStore = { pref: 'auto', room: '', subs: new Set() };

if (typeof window !== 'undefined') {
  try { lobbyThemeStore.pref = window.localStorage.getItem('asym_lobbytheme') || 'auto'; } catch (e) { lobbyThemeStore.pref = 'auto'; }
}

export function notifyLobbyTheme() {
  lobbyThemeStore.subs.forEach((f) => f());
}

export function setLobbyThemePref(id) {
  lobbyThemeStore.pref = id;
  try { window.localStorage.setItem('asym_lobbytheme', id); } catch (e) { lobbyThemeStore.pref = id; }
  notifyLobbyTheme();
}

export function setLobbyThemeRoom(room) {
  if (lobbyThemeStore.room === room) return;
  lobbyThemeStore.room = room;
  notifyLobbyTheme();
}

export function getLobbyThemePref() {
  return lobbyThemeStore.pref;
}
