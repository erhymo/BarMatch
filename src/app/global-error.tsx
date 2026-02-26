'use client';

import { useEffect, useState } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [details, setDetails] = useState('');

  useEffect(() => {
    // Log the error for debugging
    console.error('[GlobalError]', error);

    const info = [
      `Message: ${error.message}`,
      error.digest ? `Digest: ${error.digest}` : null,
      `Stack: ${error.stack ?? 'N/A'}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}`,
      `UA: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
      `Time: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    setDetails(info);
  }, [error]);

  return (
    <html lang="no">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0a1628', color: '#fff' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️ Noe gikk galt</h1>
          <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
            En feil oppstod. Prøv å laste siden på nytt.
          </p>

          <button
            onClick={reset}
            style={{
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              cursor: 'pointer',
              marginBottom: '1.5rem',
            }}
          >
            Last inn på nytt
          </button>

          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.875rem' }}>
              Tekniske detaljer (for feilsøking)
            </summary>
            <pre
              style={{
                marginTop: '0.5rem',
                background: '#1e293b',
                padding: '1rem',
                borderRadius: 8,
                fontSize: '0.75rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: '#e2e8f0',
              }}
            >
              {details}
            </pre>
          </details>
        </div>
      </body>
    </html>
  );
}

