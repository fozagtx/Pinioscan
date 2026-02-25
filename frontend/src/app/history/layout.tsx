import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scan History',
  description: 'Browse all tokens scanned and attested on-chain via Base. Filter by risk level and track your scanning history.',
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
