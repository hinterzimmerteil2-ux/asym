'use client';

import { useEffect, useRef, useState } from 'react';
import { translate, detectLang, LANGS } from '../lib/i18n';
import { btn } from '../lib/ui';
import SettingsPanel from './SettingsPanel';
import FpsCounter from './FpsCounter';
import AutoQuality from './AutoQuality';
import { useSettings } from '../lib/settings';

const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];

const makeRef = (node) => (typeof WeakRef === 'function' ? new WeakRef(node) : { deref: () => (node.isConnected === false ? undefined : node) });

function skipped(node) {
  const el = node.nodeType === 3 ? node.parentElement : node;
  if (!el) return true;
  if (el.closest && el.closest('[translate="no"], script, style, pre, code, textarea')) return true;
  return false;
}

export default function I18n() {
  const [lang, setLang] = useState('es');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ui = useSettings();
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
    tracked.current.add(makeRef(node));
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
      tracked.current.add(makeRef(el));
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
    try { retranslateRaw(); } catch {}
  };

  const retranslateRaw = () => {
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
    document.documentElement.lang = langRef.current === 'pie' ? 'ine-pro' : langRef.current === 'skb' ? 'x-skb' : langRef.current;
  };

  useEffect(() => {
    const l = detectLang();
    langRef.current = l;
    setLang(l);
    const observer = new MutationObserver((records) => {
      if (langRef.current === 'es') return;
      try {
        for (const r of records) {
          if (r.type === 'characterData') applyText(r.target);
          else if (r.type === 'attributes') applyAttrs(r.target);
          else for (const added of r.addedNodes) walk(added);
        }
      } catch {}
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    retranslateAll();
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse), (max-width: 760px)');
    const upd = () => setNarrow(mq.matches);
    upd();
    if (mq.addEventListener) mq.addEventListener('change', upd); else if (mq.addListener) mq.addListener(upd);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', upd); else if (mq.removeListener) mq.removeListener(upd); };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('lowfx', ui.quality < 1);
  }, [ui.quality]);

  const choose = (next) => {
    langRef.current = next;
    setLang(next);
    try { localStorage.setItem('asym_lang', next); } catch {}
    window.dispatchEvent(new Event('asym-lang'));
    retranslateAll();
  };

  return (
    <>
    {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} lang={lang} onLang={choose} langs={LANGS} />}
    {ui.fps && <FpsCounter />}
    <AutoQuality />
    <div translate="no" style={{ position: 'fixed', top: 3, right: 3, zIndex: 500, display: 'flex', gap: 3 }}>
      <button type="button" onClick={() => setSettingsOpen(true)} title="Ajustes" aria-label="Ajustes" style={{ ...btn.secondary(false), padding: '3px 9px', fontSize: 13, background: 'rgba(14, 31, 27, 0.92)' }}>⚙</button>
      {!narrow && LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-label={`language ${l}`}
          style={{ ...btn.secondary(lang === l), padding: '3px 9px', fontSize: 13, ...(lang === l ? null : { background: 'rgba(14, 31, 27, 0.92)' }) }}
        >
          {l === 'en-GB' ? 'en' : l}
        </button>
      ))}
    </div>
    </>
  );
}
