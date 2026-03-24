# Reown Social Login Debug App — Design Spec

**Date:** 2026-03-24
**Status:** Approved

## Purpose

A minimal Next.js 16 app to isolate and debug the Reown social login issue in `v0-crypto-world-cup-app`. By stripping away SIWE, Farcaster, NextAuth, and all other concerns, any failure here is attributable directly to the Reown/AppKit layer.

## Architecture

**Framework:** Next.js 16 (App Router), React 19
**Wallet stack:** `@reown/appkit@1.8.19`, `@reown/appkit-adapter-wagmi@1.8.19`, `wagmi@^2.12.0`, `viem@^2.21.0`
**Network:** Base mainnet only
**Social login:** Google, Apple, GitHub, X (Twitter) — same as reference app

## File Structure

```
test-reown-social-login/
├── app/
│   ├── layout.tsx          # Wraps children in Web3Provider + QueryClientProvider
│   └── page.tsx            # Single-page UI
├── components/
│   └── providers/
│       └── web3-provider.tsx  # WagmiProvider with SSR cookie hydration
├── lib/
│   └── wallet/
│       ├── wagmi-core.ts      # WagmiAdapter, Base network, cookie storage
│       └── appkit-modal.ts    # createAppKit with social login features
├── .env.local              # NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (copied from reference app)
├── next.config.mjs         # webpack externals for AppKit (pino-pretty, lokijs, encoding)
├── package.json
└── tsconfig.json
```

## Wallet Config (copied verbatim from reference app)

- `wagmi-core.ts`: `WagmiAdapter` with `cookieStorage`, `ssr: true`, Base network, project ID from env
- `appkit-modal.ts`: `createAppKit` at module level with `features: { email: true, socials: ['google', 'apple', 'github', 'x'] }`, `enableAuthLogger: true`

## Page UI

**Not connected:**
- Vertically and horizontally centered "Connect Wallet" button
- Clicking calls `modal.open()`

**Connected:**
- Full wallet address (not truncated — useful for debugging)
- Chain name and chain ID
- "Disconnect" button calling `useDisconnect()`

## What is intentionally excluded

- SIWE / NextAuth authentication
- Farcaster Mini App connector
- Any backend, database, or API routes
- CSP headers (same as current reference app state)

## Success criteria

The app loads, the AppKit modal opens, social login can be attempted, and the connected wallet address + chain are displayed.
