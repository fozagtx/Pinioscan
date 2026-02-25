'use client';

import { useState } from 'react';

const TRUST_WALLET_CDN = 'https://assets-cdn.trustwallet.com/blockchains/base/assets';

export function TokenLogo({ address, size = 48, className = '' }: {
  address: string; size?: number; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const logoUrl = `${TRUST_WALLET_CDN}/${address}/logo.png`;

  if (failed) {
    return (
      <div
        className={`rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt="Token logo"
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
