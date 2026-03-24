import path from 'path'
import { fileURLToPath } from 'url'
import type { NextConfig } from 'next'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  compiler: {
    // Keep console.warn/error so AppKit diagnostics survive production builds
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["warn", "error"] } : false,
  },
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No CSP — same as reference app current state (removed to diagnose social login)
        ],
      },
    ]
  },
  webpack: (config, { webpack }) => {
    // Required by AppKit — prevents webpack from bundling Node-only modules
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    const emptyModulePath = path.resolve(__dirname, 'empty-module.js')
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/.*\/test\/.*/, emptyModulePath),
      new webpack.NormalModuleReplacementPlugin(/.*\.(test|spec)\.(js|mjs|ts|tsx)$/, emptyModulePath),
      new webpack.IgnorePlugin({ resourceRegExp: /^desm$/ })
    )

    return config
  },
}

export default nextConfig
