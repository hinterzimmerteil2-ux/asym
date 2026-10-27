export const COLORS = ['#e0555f', '#f2a154', '#f2d154', '#5fd58c', '#54d1f2', '#5468ff', '#b07cf2', '#e8e9f0', '#2a2d3d'];

export const SLOT_LABELS = { head: 'Cabeza', torso: 'Torso', back: 'Espalda' };

const WHITE = '#e8e9f0';
const DARK = '#2a2d3d';
const GOLD = '#f2d154';

export const ITEMS = {
  head: {
    gorro_lana: { name: 'Gorro de lana', pieces: [
      { t: 'cyl', p: [0, 0.2, 0], s: [0.2, 0.2, 0.14], c: 'main' },
      { t: 'cyl', p: [0, 0.13, 0], s: [0.205, 0.205, 0.06], c: WHITE },
      { t: 'box', p: [0, 0.31, 0], s: [0.1, 0.1, 0.1], c: WHITE },
    ] },
    gorra: { name: 'Gorra', pieces: [
      { t: 'cyl', p: [0, 0.19, 0], s: [0.2, 0.2, 0.1], c: 'main' },
      { t: 'box', p: [0, 0.15, 0.23], s: [0.3, 0.03, 0.18], c: 'main' },
    ] },
    copa: { name: 'Sombrero de copa', pieces: [
      { t: 'cyl', p: [0, 0.19, 0], s: [0.3, 0.3, 0.03], c: DARK },
      { t: 'cyl', p: [0, 0.36, 0], s: [0.17, 0.17, 0.32], c: 'main' },
      { t: 'cyl', p: [0, 0.26, 0], s: [0.175, 0.175, 0.06], c: WHITE },
    ] },
    casco: { name: 'Casco de obra', pieces: [
      { t: 'cyl', p: [0, 0.2, 0], s: [0.21, 0.21, 0.14], c: 'main' },
      { t: 'box', p: [0, 0.29, 0], s: [0.06, 0.04, 0.3], c: 'main' },
      { t: 'box', p: [0, 0.14, 0.2], s: [0.36, 0.03, 0.1], c: 'main' },
    ] },
    cuernos: { name: 'Cuernos', pieces: [
      { t: 'cyl', p: [0, 0.14, 0], s: [0.2, 0.2, 0.05], c: 'main' },
      { t: 'cone', p: [-0.15, 0.3, 0], s: [0.06, 0.24], r: [0, 0, 0.4], c: WHITE },
      { t: 'cone', p: [0.15, 0.3, 0], s: [0.06, 0.24], r: [0, 0, -0.4], c: WHITE },
    ] },
    orejas_gato: { name: 'Orejas de gato', pieces: [
      { t: 'cone', p: [-0.11, 0.27, 0], s: [0.08, 0.17], c: 'main' },
      { t: 'cone', p: [0.11, 0.27, 0], s: [0.08, 0.17], c: 'main' },
      { t: 'cone', p: [-0.11, 0.26, 0.02], s: [0.04, 0.1], c: WHITE },
      { t: 'cone', p: [0.11, 0.26, 0.02], s: [0.04, 0.1], c: WHITE },
    ] },
  },
  torso: {
    correa: { name: 'Correa cruzada', pieces: [
      { t: 'box', p: [0, 1.08, 0.2], s: [0.1, 0.95, 0.05], r: [0, 0, 0.62], c: 'main' },
      { t: 'box', p: [0, 1.08, 0.23], s: [0.12, 0.12, 0.03], c: GOLD },
    ] },
    bufanda: { name: 'Bufanda', pieces: [
      { t: 'box', p: [0, 1.4, 0], s: [0.8, 0.14, 0.44], c: 'main' },
      { t: 'box', p: [0.22, 1.18, 0.22], s: [0.14, 0.36, 0.06], c: 'main' },
    ] },
    corbata: { name: 'Corbata', pieces: [
      { t: 'box', p: [0, 1.38, 0.2], s: [0.1, 0.08, 0.04], c: 'main' },
      { t: 'box', p: [0, 1.15, 0.2], s: [0.12, 0.4, 0.03], c: 'main' },
    ] },
    tirantes: { name: 'Tirantes', pieces: [
      { t: 'box', p: [-0.18, 1.08, 0.2], s: [0.08, 0.72, 0.04], c: 'main' },
      { t: 'box', p: [0.18, 1.08, 0.2], s: [0.08, 0.72, 0.04], c: 'main' },
      { t: 'box', p: [0, 0.76, 0.2], s: [0.72, 0.07, 0.04], c: 'main' },
    ] },
  },
  back: {
    mochila: { name: 'Mochila', pieces: [
      { t: 'box', p: [0, 1.12, -0.3], s: [0.5, 0.6, 0.2], c: 'main' },
      { t: 'box', p: [0, 0.96, -0.41], s: [0.3, 0.2, 0.06], c: WHITE },
    ] },
    capa: { name: 'Capa', pieces: [
      { t: 'box', p: [0, 0.98, -0.22], s: [0.74, 0.95, 0.04], c: 'main' },
      { t: 'box', p: [0, 1.46, -0.1], s: [0.5, 0.06, 0.3], c: WHITE },
    ] },
    alas: { name: 'Alas', pieces: [
      { t: 'box', p: [-0.5, 1.3, -0.28], s: [0.6, 0.08, 0.34], r: [0, 0, 0.5], c: WHITE },
      { t: 'box', p: [0.5, 1.3, -0.28], s: [0.6, 0.08, 0.34], r: [0, 0, -0.5], c: WHITE },
      { t: 'box', p: [0, 1.2, -0.24], s: [0.2, 0.14, 0.08], c: 'main' },
    ] },
    megafono: { name: 'Megáfono', pieces: [
      { t: 'cyl', p: [0.3, 1.2, -0.32], s: [0.04, 0.14, 0.42], r: [1.2, 0, 0], c: 'main' },
      { t: 'box', p: [0.3, 1.0, -0.22], s: [0.07, 0.14, 0.07], c: WHITE },
    ] },
  },
};

export function itemOf(slot, selection) {
  const sel = selection && selection[slot];
  const def = sel && ITEMS[slot] && ITEMS[slot][sel.id];
  return def ? { def, color: sel.color } : null;
}
