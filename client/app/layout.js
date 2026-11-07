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
        <style dangerouslySetInnerHTML={{ __html: '.beat { stroke-dasharray: 1; stroke-dashoffset: 0; animation: beat 1.4s ease-out 1; } @keyframes beat { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } } @media (prefers-reduced-motion: reduce) { .beat { animation: none; } } button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #f0c26b; outline-offset: 2px; } body, input, textarea, button, select { font-family: inherit; } body, input, textarea, button, select { text-transform: lowercase; } pre, code { text-transform: none; }' }} />
        {children}
        <I18n />
      </body>
    </html>
  );
}
