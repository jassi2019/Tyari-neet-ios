/** @type {import('next').NextConfig} */

const allowedImageDomains = [{ protocol: "https", hostname: "*" }];

const nextConfig = {
  images: {
    remotePatterns: allowedImageDomains,
    unoptimized: true,
  },
  output: "standalone",
  reactStrictMode: false,
  generateBuildId: async () => {
    return Date.now().toString();
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store, must-revalidate" },
      ],
    },
  ],
};

export default nextConfig;
