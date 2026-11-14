import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 全站都是私人、依請求而變的內容，不需要 Cache Components。
  cacheComponents: false,
  serverExternalPackages: ["sharp", "@resvg/resvg-js", "heic-convert", "@libsql/client"],
  outputFileTracingIncludes: {
    "/api/**": ["./assets/fonts/**"],
  },
  images: {
    // 衍生檔已由我們自己產生，不再經過 next/image 的最佳化。
    unoptimized: true,
  },
  experimental: {
    // 本機模式的直接上傳走 route handler，需要放寬 body 大小。
    proxyClientMaxBodySize: "200mb",
  } as NextConfig["experimental"],
};

export default nextConfig;
