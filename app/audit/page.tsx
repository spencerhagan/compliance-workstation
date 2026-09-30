"use client"

import { useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Download,
  Play,
  CheckCircle2,
  Trash2,
  Bookmark,
  Search,
  ArrowUpDown,
  FileArchive,
} from "lucide-react"
import { AUDIT_CONTROLS, EXPORT_FILE_NAMES } from "@/lib/queries"
import { BackButton } from "@/components/back-button"
import { InfoTip } from "@/components/info-tip"

export const dynamic = "force-dynamic"

type SectionStatus = "not_run" | "in_review" | "ready"

interface SectionState {
  status: SectionStatus
  data: Record<string, any>[]
  deleted: Set<number>
  notes: Map<number, string>
  flagged: Set<number>
}

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

async function downloadZip(allSections: Record<string, SectionState>, account: string) {
  const JSZip = (await import("jszip")).default
  const zip = new JSZip()
  const date = new Date().toISOString().slice(0, 10)
  const rootFolder = `TBOM_Snowflake_Audit_${account}_${date}`

  let summary = `TBOM Snowflake Audit Export\n`
  summary += `Account: ${account}\n`
  summary += `Generated: ${new Date().toISOString()}\n\n`

  for (const control of AUDIT_CONTROLS) {
    const state = allSections[control.id]
    const fileInfo = EXPORT_FILE_NAMES[control.id]
    if (!fileInfo || !state || state.status === "not_run") {
      summary += `${control.label} - ${control.title}: NOT RUN\n`
      continue
    }
    const reviewedData = getReviewedData(state)
    const csv = toCsv(reviewedData)
    zip.file(`${rootFolder}/${fileInfo.folder}/${fileInfo.filename}`, csv)
    summary += `${control.label} - ${control.title}: ${state.status.toUpperCase()} (${reviewedData.length} rows)\n`
  }

  zip.file(`${rootFolder}/_metadata/generation_summary.txt`, summary)
  const blob = await zip.generateAsync({ type: "blob" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${rootFolder}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

function getReviewedData(state: SectionState): Record<string, any>[] {
  return state.data
    .filter((_, i) => !state.deleted.has(i))
    .map((row, _origIdx) => {
      const realIdx = state.data.indexOf(row)
      const note = state.notes.get(realIdx)
      return note ? { ...row, REVIEWER_NOTES: note } : row
    })
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading audit workspace...</div>}>
      <AuditPageInner />
    </Suspense>
  )
}

function AuditPageInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") || "as1"
  const [activeTab, setActiveTab] = useState(initialTab)
  const [sections, setSections] = useState<Record<string, SectionState>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [filterText, setFilterText] = useState("")

  const { data: accountInfo } = useQuery({
    queryKey: ["account-info"],
    queryFn: () => fetch("/api/account-info").then((r) => r.json()),
  })

  const runQuery = useCallback(async (controlId: string) => {
    setLoading(controlId)
    try {
      const res = await fetch(`/api/audit?type=audit&control=${controlId}`)
      const json = await res.json()
      setSections((prev) => ({
        ...prev,
        [controlId]: {
          status: "in_review",
          data: json.data || [],
          deleted: new Set(),
          notes: new Map(),
          flagged: new Set(),
        },
      }))
    } catch (e) {
      console.error("Failed to run query:", e)
    }
    setLoading(null)
  }, [])

  const toggleDelete = (controlId: string, idx: number) => {
    setSections((prev) => {
      const s = { ...prev[controlId] }
      const d = new Set(s.deleted)
      d.has(idx) ? d.delete(idx) : d.add(idx)
      return { ...prev, [controlId]: { ...s, deleted: d } }
    })
  }

  const toggleFlag = (controlId: string, idx: number) => {
    setSections((prev) => {
      const s = { ...prev[controlId] }
      const f = new Set(s.flagged)
      f.has(idx) ? f.delete(idx) : f.add(idx)
      return { ...prev, [controlId]: { ...s, flagged: f } }
    })
  }

  const setNote = (controlId: string, idx: number, note: string) => {
    setSections((prev) => {
      const s = { ...prev[controlId] }
      const n = new Map(s.notes)
      note ? n.set(idx, note) : n.delete(idx)
      return { ...prev, [controlId]: { ...s, notes: n } }
    })
  }

  const markReady = (controlId: string) => {
    setSections((prev) => ({
      ...prev,
      [controlId]: { ...prev[controlId], status: "ready" },
    }))
  }

  const currentSection = sections[activeTab]
  const currentControl = AUDIT_CONTROLS.find((c) => c.id === activeTab)

  // Filter and sort data
  let displayData = currentSection?.data || []
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

  const columns = displayData.length > 0 ? Object.keys(displayData[0]) : []
  const readyCount = Object.values(sections).filter((s) => s.status === "ready").length

  return (
    <main className="w-full min-h-screen">
      {/* Tabs */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1600px] mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {AUDIT_CONTROLS.map((c) => {
              const status = sections[c.id]?.status
              return (
                <button
                  key={c.id}
                  onClick={() => { setActiveTab(c.id); setFilterText(""); setSortCol(null) }}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === c.id
                      ? "border-[#016268] text-[#016268] dark:text-[#00A85C]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                  {status === "ready" && <CheckCircle2 className="w-3.5 h-3.5 text-[#00A85C]" />}
                  {status === "in_review" && <span className="w-2 h-2 rounded-full bg-[#FBBA16]" />}
                </button>
              )
            })}
            <button
              onClick={() => setActiveTab("export")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "export"
                  ? "border-[#016268] text-[#016268] dark:text-[#00A85C]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileArchive className="w-4 h-4" />
              Export All ({readyCount}/{AUDIT_CONTROLS.length})
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <BackButton label="Back to Dashboard" />
        {activeTab === "export" ? (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">Export All</h2>
                <InfoTip text="Download a ZIP file containing all reviewed audit evidence in the exact folder structure RSM auditors expect (AS.1/, AS.2/, etc.). Only sections you've run and reviewed will be included. Mark sections as 'Ready' for a clean export." />
              </div>
              <p className="text-muted-foreground mt-1">Download a ZIP with all reviewed audit evidence</p>
            </div>
            <div className="space-y-2">
              {AUDIT_CONTROLS.map((c) => {
                const s = sections[c.id]
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-card rounded border">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-[#0F2D4E]">{c.label}</Badge>
                      <span>{c.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {s ? (
                        <>
                          <span className="text-sm text-muted-foreground">
                            {getReviewedData(s).length} rows
                          </span>
                          {s.status === "ready" ? (
                            <CheckCircle2 className="w-5 h-5 text-[#00A85C]" />
                          ) : (
                            <span className="text-sm text-[#FBBA16]">In Review</span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not run</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <Button
              onClick={() => downloadZip(sections, accountInfo?.account || "UNKNOWN")}
              className="bg-[#016268] hover:bg-[#016268]/90"
              disabled={readyCount === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export All as ZIP
            </Button>
          </div>
        ) : currentControl ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#0F2D4E]">{currentControl.label}</Badge>
                  <h2 className="text-xl font-bold">{currentControl.title}</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentControl.description}
                  <InfoTip text={{
                    as1: "Pulls password policy settings from SNOWFLAKE.ACCOUNT_USAGE.PASSWORD_POLICIES. Shows minimum length, complexity requirements, lockout settings, and password age limits.",
                    as2: "Shows all roles in the account with their privilege counts and user assignments. Helps verify role-based access control is properly configured.",
                    as4: "Complete user listing with every role assignment, login activity, MFA status, and account status. This is the primary evidence for user access reviews.",
                    as5: "Filters to only users with ACCOUNTADMIN, SYSADMIN, SECURITYADMIN, USERADMIN, or ORGADMIN roles. These elevated privileges need extra scrutiny.",
                    as6: "Identifies users who hold multiple elevated roles simultaneously. Flags potential segregation of duties conflicts that auditors will question.",
                    as7: "Shows Snowflake task execution history for the last 30 days. Proves scheduled jobs are running as expected and identifies any failures.",
                  }[activeTab] || currentControl.description} />
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => runQuery(activeTab)}
                  disabled={loading === activeTab}
                  className="bg-[#0F2D4E] hover:bg-[#0F2D4E]/90 text-white"
                >
                  <Play className="w-4 h-4 mr-1" />
                  {loading === activeTab ? "Running..." : "Generate"}
                </Button>
                {currentSection && currentSection.status !== "not_run" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const reviewed = getReviewedData(currentSection)
                        const fileInfo = EXPORT_FILE_NAMES[activeTab]
                        downloadCsv(reviewed, fileInfo?.filename || `${activeTab}.csv`)
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      CSV
                    </Button>
                    {currentSection.status === "in_review" && (
                      <Button
                        onClick={() => markReady(activeTab)}
                        className="bg-[#00A85C] hover:bg-[#00A85C]/90"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Mark Ready
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Data Table */}
            {!currentSection || currentSection.status === "not_run" ? (
              <Card className="p-12 text-center">
                <Play className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Click "Generate" to run the audit query</p>
              </Card>
            ) : (
              <>
                {/* Filter + count */}
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
                    {displayData.length - (currentSection.deleted.size)} of {currentSection.data.length} rows
                    {currentSection.deleted.size > 0 && (
                      <span className="text-red-500 ml-1">({currentSection.deleted.size} removed)</span>
                    )}
                  </div>
                </div>

                {/* Table */}
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
                              if (sortCol === col) {
                                setSortDir(sortDir === "asc" ? "desc" : "asc")
                              } else {
                                setSortCol(col)
                                setSortDir("asc")
                              }
                            }}
                          >
                            <span className="flex items-center gap-1">
                              {col}
                              {sortCol === col && (
                                <ArrowUpDown className="w-3 h-3" />
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.map((row, displayIdx) => {
                        const realIdx = currentSection.data.indexOf(row)
                        const isDeleted = currentSection.deleted.has(realIdx)
                        const isFlagged = currentSection.flagged.has(realIdx)
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
                                onClick={() => toggleDelete(activeTab, realIdx)}
                                className="text-muted-foreground hover:text-red-600"
                                title={isDeleted ? "Restore row" : "Remove row"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                onClick={() => toggleFlag(activeTab, realIdx)}
                                title="Flag for follow-up"
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
                                value={currentSection.notes.get(realIdx) || ""}
                                onChange={(e) => setNote(activeTab, realIdx, e.target.value)}
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
          </div>
        ) : null}
      </div>
    </main>
  )
}
