import type { NextConfig } from "next";

type NextConfigWithTurbopackRoot = NextConfig & {
  turbopack?: {
    root?: string;
  };
};

const nextConfig: NextConfigWithTurbopackRoot = {
  /* config options here */
  reactCompiler: true,
  // Fix for Turbopack choosing the wrong workspace root when multiple lockfiles exist.
  // Ensures Next picks BarMatch as root (and thus loads BarMatch/.env.local correctly).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
