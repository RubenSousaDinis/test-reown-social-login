# Reown Social Login Debug App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal Next.js 16 single-page app in `/Users/rubendinis/Documents/Code/test-reown-social-login` that connects a wallet via Reown AppKit (same config as `v0-crypto-world-cup-app`) and displays the address + chain after connection.

**Architecture:** Scaffold a fresh Next.js 16 app, copy the exact Reown wallet config from the reference app (`wagmi-core.ts`, `appkit-modal.ts`), and wire up a minimal single-page UI. No SIWE, no Farcaster auto-connect, no NextAuth — just the Reown/AppKit layer in isolation.

**Tech Stack:** Next.js 16.0.10, React 19, @reown/appkit@1.8.19, @reown/appkit-adapter-wagmi@1.8.19, wagmi@^2.12.0, viem@^2.21.0, @tanstack/react-query@^5, Tailwind CSS 4

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Create (via scaffold) | App metadata + all deps |
| `tsconfig.json` | Create (via scaffold, then patch) | TypeScript config with `@/*` alias |
| `next.config.mjs` | Replace scaffold default | AppKit webpack externals, no CSP |
| `empty-module.js` | Create | Webpack stub for test files |
| `.env.local` | Create | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_APP_DOMAIN` |
| `lib/wallet/wagmi-core.ts` | Create | WagmiAdapter + Base network |
| `lib/wallet/appkit-modal.ts` | Create | createAppKit with social login |
| `components/providers/web3-provider.tsx` | Create | WagmiProvider + QueryClient SSR hydration |
| `app/layout.tsx` | Replace | Minimal layout wrapping Web3Provider |
| `app/globals.css` | Replace | Minimal CSS reset |
| `app/page.tsx` | Replace | Single page: connect button or address/chain/disconnect |

---

## Task 1: Scaffold Next.js App

**Files:**
- Create: `package.json`, `tsconfig.json`, `app/layout.tsx` (scaffold defaults), etc.

- [ ] **Step 1: Run create-next-app in the current directory**

```bash
cd /Users/rubendinis/Documents/Code/test-reown-social-login
npx create-next-app@16.0.10 . --typescript --tailwind --app --no-eslint --no-src-dir --import-alias "@/*" --skip-install --yes
```

Expected: Files created including `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `next.config.mjs`, `postcss.config.mjs`, `public/`.

- [ ] **Step 2: Verify scaffold succeeded**

```bash
ls /Users/rubendinis/Documents/Code/test-reown-social-login
```

Expected: `app/`, `components/` (may not exist yet), `lib/`, `package.json`, `tsconfig.json`, `next.config.mjs` present.

- [ ] **Step 3: Commit scaffold**

```bash
cd /Users/rubendinis/Documents/Code/test-reown-social-login
git add -A
git commit -m "chore: scaffold Next.js 16 app"
```

---

## Task 2: Install Dependencies

**Files:**
- Modify: `package.json` (add wallet deps)

- [ ] **Step 1: Add wallet-specific packages to package.json**

Open `package.json` and add these to `dependencies` (merge with existing):

```json
"@reown/appkit": "1.8.19",
"@reown/appkit-adapter-wagmi": "1.8.19",
"@tanstack/react-query": "^5.90.16",
"wagmi": "^2.12.0",
"viem": "^2.21.0"
```

- [ ] **Step 2: Install all dependencies**

```bash
cd /Users/rubendinis/Documents/Code/test-reown-social-login
npm install
```

Expected: `node_modules/` created, no peer dependency errors (wagmi + viem are compatible).

- [ ] **Step 3: Verify key packages installed**

```bash
ls node_modules/@reown/appkit/package.json && echo "OK"
ls node_modules/wagmi/package.json && echo "OK"
```

Expected: Both print `OK`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add reown/wagmi/viem dependencies"
```

---

## Task 3: Create Environment File

**Files:**
- Create: `.env.local`

- [ ] **Step 1: Create .env.local**

Copy the value from the reference app at `/Users/rubendinis/Documents/Code/v0-crypto-world-cup-app/apps/app/.env`:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<paste-from-reference-app>
NEXT_PUBLIC_APP_DOMAIN=http://localhost:3000
```

Note: `.env.local` is gitignored by default in Next.js — do NOT commit it.

- [ ] **Step 2: Verify .env.local is gitignored**

```bash
cd /Users/rubendinis/Documents/Code/test-reown-social-login
cat .gitignore | grep env
```

Expected: `.env.local` or `.env*.local` appears in the output.

---

## Task 4: Create Wallet Config Files

**Files:**
- Create: `lib/wallet/wagmi-core.ts`
- Create: `lib/wallet/appkit-modal.ts`

- [ ] **Step 1: Create lib/wallet directory**

```bash
mkdir -p /Users/rubendinis/Documents/Code/test-reown-social-login/lib/wallet
```

