import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare Tokens',
  description: 'Compare safety scores of multiple Base tokens side-by-side with AI-powered analysis and on-chain attestation.',
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
