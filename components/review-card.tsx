"use client"

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge, type ReviewStatus } from "@/components/status-badge"
import { Calendar, User } from "lucide-react"

interface ReviewCardProps {
  title: string
  cadence: string
  owner: string
  dueDate: string
  status: ReviewStatus
  onStart?: () => void
}

export function ReviewCard({
  title,
  cadence,
  owner,
  dueDate,
  status,
  onStart,
}: ReviewCardProps) {
  const isOverdue = status === "Overdue"
  const isActionable = status === "Not Run" || status === "Overdue"

  return (
    <Card
      className={`transition-shadow hover:shadow-md ${
        isOverdue ? "border-l-4 border-l-red-500" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{cadence}</p>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            <span>Due: {dueDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            <span>{owner}</span>
          </div>
        </div>
      </CardContent>
      {isActionable && onStart && (
        <CardFooter>
          <Button
            onClick={onStart}
            className="w-full bg-[#016268] text-white hover:bg-[#016268]/90"
          >
            Start Review
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
