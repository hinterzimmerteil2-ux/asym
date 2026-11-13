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

module.exports = nextConfig;
