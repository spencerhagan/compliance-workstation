"use client"

import Image from "next/image"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { LOGO_SRC } from "@/lib/constants"
import { ThemeToggle } from "@/components/theme-toggle"
import { ChevronDown, Building2, Check } from "lucide-react"
import { useAccountContext, ALL_ACCOUNTS, ACCOUNT_NAMES } from "@/lib/account-context"

export function AppHeader() {
  const [showAccounts, setShowAccounts] = useState(false)
  const { viewingAccount, setViewingAccount } = useAccountContext()

  const { data: accountInfo } = useQuery({
    queryKey: ["account-info"],
    queryFn: () => fetch("/api/account-info").then((r) => r.json()),
  })

  const localLocator = accountInfo?.account || ""

  // If viewing a different account, show that name; otherwise show this account's name
  const displayLabel = viewingAccount
    ? viewingAccount.label
    : ACCOUNT_NAMES[localLocator] || ACCOUNT_NAMES[accountInfo?.accountName || ""] || ""
  const title = displayLabel
    ? `${displayLabel} Compliance Workstation`
    : "TBOM Compliance Workstation"

  const isViewingRemote = viewingAccount && viewingAccount.locator !== localLocator

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-[#0F2D4E] text-white">
      <div className="w-full px-4 h-14 flex items-center gap-3">
        {LOGO_SRC && (
          <Image
            src={LOGO_SRC}
            alt="Bank of Missouri logo"
            width={120}
            height={36}
            className="shrink-0 object-contain bg-white rounded px-1.5 py-0.5"
            priority
          />
        )}
        <div className="h-6 w-px bg-white/30" />
        <span className="text-sm font-semibold tracking-tight">
          {title}
        </span>

        {/* Remote viewing indicator */}
        {isViewingRemote && (
          <span className="text-xs bg-[#FBBA16] text-[#0F2D4E] px-2 py-0.5 rounded font-medium">
            Viewing {viewingAccount.label}
          </span>
        )}

        {/* Account switcher -- always shown on local dev, gated by isMainAccount in SPCS */}
        {(accountInfo?.isMainAccount || accountInfo?.isMainAccount === undefined) && (
          <div className="relative ml-1">
            <button
              onClick={() => setShowAccounts(!showAccounts)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              Switch Account
              <ChevronDown className={`w-3 h-3 transition-transform ${showAccounts ? "rotate-180" : ""}`} />
            </button>
            {showAccounts && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAccounts(false)} />
                <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border z-50 py-1">
                  <div className="px-4 py-2 border-b text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                    Select Account to View
                  </div>
                  {ALL_ACCOUNTS.map((acct) => {
                    const isLocal = acct.locator === localLocator
                    const isSelected = viewingAccount
                      ? acct.locator === viewingAccount.locator
                      : isLocal
                    return (
                      <button
                        key={acct.locator}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                          isSelected ? "bg-[#016268]/10" : ""
                        }`}
                        onClick={() => {
                          setViewingAccount(isLocal ? null : acct)
                          setShowAccounts(false)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isSelected && <Check className="w-4 h-4 text-[#00A85C]" />}
                            <span className={`font-medium ${isSelected ? "text-[#016268] dark:text-[#00A85C]" : "text-slate-900 dark:text-slate-100"}`}>
                              {acct.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isLocal && (
                              <span className="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                This account
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-6">
                          {acct.description}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {accountInfo && (
            <span className="text-xs text-white/60 hidden md:inline">
              {accountInfo.user} / {accountInfo.role}
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
