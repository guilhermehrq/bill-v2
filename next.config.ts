import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes can be re-enabled later once routes stabilize; for the
  // in-progress auth flow it creates noise versus value.
};

export default nextConfig;
