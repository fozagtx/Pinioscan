import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio Scanner',
  description: 'Scan your entire Base wallet portfolio for token safety risks. Paste any wallet address.',
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
