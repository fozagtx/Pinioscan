import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './rate-limit';

const ALLOWED_ORIGINS = [
  'https://pinioscan.xyz',
  'https://www.pinioscan.xyz',
  'http://localhost:3000',
  'http://localhost:3001',
];

/** Get client IP from request */
export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Add CORS and security headers to a response */
export function withSecurityHeaders(
  res: NextResponse | Response,
  req: NextRequest
): NextResponse | Response {
  const origin = req.headers.get('origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  return res;
}

/** Check rate limit, return error response if blocked, null if OK */
export function checkRateLimit(
  req: NextRequest,
  maxRequests = 5,
  windowMs = 60 * 60 * 1000
): NextResponse | null {
  const ip = getClientIP(req);
  const result = rateLimit(ip, maxRequests, windowMs);
  if (result) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(result.retryAfter) },
      }
    );
  }
  return null;
}

/** Sanitize error message — don't leak internals */
export function sanitizeError(error: any): string {
  const msg = error?.message || 'Internal server error';
  // Strip file paths, stack traces
  if (msg.includes('/') || msg.includes('\\') || msg.length > 200) {
    return 'Scan failed. Please try again.';
  }
  return msg;
}
