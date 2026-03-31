import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendURL = process.env.NEXT_BACKEND_URL ?? "http://localhost:8080";

    return [
      {
        source: "/api/:path*",
        destination: `${backendURL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
