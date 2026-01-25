import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@node-rs/argon2"],

  // Configuration des images externes (ESPN headshots, Cloudinary avatars)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a.espncdn.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  // Augmenter la limite des headers pour éviter l'erreur 431
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Configuration pour augmenter la limite des headers
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
