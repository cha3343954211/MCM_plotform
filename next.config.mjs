import { mkdirSync } from 'fs';
import { join } from 'path';

// Ensure upload directories exist on startup
try {
  mkdirSync(join(process.cwd(), 'public', 'uploads', 'competitions'), { recursive: true });
} catch {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },
};

export default nextConfig;
