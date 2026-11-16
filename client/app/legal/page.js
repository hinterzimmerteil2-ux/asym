import Link from 'next/link';

export const metadata = { title: 'Aviso legal | Réplica' };

const MAIL = 'hinterzimmerteil2@gmail.com';

const box = { maxWidth: 760, margin: '0 auto', padding: '32px 18px 64px', color: '#e8e6ef', lineHeight: 1.6, fontSize: 15 };
const h2 = { fontSize: 18, margin: '28px 0 8px', color: '#fff' };

export default function Legal() {
  return (
    <main style={{ minHeight: '100dvh', background: '#12111a' }}>
      <div style={box}>
        <Link href="/" style={{ color: '#d94a52', textDecoration: 'none', fontSize: 13 }}>Volver al juego</Link>
        <h1 style={{ fontSize: 26, margin: '16px 0 4px' }}>Aviso legal y contacto</h1>
        <p style={{ opacity: 0.7, margin: 0 }}>Réplica es un juego gratuito hecho por un aficionado, sin fines de lucro.</p>

        <h2 style={h2}>Proyecto de aficionado y parodia</h2>
        <p>Réplica es un proyecto personal, gratuito y sin publicidad ni compras. No está afiliado, patrocinado ni respaldado por ninguna empresa, marca, estudio ni creador cuyo estilo, nombre o humor pueda parecerse al de algún elemento del juego. Algunas habilidades, nombres y bromas son parodia o referencia de internet. Cualquier parecido con personas reales es casual o satírico y no pretende ofender ni difamar a nadie.</p>

        <h2 style={h2}>Reglas de uso</h2>
        <p>Se usa bajo tu propia responsabilidad y se ofrece tal cual, sin garantías. Está prohibido acosar, amenazar, discriminar o publicar datos personales en el chat o en los nombres de jugador y de sala. Se puede expulsar o bloquear a quien lo haga. Las salas pueden reiniciarse y los servidores pueden caer sin previo aviso.</p>

        <h2 style={h2}>Privacidad</h2>
        <p>No hay cuentas obligatorias. Para que el juego funcione, el servidor procesa el apodo que eliges, los mensajes del chat de la sala, tus entradas de juego y el nombre de la sala, y los guarda solo el tiempo que dura la partida o los registros técnicos del alojamiento. No vendemos ni cedemos datos para publicidad. No escribas datos personales en apodos, salas o chat. El juego usa almacenamiento local del navegador para recordar tus ajustes (por ejemplo teclas y preferencias). El alojamiento lo prestan Render (servidor) y Vercel (web), que pueden registrar tu dirección IP y datos técnicos según sus propias políticas.</p>

        <h2 style={h2}>Contenido de la comunidad</h2>
        <p>Los mapas y textos que crees o compartas siguen siendo tuyos, pero al publicarlos en el juego nos das permiso para mostrarlos a otros jugadores. No subas material que no tengas derecho a usar.</p>

        <h2 style={h2}>Créditos y licencias</h2>
        <p>Modelo de Jeffrey: SinisterClock, licencia CC-BY-NC 4.0 (uso no comercial, con atribución). Otros recursos de terceros se usan bajo sus licencias respectivas. Si eres autor de algo y quieres corrección de crédito o retirada, escribe al contacto de abajo.</p>

        <h2 style={h2}>Menores</h2>
        <p>El juego no está dirigido a menores de 13 años. Si un menor aparece en una situación de riesgo en el chat, avisa al contacto y a las autoridades de tu país.</p>

        <h2 style={h2}>Contacto y retirada de contenido</h2>
        <p>Para dudas, reportes, derechos de autor o peticiones de retirada, escribe a <a href={`mailto:${MAIL}`} style={{ color: '#d94a52' }}>{MAIL}</a>. Indica qué elemento es, dónde aparece y por qué te afecta. Se revisa y se retira lo que corresponda lo antes posible.</p>

        <p style={{ opacity: 0.5, fontSize: 12, marginTop: 32 }}>Este texto es informativo y no constituye asesoría legal.</p>
      </div>
    </main>
  );
}
