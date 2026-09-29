import type { Metadata } from "next"
import type React from "react"
import { AppHeader } from "@/components/app-header"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { APP_TITLE, LOGO_SRC } from "@/lib/constants"
import { AccountProvider } from "@/lib/account-context"
import "./globals.css"

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "TBOM Snowflake Compliance Workstation — Audit evidence, recurring reviews, and compliance tracking",
  icons: { icon: LOGO_SRC },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <QueryProvider>
            <AccountProvider>
              <AppHeader />
              {children}
            </AccountProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
