/** @type {import('next').NextConfig} */
const nextConfig = {
  // Package transpilation
  transpilePackages: ["@workspace/ui"],
  
  // Image optimization
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.alayon.store",
      },
      {
        protocol: "https",
        hostname: "*.sharewin.pro",
      },
    ],
  },
  
  // Local network development
  ...(process.env.NODE_ENV !== 'production' && {
    allowedDevOrigins: [
      'localhost',
      '127.0.0.1',
      '192.168.1.*',  // Allow all local network IPs
      '*.local',      // Allow mDNS domains
      'alayon.local',
      'sharewin.pro',
      'alayon.store',
    ],
  }),
  
  // API proxy to backend
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_URL || 'https://api.sharewin.pro';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
  
  // CORS and Security Headers
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProduction 
      ? ['https://admin.alayon.store', 'https://alayon.store']
      : ['*'];
    
    return [
      {
        source: '/:path*',
        headers: [
          // CORS
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: allowedOrigins[0],
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
          // Security headers (production only)
          ...(isProduction ? [
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin',
            },
          ] : []),
        ],
      },
    ];
  },
  
  // Build optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Experimental features
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./**/api/**/*'],
    },
  },
};

export default nextConfig;