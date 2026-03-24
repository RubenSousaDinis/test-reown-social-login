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
