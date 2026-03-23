/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@roomxchange/contracts", "@roomxchange/shared"],
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
