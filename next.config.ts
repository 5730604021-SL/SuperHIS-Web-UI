import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/his/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:8001"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
