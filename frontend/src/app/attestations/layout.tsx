import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'On-Chain Attestations',
  description: 'View all Pinioscan token safety attestations recorded on Base blockchain. Transparent, verifiable, immutable.',
};

export default function AttestationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
