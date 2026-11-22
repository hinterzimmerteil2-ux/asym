/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', 'three-stdlib', 'maath', 'meshline', 'camera-controls', 'detect-gpu', 'its-fine', 'zustand', 'suspend-react', 'react-use-measure', 'stats-gl', 'three-mesh-bvh', 'hls.js'],
  webpack: (config) => {
    const orig = config.entry;
    config.entry = async () => {
      const entries = await orig();
      Object.keys(entries).forEach((k) => {
        if ((k === 'main-app' || k === 'main') && Array.isArray(entries[k]) && !entries[k].includes('./polyfills.js')) entries[k].unshift('./polyfills.js');
      });
      return entries;
    };
    return config;
  },
};

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
];

nextConfig.poweredByHeader = false;
const longCache = [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=604800' }];
nextConfig.headers = async () => [
  { source: '/:path*', headers: securityHeaders },
  ...['models', 'props', 'icons', 'memes'].map((d) => ({ source: `/${d}/:path*`, headers: longCache })),
];

module.exports = nextConfig;
