import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Vanity URLs for the edge installers — streamo.in/install.sh (and .ps1)
      // fetch straight from the latest GitHub Release. Keeps the customer-facing
      // command short and lets us change hosting later without breaking anyone.
      {
        source: "/install.sh",
        destination:
          "https://github.com/VishweshMashru/Relay/releases/latest/download/install.sh",
      },
      {
        source: "/install.ps1",
        destination:
          "https://github.com/VishweshMashru/Relay/releases/latest/download/install.ps1",
      },
    ];
  },
};

export default nextConfig;
