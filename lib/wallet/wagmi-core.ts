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
