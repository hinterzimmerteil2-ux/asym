const SLOTS = {
  head: ['gorro_lana', 'gorra', 'copa', 'casco', 'cuernos', 'orejas_gato'],
  torso: ['correa', 'bufanda', 'corbata', 'tirantes'],
  back: ['mochila', 'capa', 'alas', 'megafono'],
};

const COLORS = ['#e0555f', '#f2a154', '#f2d154', '#5fd58c', '#54d1f2', '#5468ff', '#b07cf2', '#e8e9f0', '#2a2d3d'];

function sanitize(selection) {
  const out = {};
  if (!selection || typeof selection !== 'object') return out;
  for (const [slot, ids] of Object.entries(SLOTS)) {
    const item = selection[slot];
    if (!item || typeof item.id !== 'string' || !ids.includes(item.id)) continue;
    out[slot] = { id: item.id, color: COLORS.includes(item.color) ? item.color : COLORS[0] };
  }
  return out;
}

module.exports = { SLOTS, COLORS, sanitize };
