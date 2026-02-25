import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pinioscan Token Scan';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a0f 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Top gradient bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #4ade80, #10b981)' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #4ade80, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '26px', fontWeight: 'bold',
          }}>✓</div>
          <span style={{
            fontSize: '48px', fontWeight: 'bold',
            background: 'linear-gradient(90deg, #4ade80, #10b981)',
            backgroundClip: 'text', color: 'transparent',
          }}>Pinioscan</span>
        </div>

        {/* Token address */}
        <div style={{
          padding: '16px 32px', borderRadius: '16px',
          border: '1px solid #27272a', background: '#18181b44',
          display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px',
        }}>
          <span style={{ fontSize: '24px' }}>🔍</span>
          <span style={{ fontSize: '32px', color: '#e4e4e7', fontFamily: 'monospace' }}>{short}</span>
        </div>

        {/* CTA */}
        <p style={{ fontSize: '22px', color: '#71717a', margin: '0' }}>
          View the full AI safety report for this token
        </p>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', color: '#52525b' }}>pinioscan.xyz</span>
          <span style={{ fontSize: '15px', color: '#3f3f46' }}>•</span>
          <span style={{ fontSize: '15px', color: '#52525b' }}>AI Token Safety on Base</span>
          <span style={{ fontSize: '15px', color: '#3f3f46' }}>•</span>
          <span style={{ fontSize: '15px', color: '#52525b' }}>Powered by Gemini AI + Base</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
