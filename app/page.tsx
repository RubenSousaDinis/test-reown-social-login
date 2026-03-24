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
          <p className="font-semibold">{chain ? `${chain.name} (ID: ${chain.id})` : "Unknown network"}</p>
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