- [ ] **Step 2: Create lib/wallet/wagmi-core.ts**

Same as reference app but without the Farcaster connector (not relevant to debugging social login):

```typescript
import { cookieStorage, createStorage } from "@wagmi/core"
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi"
import { base } from "@reown/appkit/networks"

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

export const networks = [base] as [typeof base]

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  networks,
  projectId,
  // Coinbase Wallet is NOT added here — Reown AppKit discovers it
  // automatically via its modal. Adding it explicitly caused wagmi's
  // auto-reconnect to redirect users to keys.coinbase.com on page load,
  // even when they weren't logged in.
  // No custom transports — WalletConnect Blockchain API is used by default.
})
```

- [ ] **Step 3: Create lib/wallet/appkit-modal.ts**

Copied verbatim from reference app with updated metadata. `analytics`, `onramp`, `themeMode`, and `themeVariables` are intentionally included to match the reference app's exact AppKit config for debugging parity. Module-level init is critical — see inline comment:

```typescript
/**
 * APPKIT MODAL
 *
 * createAppKit() is called at module level — matching the official Reown example
 * (next-wagmi-app-router). This ensures the w3m-iframe starts loading from
 * secure.walletconnect.org immediately when the client bundle is parsed,
 * so @w3m-frame/READY fires well before the user can click a social login button.
 *
 * When createAppKit() was deferred (dynamic import / useEffect), @w3m-frame/READY
 * arrived AFTER SOCIAL_LOGIN_STARTED — the iframe was mid-init when APP_CONNECT_SOCIAL
 * was sent, causing social login to hang forever.
 */

import { createAppKit } from "@reown/appkit/react"
import { base } from "@reown/appkit/networks"
import { wagmiAdapter, projectId, networks } from "./wagmi-core"

export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: base,
  projectId,
  metadata: {
    name: "Reown Social Login Debug",
    description: "Debug app for Reown social login",
    url: process.env.NEXT_PUBLIC_APP_DOMAIN || "http://localhost:3000",
    icons: [],
  },
  enableAuthLogger: true,
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'apple', 'github', 'x'],
    onramp: true,
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "hsl(142.1 76.2% 36.3%)",
    "--w3m-border-radius-master": "2px",
  },
})

// ---------- Social login diagnostics ----------
// Logs key AppKit events and ALL w3m-iframe postMessages with timestamps.
// Uses console.warn so logs survive Next.js removeConsole in production.
if (typeof window !== "undefined") {
  const ts = () => `+${((performance.now()) / 1000).toFixed(2)}s`

  // Intercept window.open to detect when AppKit opens the OAuth popup.
  const _originalOpen = window.open.bind(window)
  window.open = function(...args) {
    const popup = _originalOpen(...args)
    const url = typeof args[0] === "string" ? args[0] : String(args[0])
    if (url.includes("accounts.google") || url.includes("appleid.apple") || url.includes("github.com") || url.includes("x.com") || url.includes("twitter.com") || url.includes("walletconnect")) {
      console.warn(`[w3m popup] ${ts()} opened →`, url.slice(0, 80))
      if (popup) {
        const checker = setInterval(() => {
          try {
            const closed = popup.closed
            console.warn(`[w3m popup] ${ts()} closed=${closed} (REAL check succeeded)`)
            if (closed) clearInterval(checker)
          } catch {
            console.warn(`[w3m popup] ${ts()} closed=COOP_BLOCKED (context severed — premature trigger risk)`)
          }
        }, 500)
        setTimeout(() => clearInterval(checker), 120_000)
      }
    }
    return popup
  }

  // Track ALL messages — w3m-frame, Magic SDK, and any from the OAuth popup
  window.addEventListener("message", (e) => {
    const t = typeof e.data?.type === "string" ? e.data.type : null
    if (t && (t.startsWith("@w3m-frame/") || t.startsWith("@w3m-app/"))) {
      console.warn(`[w3m ${ts()}] ${t}`, "origin:", e.origin, "payload:", e.data.payload ?? e.data)
      return
    }
    const wc = e.origin.includes("walletconnect") || e.origin.includes("reown") || e.origin.includes("magic.link") || e.origin.includes("web3modal")
    if (wc) {
      console.warn(`[w3m OTHER MSG ${ts()}] origin:`, e.origin, "data:", JSON.stringify(e.data)?.slice(0, 300))
    }
  })

  modal.subscribeEvents((event) => {
    const name = event.data.event
    console.warn(`[AppKit ${ts()}]`, name, event.data)
    if (name === "SOCIAL_LOGIN_REQUEST_USER_DATA") {
      console.warn(`[AppKit ${ts()}] ⏳ APP_CONNECT_SOCIAL sent — waiting for FRAME_CONNECT_SOCIAL_SUCCESS…`)
      let elapsed = 0
      const interval = setInterval(() => {
        elapsed += 5
        console.warn(`[AppKit] ⏳ ${elapsed}s elapsed — iframe still hasn't responded`)
        if (elapsed >= 60) clearInterval(interval)
      }, 5_000)
    }
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add reown wallet config (wagmi-core + appkit-modal)"
```

---

## Task 5: Create Web3Provider

**Files:**
- Create: `components/providers/web3-provider.tsx`

The reference app uses a separate `QueryProvider` wrapping `Web3Provider`. Since this app has no other uses for React Query, we combine them here.

- [ ] **Step 1: Create components/providers/ directory**

```bash
mkdir -p /Users/rubendinis/Documents/Code/test-reown-social-login/components/providers
```

- [ ] **Step 2: Create components/providers/web3-provider.tsx**

```typescript
"use client"

