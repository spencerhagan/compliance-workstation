"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface AccountInfo {
  locator: string
  name: string
  label: string
  description: string
}

export const ALL_ACCOUNTS: AccountInfo[] = [
  { locator: "OWB85847", name: "SRB23980", label: "TBOM Main", description: "Primary account - full admin" },
  { locator: "KRC49646", name: "CONTRACT_SERVICES", label: "Contract Services", description: "Contract Services department" },
  { locator: "WEC34903", name: "SPECIALTY_FINANCE", label: "Specialty Finance", description: "Specialty Finance department" },
  { locator: "ARC23842", name: "PCI_SECURE", label: "PCI Secure", description: "PCI secure environment" },
]

export const ACCOUNT_NAMES: Record<string, string> = {
  OWB85847: "TBOM Main",
  SRB23980: "TBOM Main",
  KRC49646: "Contract Services",
  CONTRACT_SERVICES: "Contract Services",
  WEC34903: "Specialty Finance",
  SPECIALTY_FINANCE: "Specialty Finance",
  ARC23842: "PCI Secure",
  PCI_SECURE: "PCI Secure",
}

interface AccountContextType {
  /** The account currently being viewed (null = local / this account) */
  viewingAccount: AccountInfo | null
  /** Switch to viewing a different account. Pass null to go back to local. */
  setViewingAccount: (acct: AccountInfo | null) => void
  /** Friendly label for the currently viewed account */
  viewingLabel: string
}

const AccountContext = createContext<AccountContextType>({
  viewingAccount: null,
  setViewingAccount: () => {},
  viewingLabel: "TBOM Main",
})

export function AccountProvider({ children }: { children: ReactNode }) {
  const [viewingAccount, setViewingAccount] = useState<AccountInfo | null>(null)
  const viewingLabel = viewingAccount?.label || ""

  return (
    <AccountContext.Provider value={{ viewingAccount, setViewingAccount, viewingLabel }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccountContext() {
  return useContext(AccountContext)
}
