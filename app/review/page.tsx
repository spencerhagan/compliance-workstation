"use client"

import { useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Play,
  Download,
  CheckCircle2,
  Trash2,
  Bookmark,
  Search,
  ArrowUpDown,
} from "lucide-react"
import { REVIEW_TYPES } from "@/lib/queries"
import { InfoTip } from "@/components/info-tip"

export const dynamic = "force-dynamic"

function toCsv(data: Record<string, any>[]): string {
  if (data.length === 0) return ""
  const headers = Object.keys(data[0])
  const escape = (val: any) => {
    const s = val == null ? "" : String(val)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const rows = data.map((row) => headers.map((h) => escape(row[h])).join(","))
  return [headers.join(","), ...rows].join("\n")
}

function downloadCsv(data: Record<string, any>[], filename: string) {
  const csv = toCsv(data)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReviewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const reviewType = searchParams.get("type") || ""

  const reviewMeta = REVIEW_TYPES.find((r) => r.id === reviewType)

  const [data, setData] = useState<Record<string, any>[]>([])
  const [status, setStatus] = useState<"not_run" | "loading" | "in_review" | "signing_off">("not_run")
  const [deleted, setDeleted] = useState<Set<number>>(new Set())
  const [notes, setNotes] = useState<Map<number, string>>(new Map())
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [filterText, setFilterText] = useState("")
  const [signOffNotes, setSignOffNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const { data: accountInfo } = useQuery({
    queryKey: ["account-info"],
    queryFn: () => fetch("/api/account-info").then((r) => r.json()),
  })

  const runQuery = useCallback(async () => {
    setStatus("loading")
    try {
      const res = await fetch(`/api/audit?type=review&control=${reviewType}`)
      const json = await res.json()
      setData(json.data || [])
      setStatus("in_review")
      setDeleted(new Set())
      setNotes(new Map())
      setFlagged(new Set())
    } catch (e) {
      console.error("Failed to run review query:", e)
      setStatus("not_run")
    }
  }, [reviewType])

  const getReviewedData = () =>
    data
      .filter((_, i) => !deleted.has(i))
      .map((row, _) => {
        const realIdx = data.indexOf(row)
        const note = notes.get(realIdx)
        return note ? { ...row, REVIEWER_NOTES: note } : row
      })

  const submitSignOff = async () => {
    setSubmitting(true)
    const reviewed = getReviewedData()
    const now = new Date()
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    try {
      await fetch("/api/review/sign-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewType,
          reviewPeriod: period,
          reviewer: accountInfo?.user || "UNKNOWN",
          reviewerNotes: signOffNotes,
          evidenceData: reviewed.slice(0, 100),
          rowCount: reviewed.length,
        }),
      })
      router.push("/?section=review-log")
    } catch (e) {
      console.error("Sign-off failed:", e)
    }
    setSubmitting(false)
  }

  // Filter and sort
  let displayData = data
  if (filterText && displayData.length > 0) {
    const lower = filterText.toLowerCase()
    displayData = displayData.filter((row) =>
      Object.values(row).some((v) => v != null && String(v).toLowerCase().includes(lower))
    )
  }
  if (sortCol && displayData.length > 0) {
    displayData = [...displayData].sort((a, b) => {
      const va = a[sortCol] ?? ""
      const vb = b[sortCol] ?? ""
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
      return sortDir === "asc" ? cmp : -cmp
    })
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : []

  if (!reviewMeta) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Unknown review type: {reviewType}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Button>
      </main>
    )
  }

  return (
    <main className="w-full min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#016268]">{reviewMeta.cadence}</Badge>
              <h2 className="text-xl font-bold">{reviewMeta.label}</h2>
              <InfoTip text={{
                failed_login: "Pulls failed login attempts from the last 30 days. Look for repeated failures from the same IP, unusual client types, or attempts against disabled accounts. Flag suspicious activity for follow-up.",
                change_log: "Shows DDL and security changes (CREATE/DROP/ALTER on tables, roles, users, policies, grants). Review medium and high severity items. Confirm changes were authorized and properly logged.",
                pci_data: "Checks columns tagged with sensitive data classifications and verifies masking policies are applied. Any classified column without masking is a finding that needs remediation.",
                user_access: "Lists all users with activity status. Users inactive >90 days should be disabled. Compare against HR records and active contracts. Terminated employees must be removed.",
                role_access: "Full inventory of roles and their privileges. Verify each role has appropriate access -- no excessive permissions. Review role ownership and hierarchy.",
                audit_confirm: "Pulls the review log to verify all scheduled reviews were completed. This is the annual confirmation for Info Sec that the review program is functioning.",
              }[reviewType] || reviewMeta.description} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {reviewMeta.description} -- Owner: {reviewMeta.owner}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {status === "not_run" && (
              <Button onClick={runQuery} className="bg-[#016268] hover:bg-[#016268]/90">
                <Play className="w-4 h-4 mr-1" /> Run Review
              </Button>
            )}
            {status === "loading" && (
              <Button disabled className="bg-[#016268]">
                Running...
              </Button>
            )}
            {status === "in_review" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => downloadCsv(getReviewedData(), `${reviewType}_review.csv`)}
                >
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Button
                  onClick={() => setStatus("signing_off")}
                  className="bg-[#00A85C] hover:bg-[#00A85C]/90"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Complete Review
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Sign-off modal */}
        {status === "signing_off" && (
          <Card className="p-6 border-2 border-[#00A85C]">
            <h3 className="text-lg font-semibold mb-2">Sign Off on Review</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {reviewMeta.label} -- {getReviewedData().length} rows reviewed.
              Signing off as <span className="font-medium">{accountInfo?.user}</span>.
              A second approver will need to confirm.
            </p>
            <textarea
              className="w-full border rounded p-3 text-sm bg-background mb-3"
              rows={3}
              placeholder="Add notes about this review (findings, actions taken, etc.)..."
              value={signOffNotes}
              onChange={(e) => setSignOffNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={submitSignOff}
                disabled={submitting}
                className="bg-[#00A85C] hover:bg-[#00A85C]/90"
              >
                {submitting ? "Submitting..." : "Sign Off & Submit"}
              </Button>
              <Button variant="outline" onClick={() => setStatus("in_review")}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {status === "not_run" && (
          <Card className="p-12 text-center">
            <Play className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium mb-1">Ready to Review</p>
            <p className="text-muted-foreground">
              Click "Run Review" to pull the latest data from Snowflake. You can then review, edit, flag, and add notes before signing off.
            </p>
          </Card>
        )}

        {/* Data table */}
        {(status === "in_review" || status === "signing_off") && data.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter rows..."
                  className="w-full pl-9 pr-3 py-2 border rounded text-sm bg-background"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {displayData.length - deleted.size} of {data.length} rows
                {deleted.size > 0 && (
                  <span className="text-red-500 ml-1">({deleted.size} removed)</span>
                )}
                {flagged.size > 0 && (
                  <span className="text-[#FBBA16] ml-1">({flagged.size} flagged)</span>
                )}
              </div>
            </div>

            <div className="border rounded-lg overflow-auto max-h-[600px]">
              <table className="w-full text-sm">
                <thead className="bg-[#0F2D4E] text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 w-8"></th>
                    <th className="px-2 py-2 w-8"></th>
                    <th className="px-2 py-2 w-[140px] text-left text-xs">Notes</th>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left text-xs font-medium cursor-pointer hover:bg-[#0F2D4E]/80 whitespace-nowrap"
                        onClick={() => {
                          if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc")
                          else { setSortCol(col); setSortDir("asc") }
                        }}
                      >
                        <span className="flex items-center gap-1">
                          {col}
                          {sortCol === col && <ArrowUpDown className="w-3 h-3" />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((row) => {
                    const realIdx = data.indexOf(row)
                    const isDeleted = deleted.has(realIdx)
                    const isFlagged = flagged.has(realIdx)
                    return (
                      <tr
                        key={realIdx}
                        className={`border-b transition-colors ${
                          isDeleted
                            ? "opacity-30 line-through bg-red-50 dark:bg-red-900/10"
                            : isFlagged
                            ? "bg-amber-50 dark:bg-amber-900/10"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <td className="px-2 py-1.5">
                          <button
                            onClick={() => {
                              const d = new Set(deleted)
                              d.has(realIdx) ? d.delete(realIdx) : d.add(realIdx)
                              setDeleted(d)
                            }}
                            className="text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            onClick={() => {
                              const f = new Set(flagged)
                              f.has(realIdx) ? f.delete(realIdx) : f.add(realIdx)
                              setFlagged(f)
                            }}
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${
                                isFlagged ? "fill-[#FBBA16] text-[#FBBA16]" : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            className="w-full text-xs border rounded px-1.5 py-0.5 bg-background"
                            placeholder="Add note..."
                            value={notes.get(realIdx) || ""}
                            onChange={(e) => {
                              const n = new Map(notes)
                              e.target.value ? n.set(realIdx, e.target.value) : n.delete(realIdx)
                              setNotes(n)
                            }}
                          />
                        </td>
                        {columns.map((col) => (
                          <td key={col} className="px-3 py-1.5 whitespace-nowrap text-xs max-w-[300px] truncate">
                            {row[col] == null ? "" : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {(status === "in_review" || status === "signing_off") && data.length === 0 && (
          <Card className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-[#00A85C] mb-3" />
            <p className="text-muted-foreground">No results found for this review period.</p>
          </Card>
        )}
      </div>
    </main>
  )
}
