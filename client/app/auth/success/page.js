'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storeSession, decodeTokenPayload } from '../../../lib/session';

export default function AuthSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    if (!token) {
      router.replace('/auth/error?message=No se recibió token de sesión.');
      return;
    }
    const payload = decodeTokenPayload(token);
    storeSession(token, payload?.name);
    router.replace('/');
  }, [router]);

  return (
    <main style={styles.main}>
      <p style={styles.text}>Iniciando sesión...</p>
    </main>
  );
}

const styles = {
  main: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#12131a' },
  text: { color: '#8a8da3', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14 },
};
