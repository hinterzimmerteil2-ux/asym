'use client';
import { useEffect, useRef, useState } from 'react';

export default function FpsCounter() {
  const [fps, setFps] = useState(0);
  const [info, setInfo] = useState(null);
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
        r.n = 0;
        r.t = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div translate="no" style={{ position: 'fixed', left: 8, bottom: 8, zIndex: 40, background: 'rgba(0,0,0,0.6)', color: fps < 30 ? '#e0555f' : '#5fd58c', fontSize: 12, padding: '2px 6px', borderRadius: 4, fontVariantNumeric: 'tabular-nums' }}>{fps} FPS{info ? ` | ${info.calls} dibujos | ${Math.round(info.tris / 1000)}k tri | ${info.geos} geo | ${info.tex} tex` : ''}</div>;
}
