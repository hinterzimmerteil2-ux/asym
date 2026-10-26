'use client';

const R = '#e0555f';
const G = '#5fd58c';
const B = '#54a8f2';
const Y = '#f2d154';
const P = '#b07cf2';
const O = '#f2a154';

const ICONS = {
  ragdoll: <><g transform="rotate(-40 16 16)"><rect x="13" y="2" width="6" height="6" rx="1" fill="#f2d27a" /><rect x="11" y="9" width="10" height="10" fill="#54a8f2" /><rect x="4" y="9" width="6" height="4" fill="#f2d27a" transform="rotate(25 7 11)" /><rect x="22" y="9" width="6" height="4" fill="#f2d27a" transform="rotate(-30 25 11)" /><rect x="11" y="20" width="4" height="9" fill="#3a3d52" transform="rotate(15 13 20)" /><rect x="17" y="20" width="4" height="9" fill="#3a3d52" transform="rotate(-20 19 20)" /></g></>,
  sprint_panico: <><path d="M6 22 L14 6 L16 14 L26 12 L14 28 L13 20 Z" fill={Y} /></>,
  segundo_aliento: <><path d="M4 12 H18 a4 4 0 1 0 -4 -4 M4 18 H24 a4 4 0 1 1 -4 4 M4 24 H14" stroke={B} strokeWidth="2.5" fill="none" strokeLinecap="round" /></>,
  rodar: <><path d="M16 6 a10 10 0 1 1 -9 6" stroke={O} strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M3 8 L8 13 L11 6 Z" fill={O} /></>,
  acetilcolina: <><circle cx="16" cy="16" r="4" fill={B} /><circle cx="6" cy="9" r="3" fill={B} /><circle cx="26" cy="9" r="3" fill={B} /><circle cx="16" cy="28" r="3" fill={B} /><path d="M16 16 L6 9 M16 16 L26 9 M16 16 L16 28" stroke={B} strokeWidth="2" /></>,
  pereza: <><path d="M9 4 H23 M9 28 H23 M10 4 C10 14 22 14 22 28 M22 4 C22 14 10 14 10 28" stroke={G} strokeWidth="2" fill="none" /><path d="M13 26 H19 L16 21 Z" fill={G} /></>,
  fatiga: <><path d="M5 20 Q16 4 27 20 Z" fill="#8a8da3" /><path d="M8 26 H24" stroke="#8a8da3" strokeWidth="3" strokeLinecap="round" /></>,
  impulso: <><path d="M4 16 H22 M16 8 L26 16 L16 24" stroke={Y} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>,
  endlag: <><circle cx="16" cy="16" r="11" fill="none" stroke={O} strokeWidth="2.5" /><path d="M16 9 V16 L21 19" stroke={O} strokeWidth="2.5" fill="none" strokeLinecap="round" /></>,
  aturdido: <><circle cx="16" cy="16" r="5" fill={P} /><path d="M16 3 V8 M16 24 V29 M3 16 H8 M24 16 H29" stroke={P} strokeWidth="2.5" strokeLinecap="round" /></>,
  ralentizado: <><circle cx="11" cy="22" r="6" fill="#c28f4a" /><path d="M17 22 H28 M24 17 L28 22 L24 27" stroke="#c28f4a" strokeWidth="2.5" fill="none" strokeLinecap="round" /></>,
  jeringa_rota: <><rect x="4" y="13" width="14" height="6" rx="1" fill="none" stroke={R} strokeWidth="2" transform="rotate(-30 11 16)" /><path d="M20 10 L26 7 M21 14 L28 14 M19 18 L25 22" stroke={R} strokeWidth="2" strokeLinecap="round" /></>,
  humo_yodo: <><circle cx="11" cy="20" r="6" fill={O} opacity=".8" /><circle cx="19" cy="17" r="7" fill={O} opacity=".65" /><circle cx="15" cy="10" r="5" fill={O} opacity=".5" /></>,
  tropiezo: <><path d="M6 24 Q16 10 26 24 Z" fill={Y} /><path d="M10 8 L14 14 M20 7 L18 13" stroke={R} strokeWidth="2.5" strokeLinecap="round" /></>,
  adrenalina: <><path d="M16 27 C4 18 5 8 11 8 C14 8 16 11 16 11 C16 11 18 8 21 8 C27 8 28 18 16 27 Z" fill={R} /><path d="M17 11 L13 18 H18 L15 24" stroke={Y} strokeWidth="2" fill="none" strokeLinecap="round" /></>,
  chicharron: <><path d="M6 24 L10 8 Q14 4 17 8 L26 20 Q24 26 18 25 Z" fill={O} /><path d="M11 12 L18 22" stroke="#a5651f" strokeWidth="2" /></>,
  goyslop: <><path d="M6 14 H26 L23 27 H9 Z" fill="#6b6b3a" /><path d="M9 14 C9 7 23 7 23 14" fill="#8f8f4a" /><circle cx="13" cy="19" r="1.6" fill="#2a2d3d" /><circle cx="19" cy="19" r="1.6" fill="#2a2d3d" /></>,
  cascara_platano: <><path d="M16 5 C10 10 9 20 12 28 C16 22 16 14 16 5 Z M16 5 C22 10 23 20 20 28 C16 22 16 14 16 5 Z" fill={Y} stroke="#a58b1f" strokeWidth="1.5" /></>,
  platano_podrido: <><path d="M16 5 C10 10 9 20 12 28 C16 22 16 14 16 5 Z M16 5 C22 10 23 20 20 28 C16 22 16 14 16 5 Z" fill="#7a6a2a" stroke="#3d3515" strokeWidth="1.5" /><circle cx="14" cy="15" r="1.5" fill="#2a2d3d" /><circle cx="19" cy="20" r="1.5" fill="#2a2d3d" /></>,
  agua_rimac: <><path d="M3 20 Q8 14 13 20 T23 20 T31 20" stroke={B} strokeWidth="3" fill="none" /><path d="M3 26 Q8 20 13 26 T23 26 T31 26" stroke={G} strokeWidth="2" fill="none" opacity=".7" /><path d="M16 4 Q22 11 16 15 Q10 11 16 4 Z" fill={B} /></>,
  rimac_sin_filtrar: <><path d="M3 20 Q8 14 13 20 T23 20 T31 20" stroke="#6b8f3a" strokeWidth="3" fill="none" /><circle cx="9" cy="10" r="3" fill="#6b8f3a" /><circle cx="20" cy="8" r="2" fill="#6b8f3a" /><circle cx="24" cy="14" r="2.5" fill="#6b8f3a" /><path d="M13 27 L16 23 L19 27" stroke={P} strokeWidth="2" fill="none" /></>,
  red_mist: <><path d="M5 27 L22 6 L27 11 L10 28 Z" fill={R} /><path d="M22 6 L27 11 L30 6 L26 2 Z" fill="#2a2d3d" /><circle cx="9" cy="12" r="4" fill={R} opacity=".4" /><circle cx="14" cy="7" r="3" fill={R} opacity=".3" /></>,
  tajo_carmesi: <><path d="M2 21 L11 18 L13 22 L4 25 Z" fill="#2a2d3d" /><path d="M11 15 L21 5 L29 6 L28 14 L18 24 L12 22 Z" fill="#b57cff" /><path d="M14 18 L25 8" stroke="#ecdcff" strokeWidth="1.6" strokeLinecap="round" opacity=".85" /><path d="M13 21 L26 10" stroke="#7a3fd6" strokeWidth="1.2" opacity=".8" /></>,
  regalo_envenenado: <><rect x="6" y="13" width="20" height="14" rx="2" fill={P} /><rect x="14" y="13" width="4" height="14" fill={Y} /><path d="M16 13 C10 4 4 10 16 13 C28 10 22 4 16 13 Z" fill={Y} /></>,
  golpe_doble: <><path d="M16 3 L19 12 H28 L21 18 L24 27 L16 21 L8 27 L11 18 L4 12 H13 Z" fill={O} /></>,
  pulso_hierbas: <><path d="M16 28 C5 20 6 8 16 4 C26 8 27 20 16 28 Z" fill={G} /><path d="M16 26 V10" stroke="#1f6b41" strokeWidth="2" /></>,
  somnifero_valeriana: <><path d="M10 6 H22 L20 12 L26 26 H6 L12 12 Z" fill="none" stroke={P} strokeWidth="2" /><path d="M13 18 H19 L16 14 Z" fill={P} opacity=".6" /><text x="22" y="9" fontSize="9" fill={P} fontWeight="700">z</text></>,
  raiz_atrayente: <><path d="M16 3 V13 M16 13 C10 15 7 20 6 28 M16 13 C22 15 25 20 26 28 M16 13 C14 18 14 22 15 28" stroke="#8f6a3a" strokeWidth="2.5" fill="none" strokeLinecap="round" /></>,
  tonico_reforzado: <><rect x="10" y="12" width="12" height="16" rx="3" fill={O} /><rect x="13" y="5" width="6" height="7" fill="#8f6a3a" /><path d="M16 16 V24 M12 20 H20" stroke="#fff" strokeWidth="2" /></>,
  ronda_suero: <><path d="M10 4 H22 V9 L19 12 V20 H13 V12 L10 9 Z" fill="none" stroke={B} strokeWidth="2" /><path d="M16 22 Q20 26 16 30 Q12 26 16 22 Z" fill={B} /></>,
  anestesia: <><path d="M6 14 Q16 4 26 14 Q26 24 16 26 Q6 24 6 14 Z" fill="none" stroke={P} strokeWidth="2" /><circle cx="16" cy="20" r="3" fill={P} /></>,
  camilla_magnetica: <><path d="M8 4 V16 a8 8 0 0 0 16 0 V4 H18 V16 a2 2 0 0 1 -4 0 V4 Z" fill={R} /><rect x="8" y="4" width="6" height="4" fill="#dcdde8" /><rect x="18" y="4" width="6" height="4" fill="#dcdde8" /></>,
  desinfectante: <><rect x="11" y="12" width="10" height="16" rx="2" fill={B} /><path d="M13 12 V7 H20 V10" stroke="#dcdde8" strokeWidth="2" fill="none" /><path d="M23 6 H28 M23 10 H28 M23 14 H27" stroke={B} strokeWidth="2" strokeLinecap="round" /></>,
  aji_picante: <><path d="M8 24 C6 14 14 6 26 6 C26 18 18 26 8 24 Z" fill={R} /><path d="M26 6 L29 3" stroke={G} strokeWidth="3" strokeLinecap="round" /></>,
  sopa_hirviendo: <><path d="M5 15 H27 a11 11 0 0 1 -22 0 Z" fill={O} /><path d="M11 11 Q9 8 11 5 M16 11 Q14 8 16 5 M21 11 Q19 8 21 5" stroke="#dcdde8" strokeWidth="2" fill="none" strokeLinecap="round" /></>,
  pastilla_vencida: <><rect x="4" y="11" width="24" height="10" rx="5" fill="#dcdde8" transform="rotate(-35 16 16)" /><path d="M16 9 L16 23" stroke="#8a8da3" strokeWidth="2" transform="rotate(-35 16 16)" /><path d="M23 22 L27 26 M27 22 L23 26" stroke={R} strokeWidth="2" strokeLinecap="round" /></>,
  canon_humano: <><rect x="3" y="15" width="18" height="9" rx="3" fill="#8a8da3" transform="rotate(-20 12 19)" /><circle cx="25" cy="10" r="4" fill={Y} /><path d="M20 14 L24 18" stroke={Y} strokeWidth="2" /></>,
  risa_enlatada: <><circle cx="16" cy="16" r="12" fill={Y} /><circle cx="11" cy="13" r="1.8" fill="#2a2d3d" /><circle cx="21" cy="13" r="1.8" fill="#2a2d3d" /><path d="M9 18 Q16 27 23 18 Z" fill="#2a2d3d" /></>,
  martillazo: <><rect x="4" y="5" width="16" height="9" rx="2" fill="#8a8da3" /><rect x="11" y="14" width="4" height="15" fill="#8f6a3a" /><path d="M23 10 L28 7 M24 15 L30 15 M23 20 L28 23" stroke={Y} strokeWidth="2" strokeLinecap="round" /></>,
  bolsa_cemento: <><path d="M7 8 H25 L27 27 H5 Z" fill="#8a8da3" /><path d="M7 8 Q16 2 25 8" fill="#6c6f84" /><text x="9" y="22" fontSize="8" fill="#2a2d3d" fontWeight="700">CEM</text></>,
  grito_animo: <><path d="M5 20 L20 8 V26 Z" fill={Y} /><circle cx="25" cy="17" r="3" fill={B} /><path d="M26 8 L29 5 M28 13 L31 12" stroke={B} strokeWidth="2" strokeLinecap="round" /></>,
  racion_compartida: <><path d="M4 16 H28 a12 12 0 0 1 -24 0 Z" fill={O} /><circle cx="16" cy="13" r="4" fill="#c98a3a" /></>,
  sprint_desbocado: <><path d="M4 22 L12 6 L14 14 L24 12 L12 28 L11 20 Z" fill={R} /><path d="M25 8 L29 4 M27 14 L31 13" stroke={R} strokeWidth="2" strokeLinecap="round" /></>,
  humo_toxico: <><circle cx="11" cy="20" r="6" fill="#6b8f3a" opacity=".85" /><circle cx="19" cy="17" r="7" fill="#6b8f3a" opacity=".7" /><circle cx="15" cy="10" r="5" fill="#6b8f3a" opacity=".55" /><circle cx="16" cy="17" r="2" fill="#2a2d3d" /></>,
  risa_macabra: <><circle cx="16" cy="16" r="12" fill={P} /><circle cx="11" cy="13" r="2" fill="#2a2d3d" /><circle cx="21" cy="13" r="2" fill="#2a2d3d" /><path d="M8 19 Q16 29 24 19 Z" fill="#2a2d3d" /><path d="M11 21 V24 M16 22 V26 M21 21 V24" stroke="#dcdde8" strokeWidth="1.5" /></>,
  golpe_aturdidor: <><circle cx="16" cy="16" r="8" fill={Y} /><path d="M16 2 V7 M16 25 V30 M2 16 H7 M25 16 H30 M6 6 L10 10 M22 22 L26 26 M26 6 L22 10 M10 22 L6 26" stroke={Y} strokeWidth="2" strokeLinecap="round" /></>,
};

const IMAGES = new Set(['acetilcolina', 'tajo_carmesi', 'red_mist', 'agua_rimac', 'chicharron', 'rodar', 'tropiezo', 'goyslop', 'cascara_platano', 'grito_animo', 'pulso_hierbas', 'somnifero_valeriana', 'raiz_atrayente', 'tonico_reforzado', 'ronda_suero', 'anestesia', 'camilla_magnetica', 'desinfectante', 'golpe_aturdidor']);

export default function SkillIcon({ id, size = 30 }) {
  if (IMAGES.has(id)) {
    return <img src={`/icons/${id}.png`} alt="" width={size} height={size} draggable={false} onContextMenu={(e) => e.preventDefault()} style={{ flexShrink: 0, borderRadius: 6, objectFit: 'contain' }} />;
  }
  const shapes = ICONS[id];
  if (!shapes) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flexShrink: 0 }}>
      {shapes}
    </svg>
  );
}
