import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  distDir: process.env.GAMEHUB_NEXT_DIST_DIR ?? ".next"
};

export default nextConfig;
