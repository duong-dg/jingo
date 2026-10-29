import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  experimental: { proxyClientMaxBodySize: '12mb', proxyTimeout: 120000 },
  async redirects(){return[{source:'/en/cam-nang/:path*',destination:'/en/blog/:path*',permanent:true},{source:'/en/diem-den/:path*',destination:'/en/destinations/:path*',permanent:true}];},
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${process.env.INTERNAL_API_URL || 'http://localhost:4000'}/api/v1/:path*` }];
  }
};
export default config;
