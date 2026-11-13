import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plaid access tokens and API keys live server-side only; never expose them to the browser.
  serverExternalPackages: ["plaid"],
};

export default nextConfig;
