import { ImageResponse } from 'next/og';

export const alt = 'Pinioscan — AI Token Safety Scanner';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #0f1a0f 50%, #0a0a0f 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 80, marginBottom: 10, display: 'flex' }}>🔍</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            background: 'linear-gradient(90deg, #4ade80, #10b981)',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 20,
            display: 'flex',
          }}
        >
          Pinioscan
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#a1a1aa',
            maxWidth: 700,
            textAlign: 'center',
            lineHeight: 1.4,
            display: 'flex',
          }}
        >
          AI-Powered Token Safety Scanner for Base
        </div>
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            gap: 20,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: '#52525b',
              padding: '8px 16px',
              border: '1px solid #27272a',
              borderRadius: 8,
              display: 'flex',
            }}
          >
            Paste address → AI analysis → On-chain attestation
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontSize: 16,
            color: '#3f3f46',
            display: 'flex',
            gap: 10,
          }}
        >
          <span>Powered by Gemini AI + Base</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
