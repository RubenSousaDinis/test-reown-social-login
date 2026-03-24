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
