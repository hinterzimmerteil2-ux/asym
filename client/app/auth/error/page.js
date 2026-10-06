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
  main: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#12131a', fontFamily: 'system-ui, -apple-system, sans-serif' },
  card: { width: 360, padding: 28, borderRadius: 12, background: '#1b1d29', border: '1px solid #2a2d3d', textAlign: 'center' },
  title: { color: '#e0555f', fontWeight: 600, fontSize: 15, margin: '0 0 8px' },
  message: { color: '#8a8da3', fontSize: 13, margin: '0 0 20px' },
  link: { color: '#5468ff', fontSize: 13, textDecoration: 'none' },
};
