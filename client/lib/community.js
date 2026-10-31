import { getStoredToken } from './session';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

function headers(json) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  const token = getStoredToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de conexión.');
  return data;
}

export async function listCommunityMaps(sort) {
  return parse(await fetch(`${SERVER_URL}/community/maps?sort=${sort}`, { headers: headers(false) }));
}

export async function publishCommunityMap(layout, name) {
  return parse(await fetch(`${SERVER_URL}/community/maps`, { method: 'POST', headers: headers(true), body: JSON.stringify({ token: getStoredToken(), layout, name }) }));
}

export async function voteCommunityMap(id) {
  return parse(await fetch(`${SERVER_URL}/community/vote`, { method: 'POST', headers: headers(true), body: JSON.stringify({ token: getStoredToken(), id }) }));
}

export async function deleteCommunityMap(id) {
  return parse(await fetch(`${SERVER_URL}/community/delete`, { method: 'POST', headers: headers(true), body: JSON.stringify({ token: getStoredToken(), id }) }));
}