import type React from "react"
import { useRef } from "react"
import { WagmiProvider, type Config } from "wagmi"
import { cookieToInitialState } from "@wagmi/core"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { wagmiAdapter } from "@/lib/wallet/wagmi-core"

// Static import so createAppKit() runs synchronously when this module is parsed
// on the client — matching the official Reown next-wagmi-app-router example.
// This gives the w3m-iframe maximum time to reach READY before any user interaction.
import "@/lib/wallet/appkit-modal"

export function Web3Provider({
  children,
  cookies,
}: {
  children: React.ReactNode
  cookies: string | null
}) {
  // useRef ensures each client session gets its own QueryClient instance
  // rather than sharing a module-level singleton across SSR requests.
  const queryClientRef = useRef<QueryClient | null>(null)
  if (!queryClientRef.current) queryClientRef.current = new QueryClient()

  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClientRef.current}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/
git commit -m "feat: add Web3Provider with WagmiProvider + QueryClient"
```

---

## Task 6: Wire Layout and Update next.config.mjs

**Files:**
- Replace: `app/layout.tsx`
- Replace: `app/globals.css`
- Replace: `next.config.mjs`
- Create: `empty-module.js`

- [ ] **Step 1: Replace app/layout.tsx**

```typescript
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Web3Provider } from "@/components/providers/web3-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Reown Debug",
  description: "Reown social login debug app",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  return (
    <html lang="en">
      <body>
        <Web3Provider cookies={cookieHeader}>
          {children}
        </Web3Provider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Replace app/globals.css**

Keep only the Tailwind directives (remove the scaffold's CSS variable boilerplate):

```css
@import "tailwindcss";
```

- [ ] **Step 3: Create empty-module.js (required by webpack config)**

```javascript
// Empty module to replace test files during webpack bundling
module.exports = {}
```

- [ ] **Step 4: Replace next.config.mjs**

Note: `turbopack: {}` keeps dev using Turbopack (Next.js 16 default). The `webpack` block below only applies during `npm run build`. The `pino-pretty`/`lokijs`/`encoding` externals are webpack-only — if Turbopack dev fails with module resolution errors for these, add `--webpack` to the dev script in `package.json`. The reference app uses the same pattern without issues.

```javascript
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
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
```

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/globals.css next.config.mjs empty-module.js
git commit -m "feat: wire layout and configure next.config.mjs for AppKit"
```

---

## Task 7: Build the Page UI

**Files:**
- Replace: `app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx**

```typescript
"use client"

import { useAccount, useDisconnect } from "wagmi"
import { modal } from "@/lib/wallet/appkit-modal"

export default function Home() {
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()

  if (!isConnected) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <button
          onClick={() => modal.open()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Connect Wallet
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 p-8 border border-gray-200 rounded-xl">
        <div className="text-center">
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Address</p>
          <p className="font-mono text-sm break-all">{address}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Chain</p>
          <p className="font-semibold">{chain?.name ?? "Unknown"} (ID: {chain?.id})</p>
        </div>
        <button
          onClick={() => disconnect()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add single-page wallet connect/disconnect UI"
```

---

## Task 8: Verify the App Runs

- [ ] **Step 1: Start dev server**

```bash
cd /Users/rubendinis/Documents/Code/test-reown-social-login
npm run dev
```

Expected: Server starts on `http://localhost:3000` with no TypeScript errors.

- [ ] **Step 2: Manual smoke test**

Open `http://localhost:3000` in the browser. Verify:
1. "Connect Wallet" button is centered on the page
2. Clicking it opens the Reown AppKit modal
3. Social login options (Google, Apple, GitHub, X) are visible in the modal
4. After connecting, the page shows the full wallet address and chain name
5. "Disconnect" button disconnects and returns to the connect button

- [ ] **Step 3: Check the browser console for diagnostic logs**

With the browser console open (filter by `[w3m` or `[AppKit`), attempt a social login.
You should see a stream of `@w3m-frame/` messages from the iframe, culminating in `@w3m-frame/READY` before any social login attempt.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify debug app running, ready for social login testing"
```
