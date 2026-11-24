'use client';
import { btn } from '../lib/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const MAIL = 'hinterzimmerteil2@gmail.com';

const TEXT = {
  es: {
    back: 'Volver al juego',
    title: 'Aviso legal y contacto',
    sub: 'Réplica es un juego gratuito hecho por un aficionado, sin fines de lucro.',
    s: [
      ['Proyecto de aficionado y parodia', 'Réplica es un proyecto personal, gratuito y sin publicidad ni compras. No está afiliado, patrocinado ni respaldado por ninguna empresa, marca, estudio ni creador cuyo estilo, nombre o humor pueda parecerse al de algún elemento del juego. Algunas habilidades, nombres y bromas son parodia o referencia de internet. Cualquier parecido con personas reales es casual o satírico y no pretende ofender ni difamar a nadie.'],
      ['Reglas de uso', 'Se usa bajo tu propia responsabilidad y se ofrece tal cual, sin garantías. Está prohibido acosar, amenazar, discriminar o publicar datos personales en el chat o en los nombres de jugador y de sala. Se puede expulsar o bloquear a quien lo haga. Las salas pueden reiniciarse y los servidores pueden caer sin previo aviso.'],
      ['Privacidad', 'No hay cuentas obligatorias. Para que el juego funcione, el servidor procesa el apodo que eliges, los mensajes del chat de la sala, tus entradas de juego y el nombre de la sala, y los guarda solo el tiempo que dura la partida o los registros técnicos del alojamiento. No vendemos ni cedemos datos para publicidad. No escribas datos personales en apodos, salas o chat. El juego usa almacenamiento local del navegador para recordar tus ajustes (por ejemplo teclas y preferencias). El alojamiento lo prestan Render (servidor) y Vercel (web), que pueden registrar tu dirección IP y datos técnicos según sus propias políticas.'],
      ['Contenido de la comunidad', 'Los mapas y textos que crees o compartas siguen siendo tuyos, pero al publicarlos en el juego nos das permiso para mostrarlos a otros jugadores. No subas material que no tengas derecho a usar.'],
      ['Créditos y licencias', 'Modelo de Jeffrey: SinisterClock, licencia CC-BY-NC 4.0 (uso no comercial, con atribución). Otros recursos de terceros se usan bajo sus licencias respectivas. Si eres autor de algo y quieres corrección de crédito o retirada, escribe al contacto de abajo.'],
      ['Menores', 'El juego no está dirigido a menores de 13 años. Si un menor aparece en una situación de riesgo en el chat, avisa al contacto y a las autoridades de tu país.'],
    ],
    contactH: 'Contacto y retirada de contenido',
    contactA: 'Para dudas, reportes, derechos de autor o peticiones de retirada, escribe a ',
    contactB: '. Indica qué elemento es, dónde aparece y por qué te afecta. Se revisa y se retira lo que corresponda lo antes posible.',
    note: 'Este texto es informativo y no constituye asesoría legal.',
  },
  en: {
    back: 'Back to the game',
    title: 'Legal notice and contact',
    sub: 'Réplica is a free game made by a hobbyist, not for profit.',
    s: [
      ['Fan project and parody', 'Réplica is a personal project: free, with no ads and no purchases. It is not affiliated with, sponsored by or endorsed by any company, brand, studio or creator whose style, name or humour may resemble an element of the game. Some abilities, names and jokes are parody or internet references. Any resemblance to real people is coincidental or satirical and is not meant to offend or defame anyone.'],
      ['Rules of use', 'You use it at your own risk and it is provided as is, with no warranty. Harassing, threatening or discriminating against others, or posting personal data in chat or in player and room names, is forbidden. Anyone who does so may be kicked or blocked. Rooms may reset and servers may go down without notice.'],
      ['Privacy', 'There are no mandatory accounts. To make the game work, the server processes the nickname you choose, room chat messages, your game inputs and the room name, and keeps them only for the length of the match or in the hosting provider\'s technical logs. We do not sell or share data for advertising. Do not write personal data in nicknames, rooms or chat. The game uses your browser\'s local storage to remember your settings (for example keys and preferences). Hosting is provided by Render (server) and Vercel (web), which may record your IP address and technical data under their own policies.'],
      ['Community content', 'Maps and texts you create or share remain yours, but by publishing them in the game you give us permission to show them to other players. Do not upload material you have no right to use.'],
      ['Credits and licences', 'Jeffrey model: SinisterClock, licence CC-BY-NC 4.0 (non-commercial use, with attribution). Other third-party assets are used under their respective licences. If you are the author of something and want a credit corrected or the item removed, write to the contact below.'],
      ['Minors', 'The game is not aimed at children under 13. If a minor appears to be at risk in chat, tell the contact and the authorities in your country.'],
    ],
    contactH: 'Contact and content removal',
    contactA: 'For questions, reports, copyright matters or removal requests, write to ',
    contactB: '. Say which item it is, where it appears and why it affects you. It will be reviewed and anything that applies will be removed as soon as possible.',
    note: 'This text is informational and is not legal advice.',
  },
};

const box = { maxWidth: 760, margin: '0 auto', padding: '32px 18px 64px', color: '#e8e6ef', lineHeight: 1.6, fontSize: 15 };
const h2 = { fontSize: 18, margin: '28px 0 8px', color: '#fff' };
const tab = (on) => ({ ...btn.secondary(on), padding: '5px 12px' });

export default function LegalView() {
  const [lang, setLang] = useState('es');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('legalLang');
      if (saved === 'es' || saved === 'en') { setLang(saved); return; }
    } catch (e) {}
    if (!(navigator.language || 'es').toLowerCase().startsWith('es')) setLang('en');
  }, []);
  const pick = (l) => {
    setLang(l);
    try { localStorage.setItem('legalLang', l); } catch (e) {}
  };
  const t = TEXT[lang];
  return (
    <main style={{ minHeight: '100dvh', background: '#12111a' }}>
      <div style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ color: '#d94a52', textDecoration: 'none', fontSize: 13 }}>{t.back}</Link>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={tab(lang === 'es')} onClick={() => pick('es')}>Español</button>
            <button type="button" style={tab(lang === 'en')} onClick={() => pick('en')}>English</button>
          </div>
        </div>
        <h1 style={{ fontSize: 26, margin: '16px 0 4px' }}>{t.title}</h1>
        <p style={{ opacity: 0.7, margin: 0 }}>{t.sub}</p>
        {t.s.map(([h, b]) => (
          <section key={h}>
            <h2 style={h2}>{h}</h2>
            <p>{b}</p>
          </section>
        ))}
        <h2 style={h2}>{t.contactH}</h2>
        <p>{t.contactA}<a href={`mailto:${MAIL}`} style={{ color: '#d94a52' }}>{MAIL}</a>{t.contactB}</p>
        <p style={{ opacity: 0.5, fontSize: 12, marginTop: 32 }}>{t.note}</p>
      </div>
    </main>
  );
}
