'use client';
import { useEffect, useState } from 'react';

function cssOk(prop, val) {
  try { return window.CSS && CSS.supports ? CSS.supports(prop, val) : 'sin CSS.supports'; } catch (e) { return 'error'; }
}

function jsOk(src) {
  try { new Function(src)(); return true; } catch (e) { return false; }
}

function glReport(kind) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  let gl = null;
  try { gl = c.getContext(kind, { antialias: false }); } catch (e) { return [[kind, 'error al crear: ' + e.message]]; }
  if (!gl) return [[kind, 'NO disponible']];
  const out = [[kind, 'disponible']];
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  out.push(['GPU', dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)]);
  out.push(['Vendor', dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)]);
  out.push(['Version', gl.getParameter(gl.VERSION)]);
  out.push(['GLSL', gl.getParameter(gl.SHADING_LANGUAGE_VERSION)]);
  out.push(['Textura max', gl.getParameter(gl.MAX_TEXTURE_SIZE)]);
  out.push(['Unidades de textura', gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)]);
  out.push(['Uniforms fragment', gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)]);
  out.push(['Uniforms vertex', gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)]);
  out.push(['Varyings', gl.getParameter(gl.MAX_VARYING_VECTORS)]);
  const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  out.push(['highp fragment', hp && hp.precision > 0 ? 'si (' + hp.precision + ' bits)' : 'NO']);
  out.push(['Float texturas', !!gl.getExtension('OES_texture_float') || kind === 'webgl2']);
  out.push(['Instancing', kind === 'webgl2' || !!gl.getExtension('ANGLE_instanced_arrays')]);
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }');
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, 'precision mediump float; void main(){ gl_FragColor = vec4(1.,0.,0.,1.); }');
  gl.compileShader(fs);
  const pr = gl.createProgram();
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  const linked = gl.getProgramParameter(pr, gl.LINK_STATUS);
  out.push(['Shader de prueba', linked ? 'compila' : 'FALLA: ' + gl.getProgramInfoLog(pr)]);
  if (linked) {
    gl.useProgram(pr);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, 64, 64);
    gl.clearColor(0, 0, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const px = new Uint8Array(4);
    gl.readPixels(32, 32, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    out.push(['Dibujo de prueba', px[0] === 255 && px[2] === 0 ? 'OK (rojo)' : 'FALLA, pixel ' + Array.prototype.join.call(px, ',')]);
  }
  return out;
}

async function threeReport() {
  const out = [];
  try {
    const THREE = await import('three');
    out.push(['three', THREE.REVISION]);
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    let r;
    try { r = new THREE.WebGLRenderer({ canvas: c, antialias: false }); } catch (e) { out.push(['WebGLRenderer', 'FALLA: ' + e.message]); return out; }
    r.setSize(64, 64, false);
    const errors = [];
    r.debug.onShaderError = (gl, prog, vs, fs) => { errors.push(String(gl.getProgramInfoLog(prog) || 'shader').slice(0, 160)); };
    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 50);
    cam.position.set(0, 0, 3);
    const kinds = { Basic: THREE.MeshBasicMaterial, Lambert: THREE.MeshLambertMaterial, Standard: THREE.MeshStandardMaterial };
    for (const k of Object.keys(kinds)) {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0, 0, 0);
      scene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const d = new THREE.DirectionalLight(0xffffff, 1);
      d.position.set(1, 2, 3);
      scene.add(d);
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), new kinds[k]({ color: 0xff8040 })));
      const n = errors.length;
      r.render(scene, cam);
      const px = new Uint8Array(4);
      r.getContext().readPixels(32, 32, 1, 1, r.getContext().RGBA, r.getContext().UNSIGNED_BYTE, px);
      out.push(['Material ' + k, errors.length > n ? 'FALLA shader: ' + errors[errors.length - 1] : px[0] + px[1] + px[2] > 30 ? 'OK' : 'NEGRO (pixel ' + Array.prototype.join.call(px, ',') + ')']);
    }
    r.dispose();
  } catch (e) {
    out.push(['three', 'error: ' + (e && e.message)]);
  }
  return out;
}

export default function Diag() {
  const [rows, setRows] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    const base = [];
    base.push(['Navegador', navigator.userAgent]);
    base.push(['Pantalla', window.screen.width + 'x' + window.screen.height + ' | ventana ' + window.innerWidth + 'x' + window.innerHeight + ' | dpr ' + window.devicePixelRatio]);
    base.push(['Tactil / puntero', 'maxTouch ' + (navigator.maxTouchPoints || 0) + ' | coarse ' + (window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : '?')]);
    base.push(['CSS inset', cssOk('inset', '0')]);
    base.push(['CSS gap en flex', cssOk('gap', '4px')]);
    base.push(['CSS aspect-ratio', cssOk('aspect-ratio', '1/1')]);
    base.push(['CSS backdrop-filter', cssOk('backdrop-filter', 'blur(2px)') || cssOk('-webkit-backdrop-filter', 'blur(2px)')]);
    base.push(['JS ?. y ??', jsOk('var a=null; return a?.b ?? 1;')]);
    base.push(['JS BigInt', typeof BigInt !== 'undefined']);
    base.push(['WebSocket', typeof WebSocket !== 'undefined']);
    base.push(['ResizeObserver nativo', window.__roNative === undefined ? 'n/d' : window.__roNative]);
    base.push(['JS flat/flatMap/fromEntries', typeof [].flat === 'function' && typeof Object.fromEntries === 'function']);
    base.push(['JS class fields', jsOk('class A { x = 1 } return new A().x;')]);
    base.push(['JS async/await', jsOk('return (async function(){})()')]);
    base.push(['OffscreenCanvas', typeof OffscreenCanvas !== 'undefined']);
    base.push(['AudioContext', typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined']);
    base.push(['Pointer events', typeof window.PointerEvent !== 'undefined']);
    base.push(['Memoria', navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'n/d']);
    base.push(['Nucleos', navigator.hardwareConcurrency || 'n/d']);
    setRows(base.concat(glReport('webgl2'), glReport('webgl')));
    threeReport().then((t) => { if (live) { setRows((r) => r.concat(t)); setDone(true); } });
    return () => { live = false; };
  }, []);

  const bad = (v) => v === false || /NO |FALLA|NEGRO|error/.test(String(v));
  return (
    <div translate="no" style={{ position: 'absolute', top: 0, left: 0, right: 0, minHeight: '100%', background: '#f4f4f4', color: '#111', padding: 20, fontFamily: 'Arial, sans-serif', fontSize: 20, textTransform: 'none' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>Diagnostico de compatibilidad {done ? '(listo)' : '(ejecutando)'}</h1>
      <p style={{ margin: '0 0 12px' }}>Haz una captura de esta pantalla completa y envíala.</p>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #ccc', background: bad(r[1]) ? '#ffd6d6' : 'transparent' }}>
              <td style={{ padding: '4px 8px', fontWeight: 700, width: '28%', verticalAlign: 'top' }}>{r[0]}</td>
              <td style={{ padding: '4px 8px', wordBreak: 'break-all' }}>{String(r[1])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
