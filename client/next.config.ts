import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// IP del Mac nella rete locale, letti a ogni avvio di `next dev`: se l'IP cambia basta riavviare.
// allowedDevOrigins vuole solo l'hostname (niente http:// né porta).
const lanIps = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  allowedDevOrigins: [...lanIps, "*.local"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
