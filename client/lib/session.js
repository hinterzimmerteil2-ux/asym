const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
const TOKEN_KEY = 'asym_game_token';
const DISPLAY_NAME_KEY = 'asym_game_display_name';

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredDisplayName() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DISPLAY_NAME_KEY);
}

export function storeSession(token, displayName) {
  localStorage.setItem(TOKEN_KEY, token);
  if (displayName) localStorage.setItem(DISPLAY_NAME_KEY, displayName);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
}

export function decodeTokenPayload(token) {
  try {
    const [, payloadB64] = token.split('.');
    return JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export async function loginAsGuest(displayName) {
  const response = await fetch(`${SERVER_URL}/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  if (!response.ok) throw new Error('No se pudo crear la sesión de invitado.');
  const data = await response.json();
  storeSession(data.token, data.displayName);
  return data.token;
}

export function redirectToOAuthLogin(provider) {
  window.location.href = `${SERVER_URL}/auth/${provider}`;
}

export async function updateDisplayName(token, newDisplayName) {
  const response = await fetch(`${SERVER_URL}/auth/update-name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, displayName: newDisplayName }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el nombre.');
  // El nombre viaja embebido en el JWT, así que el servidor devuelve un
  // token nuevo ya firmado con el nombre actualizado — hay que reemplazar
  // el viejo o las próximas conexiones seguirían mandando el nombre
  // anterior.
  storeSession(data.token, data.displayName);
  return data.token;
}
