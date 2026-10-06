export const metadata = {
  title: 'Réplica',
  description: 'Juego asimétrico online',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
