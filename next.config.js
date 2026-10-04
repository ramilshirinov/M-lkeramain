/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // ffmpeg ikili faylları bundle edilməməlidir (Turbopack yolu pozur: "spawn /ROOT/... ENOENT").
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;