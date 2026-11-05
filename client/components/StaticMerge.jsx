import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const CHUNK = 24;

function propKey(m) {
  return [m.type, m.color ? m.color.getHex() : '', m.emissive ? m.emissive.getHex() : '', m.emissiveIntensity, m.roughness, m.metalness, m.opacity, m.transparent, m.side, m.depthWrite, m.flatShading, m.map ? m.map.uuid : '', m.fog].join('|');
}

function prepare(geo, matrix) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  const count = g.attributes.position.count;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  g.applyMatrix4(matrix);
  return g;
}

export default function StaticMerge({ children, enabled = true }) {
  const ref = useRef();
  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return undefined;
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const meshes = [];
    root.traverse((o) => {
      if (o.isMesh && !o.isInstancedMesh && !o.userData.keep && o.geometry && o.material && !Array.isArray(o.material) && o.visible) meshes.push(o);
    });
    const uses = new Map();
    meshes.forEach((m) => uses.set(m.material, (uses.get(m.material) || 0) + 1));
    const buckets = new Map();
    meshes.forEach((m) => {
      m.updateWorldMatrix(true, false);
      const rel = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
      const p = new THREE.Vector3().setFromMatrixPosition(rel);
      const key = `${uses.get(m.material) > 1 ? m.material.uuid : propKey(m.material)}#${Math.floor(p.x / CHUNK)},${Math.floor(p.z / CHUNK)},${Math.floor(p.y / 6)}`;
      let b = buckets.get(key);
      if (!b) { b = { material: m.material, geos: [] }; buckets.set(key, b); }
      b.geos.push(prepare(m.geometry, rel));
    });
    const made = [];
    buckets.forEach((b) => {
      let merged = null;
      try { merged = mergeGeometries(b.geos, false); } catch { merged = null; }
      b.geos.forEach((g) => g.dispose());
      if (!merged) return;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, b.material);
      mesh.matrixAutoUpdate = false;
      root.add(mesh);
      made.push(mesh);
    });
    meshes.forEach((m) => { m.visible = false; });
    return () => {
      made.forEach((m) => { root.remove(m); m.geometry.dispose(); });
      meshes.forEach((m) => { m.visible = true; });
    };
  }, [enabled]);
  return <group ref={ref}>{children}</group>;
}
