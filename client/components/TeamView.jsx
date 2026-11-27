'use client';
import { btn } from '../lib/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const MAIL = 'hinterzimmerteil2@gmail.com';

const TEXT = {
  es: {
    back: 'Volver al juego',
    legal: 'Aviso legal y contacto',
    title: 'Equipo de traducción',
    sub: 'Quién traduce Réplica a cada idioma.',
    langs: ['Español, Inglés, Alemán, Protoindoeuropeo', 'Skibidi'],
    me: 'Yo',
    skb: 'Yo (y tres Impactor Astro Toilets [E76, E77 y E78] y un Obliterator Astro Toilet [E75] secuestrados y torturados para sacarles información de traducción)',
  },
  en: {
    back: 'Back to the game',
    legal: 'Legal notice and contact',
    title: 'Translation team',
    sub: 'Who translates Réplica into each language.',
    langs: ['Spanish, English, German, Proto-Indo-European', 'Skibidi'],
    me: 'Me',
    skb: 'Me (and three Impactor Astro Toilets [E76, E77 and E78] and one Obliterator Astro Toilet [E75], kidnapped and tortured to extract translation information)',
  },
  de: {
    back: 'Zurück zum Spiel',
    legal: 'Rechtliche Hinweise und Kontakt',
    title: 'Übersetzungsteam',
    sub: 'Wer Réplica in welche Sprache übersetzt.',
    langs: ['Spanisch, Englisch, Deutsch, Protoindogermanisch', 'Skibidi'],
    me: 'Ich',
    skb: 'Ich (und drei Impactor Astro Toilets [E76, E77 und E78] und ein Obliterator Astro Toilet [E75], entführt und gefoltert, um ihnen Übersetzungsinformationen zu entlocken)',
  },
};

const FROM_GAME = { es: 'es', 'en-GB': 'en', de: 'de' };

const box = { maxWidth: 760, margin: '0 auto', padding: '32px 18px 64px', color: '#e8efe4', lineHeight: 1.6, fontSize: 15 };
const tab = (on) => ({ ...btn.secondary(on), padding: '5px 12px' });
const row = { borderLeft: '5px solid #f0b429', background: '#16312b', borderRadius: '0 4px 4px 0', padding: '12px 16px', margin: '14px 0' };

function readLang() {
  try {
    const saved = localStorage.getItem('asym_lang');
    if (FROM_GAME[saved]) return FROM_GAME[saved];
    if (saved) return 'es';
  } catch (e) {}
  const nav = (navigator.language || 'es').toLowerCase();
  return nav.startsWith('en') ? 'en' : nav.startsWith('de') ? 'de' : 'es';
}

export default function TeamView() {
  const [lang, setLang] = useState('es');
  useEffect(() => {
    setLang(readLang());
    const sync = () => setLang(readLang());
    window.addEventListener('asym-lang', sync);
    return () => window.removeEventListener('asym-lang', sync);
  }, []);
  const pick = (l) => {
    setLang(l);
    try { localStorage.setItem('asym_lang', l === 'en' ? 'en-GB' : l); } catch (e) {}
  };
  const t = TEXT[lang];
  return (
    <main translate="no" style={{ minHeight: '100dvh', background: '#0e1f1b' }}>
      <div style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ color: '#f0b429', textDecoration: 'none', fontSize: 13 }}>{t.back}</Link>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={tab(lang === 'es')} onClick={() => pick('es')}>ES</button>
            <button type="button" style={tab(lang === 'en')} onClick={() => pick('en')}>EN</button>
            <button type="button" style={tab(lang === 'de')} onClick={() => pick('de')}>DE</button>
          </div>
        </div>
        <h1 style={{ fontSize: 26, margin: '16px 0 4px' }}>{t.title}</h1>
        <p style={{ opacity: 0.7, margin: '0 0 18px' }}>{t.sub}</p>
        <section style={row}>
          <h2 style={{ fontSize: 17, margin: '0 0 4px', color: '#fff' }}>{t.langs[0]}</h2>
          <p style={{ margin: 0 }}>{t.me} (<a href={`mailto:${MAIL}`} style={{ color: '#f0b429' }}>{MAIL}</a>)</p>
        </section>
        <section style={row}>
          <h2 style={{ fontSize: 17, margin: '0 0 4px', color: '#fff' }}>{t.langs[1]}</h2>
          <p style={{ margin: 0 }}>{t.skb}</p>
        </section>
        <p style={{ marginTop: 32, fontSize: 13 }}>
          <Link href="/legal" style={{ color: '#f0b429', opacity: 0.85 }}>{t.legal}</Link>
        </p>
      </div>
    </main>
  );
}
