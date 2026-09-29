"use client"

import { useState } from "react"
import { Info } from "lucide-react"

export function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="More information"
      >
        <Info className="w-4 h-4" />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-[#0F2D4E] rounded-lg shadow-lg whitespace-normal w-64 z-50 leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0F2D4E]" />
        </span>
      )}
    </span>
  )
}
