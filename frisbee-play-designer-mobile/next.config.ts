import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — produces a fully static site in /out that can be hosted
  // anywhere (Vercel, Netlify, Cloudflare Pages, GitHub Pages, any S3 bucket, etc.)
  // No Node.js server required; the app is 100% client-side.
  output: "export",
  // Generate trailing slashes for compatibility with static hosts that
  // require directory-style URLs (e.g. GitHub Pages).
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
