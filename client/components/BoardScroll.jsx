'use client';
import { useEffect } from 'react';
import { isBoard, getSettings } from '../lib/settings';

function scroller(el) {
  for (let n = el; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
    if (n.tagName === 'CANVAS' || n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT') return null;
    const cs = getComputedStyle(n);
    if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 2) return n;
  }
  return null;
}

export default function BoardScroll() {
  useEffect(() => {
    let st = null;
    let drag = false;
    const on = () => {
      try {
        const m = getSettings().inputMode;
        return isBoard() || m === 'touch' || m === 'mixed';
      } catch { return false; }
    };
    const down = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !on()) return;
      const el = scroller(e.target);
      st = el ? { el, y: e.clientY, top: el.scrollTop } : null;
      drag = false;
    };
    const move = (e) => {
      if (!st) return;
      const dy = e.clientY - st.y;
      if (!drag && Math.abs(dy) < 8) return;
      drag = true;
      st.el.scrollTop = st.top - dy;
    };
    const up = () => {
      st = null;
    };
    const click = (e) => {
      if (drag) {
        e.preventDefault();
        e.stopPropagation();
        drag = false;
      }
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
    document.addEventListener('click', click, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
      document.removeEventListener('click', click, true);
    };
  }, []);
  return null;
}
