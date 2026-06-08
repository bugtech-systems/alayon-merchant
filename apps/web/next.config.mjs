/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
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
  
  // Development-only settings
  ...(process.env.NODE_ENV !== 'production' && {
    allowedDevOrigins: ['192.168.1.140', '192.168.1.120', 'localhost', '127.0.0.1', 'sharewin.pro', 'alayon.store'],
  }),
  
  // API proxy to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.sharewin.pro/:path*',
      },
    ];
  },
  
  // Headers configuration
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const corsHeaders = isProduction 
      ? [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'https://admin.alayon.store' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ]
      : [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
        ];
    
    const securityHeaders = isProduction ? [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ] : [];
    
    return [
      {
        source: '/:path*',
        headers: [...corsHeaders, ...securityHeaders],
      },
    ];
  },
  
  // CRITICAL FIX: Add empty turbopack config
  turbopack: {},
  
  // Build optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  trailingSlash: false,
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./**/api/**/*'],
    },
  },
}

export default nextConfig