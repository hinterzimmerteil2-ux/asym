export const metadata = {
  title: 'Réplica',
  description: 'Juego asimétrico online',
};

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, overscrollBehavior: 'none', WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent' }}>{children}</body>
    </html>
  );
}
