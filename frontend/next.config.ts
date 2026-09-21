import type { NextConfig } from "next";

const allowedDevOrigins = (process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    try {
      const url = new URL(origin);
      return [url.hostname, url.host];
    } catch {
      return [origin];
    }
  })
  .flat();

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
