"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface SignOffModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (notes: string) => void
  reviewType: string
  rowCount: number
}

export function SignOffModal({
  open,
  onClose,
  onSubmit,
  reviewType,
  rowCount,
}: SignOffModalProps) {
  const [notes, setNotes] = useState("")

  if (!open) return null

  const handleSubmit = () => {
    onSubmit(notes)
    setNotes("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#0F2D4E]">
            Sign Off Review
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-4 space-y-1">
          <p className="text-sm text-muted-foreground">
            Review type: <span className="font-medium text-foreground">{reviewType}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Rows reviewed: <span className="font-medium text-foreground">{rowCount}</span>
          </p>
        </div>

        <div className="mb-4">
          <label
            htmlFor="signoff-notes"
            className="block text-sm font-medium mb-1.5"
          >
            Reviewer Notes
          </label>
          <textarea
            id="signoff-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any observations, exceptions, or comments..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#016268]"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#00A85C] text-white hover:bg-[#00A85C]/90"
          >
            Sign Off &amp; Submit
          </Button>
        </div>
      </div>
    </div>
  )
}
