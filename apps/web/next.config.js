const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:3001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Development only: in production the host routes /v1/api to the API.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [{ source: "/v1/api/:path*", destination: `${apiOrigin}/v1/api/:path*` }];
  },
};

export default nextConfig;
