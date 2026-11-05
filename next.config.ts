import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingExcludes: {
    "/*": ["./.local/**/*", "./entrega/**/*", "./.env*", "./agent/**/agent.json"],
  },
};
export default config;
