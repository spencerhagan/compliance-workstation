"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className="text-muted-foreground hover:text-foreground -ml-2 mb-2"
    >
      <ArrowLeft className="w-4 h-4 mr-1" />
      {label}
    </Button>
  )
}
