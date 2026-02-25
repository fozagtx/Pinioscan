'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Token {
  address: string;
  name: string;
  symbol: string;
  logoURI?: string;
  decimals: number;
}

const UNISWAP_BASE_LIST = 'https://tokens.uniswap.org';
const TRUST_CDN = 'https://assets-cdn.trustwallet.com/blockchains/base/assets';
const BASE_CHAIN_ID = 8453;

let tokenCache: Token[] | null = null;

async function loadTokens(): Promise<Token[]> {
  if (tokenCache) return tokenCache;
  try {
    const res = await fetch(UNISWAP_BASE_LIST);
    const data = await res.json();
    tokenCache = (data.tokens || [])
      .filter((t: any) => t.chainId === BASE_CHAIN_ID)
      .map((t: any) => ({
        address: t.address,
        name: t.name,
        symbol: t.symbol,
        logoURI: t.logoURI || `${TRUST_CDN}/${t.address}/logo.png`,
        decimals: t.decimals,
      }));
    return tokenCache!;
  } catch {
    return [];
  }
}

export function TokenPicker({
  value,
  onChange,
  placeholder = '0x... paste address or search token',
  disabled = false,
  compact = false,
}: {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [results, setResults] = useState<Token[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [logoError, setLogoError] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load token list once
  useEffect(() => {
    loadTokens().then(setTokens);
  }, []);

  // Sync external value
  useEffect(() => {
    if (value && value !== query) {
      setQuery(value);
      // Try to find token for display
      const found = tokens.find(t => t.address.toLowerCase() === value.toLowerCase());
      if (found) setSelectedToken(found);
    }
  }, [value, tokens]);

  // Search
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setSelectedToken(null);

    if (q.match(/^0x[a-fA-F0-9]{40}$/)) {
      // It's a full address — pass through directly
      onChange(q);
      setOpen(false);
      return;
    }

    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const lower = q.toLowerCase();
    const matched = tokens
      .filter(t =>
        t.symbol.toLowerCase().includes(lower) ||
        t.name.toLowerCase().includes(lower) ||
        t.address.toLowerCase().startsWith(lower)
      )
      .slice(0, 8);

    setResults(matched);
    setOpen(matched.length > 0);
  }, [tokens, onChange]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectToken = (token: Token) => {
    setSelectedToken(token);
    setQuery(token.address);
    onChange(token.address);
    setOpen(false);
  };

  const clearSelection = () => {
    setSelectedToken(null);
    setQuery('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected token chip */}
      {selectedToken ? (
        <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-3.5 group">
          <img
            src={logoError.has(selectedToken.address) ? '' : selectedToken.logoURI}
            alt="Token"
            className="w-7 h-7 rounded-full bg-zinc-800"
            onError={() => setLogoError(prev => new Set(prev).add(selectedToken.address))}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-200 text-sm">{selectedToken.symbol}</span>
              <span className="text-zinc-500 text-xs truncate">{selectedToken.name}</span>
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">{selectedToken.address.slice(0, 10)}...{selectedToken.address.slice(-6)}</span>
          </div>
          <button
            onClick={clearSelection}
            aria-label="Clear selected token"
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-all ${
            compact
              ? 'bg-transparent border-none px-0 py-0'
              : 'bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-3.5 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10'
          }`}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden max-h-[320px] overflow-y-auto">
          {results.map(token => (
            <button
              key={token.address}
              onClick={() => selectToken(token)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/60 transition-colors cursor-pointer text-left"
            >
              <img
                src={logoError.has(token.address) ? '' : token.logoURI}
                alt="Token"
                className="w-8 h-8 rounded-full bg-zinc-800 shrink-0"
                onError={() => setLogoError(prev => new Set(prev).add(token.address))}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-200 text-sm">{token.symbol}</span>
                  <span className="text-zinc-500 text-xs truncate">{token.name}</span>
                </div>
                <span className="text-[10px] text-zinc-600 font-mono">{token.address.slice(0, 16)}...{token.address.slice(-6)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
