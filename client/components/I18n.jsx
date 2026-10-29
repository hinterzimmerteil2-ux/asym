'use client';

import { useEffect, useRef, useState } from 'react';
import { translate, detectLang, LANGS } from '../lib/i18n';

const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];

function skipped(node) {
  const el = node.nodeType === 3 ? node.parentElement : node;
  if (!el) return true;
  if (el.closest && el.closest('[translate="no"], script, style, pre, code, textarea')) return true;
  return false;
}

export default function I18n() {
  const [lang, setLang] = useState('es');
  const langRef = useRef('es');
  const texts = useRef(new WeakMap());
  const attrs = useRef(new WeakMap());
  const tracked = useRef(new Set());

  const applyText = (node) => {
    if (skipped(node)) return;
    const rec = texts.current.get(node);
    const value = node.nodeValue;
    if (rec && value === rec.out) return;
    const src = value;
    const out = translate(src, langRef.current);
    texts.current.set(node, { src, out });
    tracked.current.add(new WeakRef(node));
    if (out !== src) node.nodeValue = out;
  };

  const applyAttrs = (el) => {
    if (skipped(el)) return;
    let map = attrs.current.get(el);
    for (const name of ATTRS) {
      const value = el.getAttribute(name);
      if (value === null) continue;
      if (!map) { map = {}; attrs.current.set(el, map); }
      const rec = map[name];
      if (rec && value === rec.out) continue;
      const out = translate(value, langRef.current);
      map[name] = { src: value, out };
      tracked.current.add(new WeakRef(el));
      if (out !== value) el.setAttribute(name, out);
    }
  };

  const walk = (root) => {
    if (root.nodeType === 3) { applyText(root); return; }
    if (root.nodeType !== 1) return;
    applyAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n = tw.nextNode();
    while (n) {
      if (n.nodeType === 3) applyText(n); else applyAttrs(n);
      n = tw.nextNode();
    }
  };

  const retranslateAll = () => {
    for (const ref of tracked.current) {
      const node = ref.deref();
      if (!node) { tracked.current.delete(ref); continue; }
      if (node.nodeType === 3) {
        const rec = texts.current.get(node);
        if (!rec) continue;
        rec.out = translate(rec.src, langRef.current);
        node.nodeValue = rec.out;
      } else {
        const map = attrs.current.get(node);
        if (!map) continue;
        for (const [name, rec] of Object.entries(map)) {
          rec.out = translate(rec.src, langRef.current);
          node.setAttribute(name, rec.out);
        }
      }
    }
    if (langRef.current !== 'es') walk(document.body);
    document.title = translate('Réplica', langRef.current);
    document.documentElement.lang = langRef.current;
  };

  useEffect(() => {
    const l = detectLang();
    langRef.current = l;
    setLang(l);
    const observer = new MutationObserver((records) => {
      if (langRef.current === 'es') return;
      for (const r of records) {
        if (r.type === 'characterData') applyText(r.target);
        else if (r.type === 'attributes') applyAttrs(r.target);
        else for (const added of r.addedNodes) walk(added);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    retranslateAll();
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (next) => {
    langRef.current = next;
    setLang(next);
    try { localStorage.setItem('asym_lang', next); } catch {}
    retranslateAll();
  };

  return (
    <div translate="no" style={{ position: 'fixed', top: 3, right: 3, zIndex: 500, display: 'flex', gap: 3 }}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-label={`language ${l}`}
          style={{ fontSize: 13, padding: '3px 9px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.3)', background: lang === l ? 'rgba(84,104,255,0.85)' : 'rgba(20,22,30,0.65)', color: '#e8e9f0', opacity: lang === l ? 1 : 0.75, cursor: 'pointer', lineHeight: 1.4 }}
        >
          {l === 'en-GB' ? 'en' : l}
        </button>
      ))}
    </div>
  );
}
