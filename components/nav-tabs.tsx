"use client"

import Link from "next/link"

export interface NavTab {
  id: string
  label: string
  href: string
  badge?: string | number
}

interface NavTabsProps {
  tabs: NavTab[]
  activeTab: string
}

export function NavTabs({ tabs, activeTab }: NavTabsProps) {
  return (
    <nav className="bg-[#0F2D4E] px-4">
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
                ${isActive ? "text-white" : "text-white/60 hover:text-white/90"}
              `}
            >
              {tab.label}
              {tab.badge != null && (
                <span className="inline-flex items-center justify-center rounded-full bg-[#FBBA16] px-1.5 py-0.5 text-[10px] font-bold text-[#0F2D4E] min-w-[18px]">
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t bg-[#016268]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
