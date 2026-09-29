"use client"

import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

export type ReviewStatus =
  | "Not Run"
  | "In Review"
  | "Ready"
  | "Pending Approval"
  | "Completed"
  | "Overdue"

const STATUS_CONFIG: Record<
  ReviewStatus,
  { bg: string; text: string; icon?: boolean }
> = {
  "Not Run": { bg: "bg-gray-100 text-gray-600 border-gray-200", text: "Not Run" },
  "In Review": { bg: "bg-[#FBBA16]/15 text-[#FBBA16] border-[#FBBA16]/30", text: "In Review" },
  "Ready": { bg: "bg-[#00A85C]/15 text-[#00A85C] border-[#00A85C]/30", text: "Ready", icon: true },
  "Pending Approval": { bg: "bg-blue-100 text-blue-700 border-blue-200", text: "Pending Approval" },
  "Completed": { bg: "bg-[#00A85C]/15 text-[#00A85C] border-[#00A85C]/30", text: "Completed" },
  "Overdue": { bg: "bg-red-100 text-red-600 border-red-200", text: "Overdue" },
}

interface StatusBadgeProps {
  status: ReviewStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG["Not Run"]

  return (
    <Badge variant="outline" className={`${config.bg} ${className ?? ""}`}>
      {config.icon && <Check className="mr-1 h-3 w-3" />}
      {config.text}
    </Badge>
  )
}
