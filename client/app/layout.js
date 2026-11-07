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
        <style dangerouslySetInnerHTML={{ __html: '.beat { stroke-dasharray: 1; stroke-dashoffset: 0; animation: beat 1.4s ease-out 1; } @keyframes beat { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } } @keyframes dealIn { from { opacity: 0; transform: translateY(40px) rotate(-8deg) scale(0.85); } to { opacity: 1; transform: none; } } .draft-card { animation: dealIn 420ms cubic-bezier(.2,.9,.3,1.2) both; transition: transform 160ms, box-shadow 160ms; } .draft-card:hover { transform: translateY(-8px); box-shadow: 0 14px 28px rgba(0,0,0,0.65); } @media (prefers-reduced-motion: reduce) { .beat, .draft-card { animation: none; transition: none; } } button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #f0c26b; outline-offset: 2px; } body, input, textarea, button, select { font-family: inherit; } body, input, textarea, button, select { text-transform: lowercase; } pre, code { text-transform: none; }' }} />
        {children}
        <I18n />
      </body>
    </html>
  );
}
