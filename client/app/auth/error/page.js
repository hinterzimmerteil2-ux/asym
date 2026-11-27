'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'Ocurrió un error al iniciar sesión.';
  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <p style={styles.title}>No se pudo iniciar sesión</p>
        <p style={styles.message}>{decodeURIComponent(message)}</p>
        <Link href="/" style={styles.link}>Volver e intentar de nuevo</Link>
      </div>
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorContent />
    </Suspense>
  );
}

const styles = {
  main: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1f1b', fontFamily: 'inherit' },
  card: { width: 360, padding: 28, borderRadius: 4, background: '#16312b', border: '2px solid #4a7366', textAlign: 'center' },
  title: { color: '#e0503c', fontFamily: 'var(--display)', fontStretch: '72%', fontWeight: 800, fontSize: 22, margin: '0 0 8px' },
  message: { color: '#9cb2a6', fontSize: 13, margin: '0 0 20px' },
  link: { color: '#f0b429', fontSize: 13, textDecoration: 'none' },
};
