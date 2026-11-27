import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/atkinson-hyperlegible-next';
import './globals.css';
import I18n from '../components/I18n';
import BoardScroll from '../components/BoardScroll';

export const metadata = {
  title: 'Réplica',
  description: 'Juego asimétrico online',
};

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
        <I18n />
        <BoardScroll />
      </body>
    </html>
  );
}
