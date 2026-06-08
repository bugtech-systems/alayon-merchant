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
  
  // Only apply allowedDevOrigins in development
  ...(process.env.NODE_ENV !== 'production' && {
    allowedDevOrigins: ['192.168.1.140', '192.168.1.120', 'localhost', '127.0.0.1', 'sharewin.pro', 'alayon.store'],
  }),
  
  async headers() {
    // Simplify CORS headers - remove wildcard origin in production for security
    const corsHeaders = process.env.NODE_ENV === 'production' 
      ? [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'https://alayon.store' }, // Specific domain
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ]
      : [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ];
    
    return [
      {
        source: '/:path*',
        headers: corsHeaders,
      },
    ];
  },
  
  experimental: {
    // Exclude API routes from static optimization
    outputFileTracingExcludes: {
      '*': ['./**/api/**/*'],
    },
  },
  typescript: {
    ignoreBuildErrors: true
  }
}

export default nextConfig