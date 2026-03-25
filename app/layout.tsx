import type React from "react"
import type { Metadata } from "next"
import { headers } from "next/headers"
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
  const headersList = await headers()
  const cookieHeader = headersList.get("cookie") ?? ""

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
