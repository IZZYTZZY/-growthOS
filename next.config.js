/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode catches double-render issues in development
  reactStrictMode: true,

  // Image optimization domains
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'cdninstagram.com' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: 'graph.instagram.com' },
    ],
  },

  // Allow Vercel Edge runtime imports
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr'],
  },

  // Headers for security hardening
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
