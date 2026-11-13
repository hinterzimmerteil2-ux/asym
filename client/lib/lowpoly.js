import * as THREE from 'three';
import { extend } from '@react-three/fiber';

let scale = 1;
let installed = false;

export function setPolyScale(v) {
  scale = v;
}

const P = (n, min) => Math.max(min, Math.round(n * scale));

class Sphere extends THREE.SphereGeometry {
  constructor(r = 1, w = 32, h = 16, ...rest) { super(r, P(w, 4), P(h, 3), ...rest); }
}
class Cylinder extends THREE.CylinderGeometry {
  constructor(t = 1, b = 1, h = 1, seg = 32, ...rest) { super(t, b, h, P(seg, 3), ...rest); }
}
class Cone extends THREE.ConeGeometry {
  constructor(r = 1, h = 1, seg = 32, ...rest) { super(r, h, P(seg, 3), ...rest); }
}
class Circle extends THREE.CircleGeometry {
  constructor(r = 1, seg = 32, ...rest) { super(r, P(seg, 3), ...rest); }
}
class Ring extends THREE.RingGeometry {
  constructor(i = 0.5, o = 1, seg = 32, ...rest) { super(i, o, P(seg, 3), ...rest); }
}
class Torus extends THREE.TorusGeometry {
  constructor(r = 1, t = 0.4, rs = 12, ts = 48, ...rest) { super(r, t, P(rs, 3), P(ts, 3), ...rest); }
}
class Capsule extends THREE.CapsuleGeometry {
  constructor(r = 1, l = 1, cs = 4, rs = 8, ...rest) { super(r, l, P(cs, 1), P(rs, 3), ...rest); }
}

export function installLowPoly() {
  extend({ SphereGeometry: Sphere, CylinderGeometry: Cylinder, ConeGeometry: Cone, CircleGeometry: Circle, RingGeometry: Ring, TorusGeometry: Torus, CapsuleGeometry: Capsule });
}
