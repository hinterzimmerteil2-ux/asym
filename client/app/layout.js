import I18n from '../components/I18n';

export const metadata = {
  title: 'Réplica',
  description: 'Juego asimétrico online',
};

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, overscrollBehavior: 'none', WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent' }}>
        <style dangerouslySetInnerHTML={{ __html: 'body, input, textarea, button, select { text-transform: lowercase; } pre, code { text-transform: none; }' }} />
        {children}
        <I18n />
      </body>
    </html>
  );
}
