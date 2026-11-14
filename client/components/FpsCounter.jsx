'use client';
import { useEffect, useRef, useState } from 'react';
import { skbWord, toGreek } from '../lib/i18n_skb';

export default function FpsCounter() {
  const [fps, setFps] = useState(0);
  const [info, setInfo] = useState(null);
  const [errs, setErrs] = useState(0);
  const ref = useRef({ n: 0, t: 0 });
  useEffect(() => {
    let raf;
    ref.current = { n: 0, t: performance.now() };
    const loop = (now) => {
      const r = ref.current;
      r.n += 1;
      if (now - r.t >= 500) {
        setFps(Math.round((r.n * 1000) / (now - r.t)));
        setInfo(window.__glinfo || null);
        setErrs((window.__glerr || []).length);
        r.n = 0;
        r.t = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const skbMode = typeof document !== 'undefined' && document.documentElement.lang === 'x-skb';
  const L = (w, plain) => (skbMode ? skbWord(w) : plain);
  return <div translate="no" style={{ position: 'fixed', left: 8, bottom: 8, zIndex: 40, background: 'rgba(0,0,0,0.6)', color: fps < 30 ? '#e0555f' : '#5fd58c', fontSize: 12, padding: '2px 6px', borderRadius: 4, fontVariantNumeric: 'tabular-nums' }}>{`${fps} ${L('fps', 'FPS')}${info ? ` | ${info.calls} ${L('dibujos', 'dibujos')} | ${Math.round(info.tris / 1000)}k ${L('tri', 'tri')} | ${info.geos} ${L('geo', 'geo')} | ${info.tex} ${L('tex', 'tex')}` : ''}`}{errs ? ` | ${errs} ${L('errores', 'errores')} ${skbMode ? toGreek(window.__glerr[errs - 1]) : `GL: ${window.__glerr[errs - 1]}`}` : ''}</div>;
}
