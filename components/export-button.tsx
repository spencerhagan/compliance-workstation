"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface ExportButtonProps {
  data: Record<string, any>[]
  filename: string
  className?: string
}

function escapeCSVValue(value: any): string {
  const str = value == null ? "" : String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export function ExportButton({ data, filename, className }: ExportButtonProps) {
  const handleExport = () => {
    if (!data.length) return

    const headers = Object.keys(data[0])
    const headerRow = headers.map(escapeCSVValue).join(",")
    const bodyRows = data.map((row) =>
      headers.map((h) => escapeCSVValue(row[h])).join(",")
    )
    const csv = [headerRow, ...bodyRows].join("\r\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={!data.length}
      className={className}
    >
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  )
}
