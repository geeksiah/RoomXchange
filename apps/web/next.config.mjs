import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@roomxchange/contracts", "@roomxchange/shared"],
  typedRoutes: true,
  outputFileTracingRoot: path.resolve(process.cwd(), "../..")
};

export default nextConfig;
