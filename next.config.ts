import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  reactCompiler: true,
  trailingSlash: true,
  images: { unoptimized: true },
};
export default config;
