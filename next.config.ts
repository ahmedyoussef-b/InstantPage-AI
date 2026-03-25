
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // On marque chromadb comme externe pour éviter que Webpack ne tente de parser 
  // ses importations dynamiques (comme chromadb-default-embed depuis unpkg)
  serverExternalPackages: ['chromadb'],
  // Autoriser l'origine de Firebase Studio pour éviter les blocages CORS en dev
  experimental: {
    allowedDevOrigins: ["6000-firebase-studio-1774323789446.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev"]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
