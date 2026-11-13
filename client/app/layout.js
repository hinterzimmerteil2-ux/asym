import I18n from '../components/I18n';

export const metadata = {
  title: 'Réplica',
  description: 'Juego asimétrico online',
};

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#1a1215', fontFamily: '"Bricolage Grotesque", system-ui, -apple-system, sans-serif', overscrollBehavior: 'none', WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent' }}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" />
        <style dangerouslySetInnerHTML={{ __html: '.beat { stroke-dasharray: 1; stroke-dashoffset: 0; animation: beat 1.4s ease-out 1; } @keyframes beat { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } } @keyframes dealIn { from { opacity: 0; transform: translateY(40px) rotate(-8deg) scale(0.85); } to { opacity: 1; transform: none; } } .draft-card { animation: dealIn 420ms cubic-bezier(.2,.9,.3,1.2) both; transition: transform 160ms, box-shadow 160ms; } .draft-card:hover { transform: translateY(-8px); box-shadow: 0 14px 28px rgba(0,0,0,0.65); } @keyframes heartPulse { 0%,100% { opacity: calc(0.35 + var(--lvl) * 0.2); } 18% { opacity: 1; } 32% { opacity: 0.45; } 46% { opacity: calc(0.8 + var(--lvl) * 0.2); } } .heart-pulse { animation: heartPulse 1s ease-in-out infinite; } @media (prefers-reduced-motion: reduce) { .heart-pulse { animation: none; } .beat, .draft-card { animation: none; transition: none; } } button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #f0c26b; outline-offset: 2px; } body, input, textarea, button, select { font-family: inherit; } body, input, textarea, button, select { text-transform: lowercase; } pre, code { text-transform: none; } body { background-color: #0d0709; } body::after { content: \"\"; position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 60; background: radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(18,2,6,0.38) 100%), linear-gradient(0deg, rgba(170,40,25,0.09), rgba(0,0,0,0) 22%); } body::before { content: \"\"; position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 61; opacity: 0.35; background-image: radial-gradient(circle, #ff8a3d 0 1.4px, transparent 2px), radial-gradient(circle, #ffb070 0 1px, transparent 1.6px), radial-gradient(circle, #ff6a2a 0 1.2px, transparent 1.8px); background-size: 310px 340px, 230px 270px, 410px 380px; background-position: 20px 40px, 130px 200px, 260px 90px; animation: emberDrift 26s linear infinite; } html.lowfx body::before, html.lowfx body::after { display: none; } @keyframes emberDrift { to { background-position: 20px -300px, 130px -70px, 260px -290px; } } @media (prefers-reduced-motion: reduce) { body::before { animation: none; } }' }} />
        {children}
        <I18n />
      </body>
    </html>
  );
}
