"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  ClipboardCheck,
  FileText,
  Users,
  KeyRound,
  AlertTriangle,
  ArrowRight,
  Settings,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { InfoTip } from "@/components/info-tip"

const sections = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Shield,
    description: "Review status and upcoming tasks",
  },
  {
    id: "audit-export",
    label: "Audit Export",
    icon: FileText,
    description: "RSM AS.1-AS.7 evidence generation",
  },
  {
    id: "review-log",
    label: "Review Log",
    icon: ClipboardCheck,
    description: "Visual audit trail with sign-off history",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    description: "Manage reviewers, approvers, and schedules",
  },
]

const reviewSchedule = [
  { type: "failed_login", label: "Failed Login Review", cadence: "Monthly", owner: "Product Admin(s)", icon: AlertTriangle },
  { type: "change_log", label: "Audit & Change Log Review", cadence: "Monthly", owner: "Product Admin(s)", icon: FileText },
  { type: "pci_data", label: "PCI Data Review", cadence: "Quarterly", owner: "Info Sec", icon: KeyRound },
  { type: "user_access", label: "User Access Review", cadence: "Semi-Annual", owner: "Product Admin(s)", icon: Users },
  { type: "role_access", label: "Role Access Review", cadence: "Annual", owner: "Product Admin(s)", icon: KeyRound },
  { type: "audit_confirm", label: "Audit Confirmation", cadence: "Annual", owner: "Info Sec", icon: ClipboardCheck },
]

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    "due soon": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    "on track": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    "pending approval": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "not run": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status.toLowerCase()] || styles["not run"]}`}>
      {status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
      {status === "overdue" && <XCircle className="w-3 h-3 mr-1" />}
      {status === "due soon" && <Clock className="w-3 h-3 mr-1" />}
      {status}
    </span>
  )
}

export default function Home() {
  const [activeSection, setActiveSection] = useState("dashboard")

  const { data: accountInfo } = useQuery({
    queryKey: ["account-info"],
    queryFn: () => fetch("/api/account-info").then((r) => { if (!r.ok) throw new Error(); return r.json() }),
    retry: 10,
    retryDelay: 3000,
  })

  const { data: reviewLog, isLoading: reviewLogLoading } = useQuery({
    queryKey: ["review-log"],
    queryFn: () => fetch("/api/review/log").then((r) => { if (!r.ok) throw new Error(); return r.json() }),
    retry: 10,
    retryDelay: 3000,
  })

  return (
    <main className="w-full min-h-screen">
      {/* Section Nav */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeSection === s.id
                    ? "border-[#016268] text-[#016268] dark:text-[#00A85C]"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Account Banner */}
        {accountInfo && (
          <div className="flex items-center gap-3 mb-6 text-sm text-muted-foreground">
            <Badge variant="outline" className="font-mono">
              {accountInfo.account || "Loading..."}
            </Badge>
            <span>User: {accountInfo.user}</span>
            <span>Role: {accountInfo.role}</span>
          </div>
        )}

        {activeSection === "dashboard" && (
          <DashboardView reviewLog={reviewLog?.data || []} loading={reviewLogLoading} />
        )}
        {activeSection === "audit-export" && <AuditExportView />}
        {activeSection === "review-log" && <ReviewLogView reviewLog={reviewLog?.data || []} loading={reviewLogLoading} />}
        {activeSection === "settings" && <SettingsView />}
      </div>
    </main>
  )
}

function DashboardView({ reviewLog, loading }: { reviewLog: any[]; loading: boolean }) {
  const { data: reviewers } = useQuery({
    queryKey: ["reviewers"],
    queryFn: () => fetch("/api/settings/reviewers").then((r) => r.json()).catch(() => ({ data: [] })),
  })

  const assignedReviewers = (reviewers?.data || []) as any[]

  // Get admins for current environment (TBOM_MAIN for this account)
  const envAdmins = assignedReviewers
    .filter((r: any) => r.ACTIVE)
    .map((r: any) => r.SNOWFLAKE_USER)
  const uniqueAdmins = [...new Set(envAdmins)]

  // Build tracker data
  const trackerRows = reviewSchedule.map((review) => {
    const completed = reviewLog.filter(
      (r: any) => r.REVIEW_TYPE === review.type && r.STATUS === "COMPLETED"
    )
    const pending = reviewLog.filter(
      (r: any) => r.REVIEW_TYPE === review.type && r.STATUS === "PENDING_APPROVAL"
    )
    const lastCompleted = completed.length > 0 ? completed[0] : null
    const lastPending = pending.length > 0 ? pending[0] : null
    const assigned = assignedReviewers.filter((r: any) => r.REVIEW_TYPE === review.type && r.ACTIVE)
    const reviewerNames = assigned.map((r: any) => r.SNOWFLAKE_USER)
    const approverNames: string[] = []

    let status = "Not Started"
    let statusColor = "text-gray-500"
    if (lastCompleted) {
      status = "Completed"
      statusColor = "text-[#00A85C]"
    } else if (lastPending) {
      status = "Pending Approval"
      statusColor = "text-blue-600"
    }

    return {
      ...review,
      status,
      statusColor,
      lastCompleted,
      lastPending,
      reviewerNames,
      approverNames,
    }
  })

  const completedCount = trackerRows.filter((r) => r.status === "Completed").length
  const pendingCount = trackerRows.filter((r) => r.status === "Pending Approval").length
  const notStartedCount = trackerRows.filter((r) => r.status === "Not Started").length

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Compliance Dashboard</h2>
          <InfoTip text="Your central hub for tracking all compliance reviews. The tracker table below shows every scheduled review, who is assigned, and the current status. Green means completed, blue means waiting for a second sign-off, gray means not yet started." />
        </div>
        <p className="text-muted-foreground mt-1">Upcoming reviews and compliance status</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 p-3 bg-[#FBBA16]/10 border border-[#FBBA16]/30 rounded-lg">
          <div className="w-5 h-5 border-2 border-[#016268] border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-sm">Connecting to Snowflake and loading review data... retrying automatically.</span>
        </div>
      )}

      {/* Due Date Calendar */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-lg font-semibold">Upcoming Deadlines</h3>
          <InfoTip text="Visual timeline of when each review is due. Reviews are spaced based on their cadence. Red means overdue, gold means due within 7 days, green means on track." />
        </div>
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {(() => {
              const now = new Date()
              const currentMonth = now.getMonth()
              const currentYear = now.getFullYear()
              const dueDates = reviewSchedule.map((review) => {
                let dueDate: Date
                if (review.cadence === "Monthly") {
                  const nextMonth = new Date(currentYear, currentMonth + 1, 1)
                  dueDate = nextMonth
                } else if (review.cadence === "Quarterly") {
                  const currentQ = Math.floor(currentMonth / 3)
                  dueDate = new Date(currentYear, (currentQ + 1) * 3, 1)
                } else if (review.cadence === "Semi-Annual") {
                  const nextHalf = currentMonth < 6 ? new Date(currentYear, 6, 1) : new Date(currentYear + 1, 0, 1)
                  dueDate = nextHalf
                } else {
                  dueDate = new Date(currentYear, 11, 31)
                }
                const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                const isCompleted = trackerRows.find((r) => r.type === review.type)?.status === "Completed"
                return { ...review, dueDate, daysUntil, isCompleted }
              })
              dueDates.sort((a, b) => a.daysUntil - b.daysUntil)
              return dueDates.map((item) => {
                let borderColor = "border-l-gray-300"
                let daysLabel = `${item.daysUntil} days`
                let daysColor = "text-muted-foreground"
                if (item.isCompleted) {
                  borderColor = "border-l-[#00A85C]"
                  daysLabel = "Done"
                  daysColor = "text-[#00A85C]"
                } else if (item.daysUntil < 0) {
                  borderColor = "border-l-red-500"
                  daysLabel = `${Math.abs(item.daysUntil)}d overdue`
                  daysColor = "text-red-600 font-semibold"
                } else if (item.daysUntil <= 7) {
                  borderColor = "border-l-[#FBBA16]"
                  daysColor = "text-[#FBBA16] font-semibold"
                } else if (item.daysUntil <= 30) {
                  borderColor = "border-l-blue-400"
                }
                return (
                  <div key={item.type} className={`border-l-4 ${borderColor} pl-3 py-2`}>
                    <div className="text-xs font-medium truncate">{item.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div className={`text-xs mt-0.5 ${daysColor}`}>{daysLabel}</div>
                  </div>
                )
              })
            })()}
          </div>
        </Card>
      </div>

      {/* Compliance Scorecard */}
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Scorecard</h3>
        <InfoTip text="A quick summary of your compliance posture. 'Completed' counts reviews finished this period. 'Pending Approval' are reviews waiting for a second sign-off. 'Not Started' means the review hasn't been run yet." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Reviews</div>
          <div className="text-3xl font-bold mt-1">{reviewSchedule.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="text-3xl font-bold mt-1 text-[#00A85C]">{completedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Pending Approval</div>
          <div className="text-3xl font-bold mt-1 text-blue-600">{pendingCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Not Started</div>
          <div className="text-3xl font-bold mt-1 text-gray-500">{notStartedCount}</div>
        </Card>
      </div>

      {/* Compliance Tracker Table */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">Compliance Tracker</h3>
          <InfoTip text="This table is what you show management or auditors. It tracks every review: who is responsible, who approves, whether it's been done, and when. If a review shows 'Not Started' and no one is assigned, go to Settings to assign reviewers. Use 'Start Review' to begin." />
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0F2D4E] text-white">
                  <th className="px-4 py-3 text-left font-medium">Review</th>
                  <th className="px-4 py-3 text-left font-medium">Cadence</th>
                  <th className="px-4 py-3 text-left font-medium">Environment Admins</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Reviewed By</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Approved By</th>
                  <th className="px-4 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {trackerRows.map((row) => (
                  <tr key={row.type} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.label}</div>
                      <div className="text-xs text-muted-foreground">{row.owner}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{row.cadence}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {uniqueAdmins.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {uniqueAdmins.map((name: string) => (
                            <span key={name} className="text-xs bg-[#016268]/10 text-[#016268] dark:text-[#00A85C] px-1.5 py-0.5 rounded">
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-red-500 italic">No admins assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${row.statusColor}`}>
                        {row.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                        {row.status === "Pending Approval" && <Clock className="w-3.5 h-3.5 inline mr-1" />}
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.lastCompleted?.REVIEWER || row.lastPending?.REVIEWER || (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.lastCompleted?.REVIEWED_AT?.slice(0, 10) ||
                       row.lastPending?.REVIEWED_AT?.slice(0, 10) || (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.lastCompleted?.APPROVER ? (
                        <span>
                          {row.lastCompleted.APPROVER}
                          <span className="text-muted-foreground ml-1">
                            ({row.lastCompleted.APPROVED_AT?.slice(0, 10)})
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/review/${row.type}`}>
                        <Button size="sm" variant={row.status === "Completed" ? "outline" : "default"}
                          className={row.status === "Completed" ? "" : "bg-[#016268] hover:bg-[#016268]/90"}
                        >
                          {row.status === "Completed" ? "View" : "Start"}
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Activity Feed */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <InfoTip text="A live feed of what's happening across the team. Shows when reviews are started, completed, approved, and when settings are changed. On the main account you see activity from all environments." />
        </div>
        <Card className="p-4">
          {(() => {
            // Build activity items from review log + settings changes
            const activities: { icon: string; text: string; time: string; color: string }[] = []

            reviewLog.forEach((entry: any) => {
              if (entry.REVIEWED_AT) {
                const label = reviewSchedule.find((r) => r.type === entry.REVIEW_TYPE)?.label || entry.REVIEW_TYPE
                activities.push({
                  icon: entry.STATUS === "COMPLETED" ? "check" : "clock",
                  text: entry.STATUS === "COMPLETED"
                    ? `${entry.APPROVER || "Unknown"} approved the ${label} (reviewed by ${entry.REVIEWER})`
                    : `${entry.REVIEWER} completed the ${label} -- pending approval`,
                  time: entry.STATUS === "COMPLETED" ? (entry.APPROVED_AT || entry.REVIEWED_AT) : entry.REVIEWED_AT,
                  color: entry.STATUS === "COMPLETED" ? "text-[#00A85C]" : "text-blue-600",
                })
              }
            })

            // Sort by time descending
            activities.sort((a, b) => (b.time || "").localeCompare(a.time || ""))

            if (activities.length === 0) {
              return (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No activity yet. Activity will appear here as admins complete reviews, approve sign-offs, and update settings.
                </div>
              )
            }

            return (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {activities.slice(0, 20).map((act, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 ${act.color}`}>
                      {act.icon === "check" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{act.text}</div>
                      <div className="text-xs text-muted-foreground">
                        {act.time ? new Date(act.time).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
                        }) : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </Card>
      </div>
    </div>
  )
}

function AuditExportView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">RSM Audit Export</h2>
            <InfoTip text="Generate evidence files for the RSM Application Security audit. Each AS control maps to a specific SQL query. Click a card to generate the data, review and edit it, then export as CSV. Use 'Export All' to download a ZIP with the complete folder structure auditors expect." />
          </div>
          <p className="text-muted-foreground mt-1">Generate and review AS.1-AS.7 evidence for auditors</p>
        </div>
        <Link href="/audit">
          <Button className="bg-[#016268] hover:bg-[#016268]/90">
            <FileText className="w-4 h-4 mr-2" />
            Open Audit Workspace
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { id: "as1", label: "AS.1", title: "Password Policy", description: "Password complexity and lockout settings" },
          { id: "as2", label: "AS.2", title: "Access Lists", description: "Role inventory and privilege assignments" },
          { id: "as4", label: "AS.4", title: "User Access", description: "Full user listing with roles and activity" },
          { id: "as5", label: "AS.5", title: "Admin Access", description: "Elevated role assignments" },
          { id: "as6", label: "AS.6", title: "SOD Matrix", description: "Segregation of duties conflicts" },
          { id: "as7", label: "AS.7", title: "Job Scheduling", description: "Task execution history" },
        ].map((control) => (
          <Link key={control.id} href={`/audit?tab=${control.id}`}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
              <Badge className="mb-2 bg-[#0F2D4E]">{control.label}</Badge>
              <div className="font-medium">{control.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{control.description}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

function ReviewLogView({ reviewLog, loading }: { reviewLog: any[]; loading: boolean }) {
  function downloadEvidence(entry: any) {
    const evidence = entry.EVIDENCE_DATA
    if (!evidence) return
    let data: any[]
    try {
      data = typeof evidence === "string" ? JSON.parse(evidence) : Array.isArray(evidence) ? evidence : [evidence]
    } catch {
      data = [{ note: "Evidence data could not be parsed" }]
    }
    if (data.length === 0) return
    const headers = Object.keys(data[0])
    const escape = (val: any) => {
      const s = val == null ? "" : String(val)
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [headers.join(","), ...data.map((row: any) => headers.map((h) => escape(row[h])).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${entry.REVIEW_TYPE}_${entry.REVIEW_PERIOD}_evidence.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Review Log</h2>
          <InfoTip text="This is your proof page for auditors. Every completed review is logged here with who reviewed it, who approved it, timestamps, and the number of rows examined. Show this page to auditors to demonstrate reviews are happening on schedule." />
        </div>
        <p className="text-muted-foreground mt-1">Audit trail of all completed reviews with sign-off records</p>
      </div>

      {reviewLog.length === 0 ? (
        <Card className="p-8 text-center">
          {loading ? (
            <>
              <div className="w-12 h-12 mx-auto mb-3 border-4 border-[#016268] border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Connecting to Snowflake... This may take a moment on your network.</p>
              <p className="text-xs text-muted-foreground mt-2">Retrying automatically. The connection is intermittent from localhost.</p>
            </>
          ) : (
            <>
              <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No reviews completed yet. Start a review from the Dashboard.</p>
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {reviewLog.map((entry: any, i: number) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.REVIEW_TYPE}</span>
                    <StatusBadge status={entry.STATUS?.toLowerCase() || "unknown"} />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Period: {entry.REVIEW_PERIOD} | Rows: {entry.ROW_COUNT}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div>Reviewer: <span className="font-medium">{entry.REVIEWER}</span></div>
                  {entry.REVIEWED_AT && <div className="text-muted-foreground">{entry.REVIEWED_AT.slice(0, 10)}</div>}
                  {entry.APPROVER && (
                    <div className="mt-1">
                      Approved by: <span className="font-medium">{entry.APPROVER}</span>
                      {entry.APPROVED_AT && <span className="text-muted-foreground"> ({entry.APPROVED_AT.slice(0, 10)})</span>}
                    </div>
                  )}
                </div>
              </div>
              {entry.REVIEWER_NOTES && (
                <div className="mt-2 text-sm bg-muted/50 rounded p-2">
                  Notes: {entry.REVIEWER_NOTES}
                </div>
              )}
              {entry.EVIDENCE_DATA && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadEvidence(entry)}
                    className="text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download Evidence CSV ({entry.ROW_COUNT} rows)
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsView() {
  const { data: reviewers, refetch } = useQuery({
    queryKey: ["reviewers"],
    queryFn: () => fetch("/api/settings/reviewers").then((r) => r.json()).catch(() => ({ data: [] })),
  })

  const [newAdmin, setNewAdmin] = useState({ environment: "", snowflakeUser: "", email: "" })
  const [saving, setSaving] = useState(false)

  const environments = [
    { id: "TBOM_MAIN", label: "TBOM Main (OWB85847)", description: "Primary account" },
    { id: "CONTRACT_SERVICES", label: "Contract Services (KRC49646)", description: "Contract Services department" },
    { id: "SPECIALTY_FINANCE", label: "Specialty Finance (WEC34903)", description: "Specialty Finance department" },
    { id: "PCI_SECURE", label: "PCI Secure (ARC23842)", description: "PCI secure environment" },
  ]

  async function addAdmin() {
    if (!newAdmin.environment || !newAdmin.snowflakeUser) return
    setSaving(true)
    await fetch("/api/settings/reviewers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewType: newAdmin.environment,
        role: "ADMIN",
        snowflakeUser: newAdmin.snowflakeUser.toUpperCase(),
        email: newAdmin.email,
      }),
    })
    setNewAdmin({ environment: "", snowflakeUser: "", email: "" })
    setSaving(false)
    refetch()
  }

  async function removeAdmin(id: number) {
    await fetch(`/api/settings/reviewers?id=${id}`, { method: "DELETE" })
    refetch()
  }

  const allAdmins = (reviewers?.data || []).filter((r: any) => r.ACTIVE) as any[]

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Settings</h2>
          <InfoTip text="Define admins for each Snowflake environment. Any admin can review or approve -- but the person who reviews cannot be the same person who approves. This ensures separation of duties. You need at least 2 admins per environment." />
        </div>
        <p className="text-muted-foreground mt-1">Manage environment admins and notification settings</p>
      </div>

      {/* Admin Management */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">Environment Admins</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add admins for each Snowflake environment. Any admin can review or approve any compliance review for their environment.
          Whoever completes the review, a <span className="font-medium">different</span> admin must approve it.
          You need at least 2 admins per environment.
        </p>

        {/* Add new admin */}
        <div className="flex gap-3 items-end mb-6 flex-wrap">
          <div>
            <label className="text-sm font-medium block mb-1">Environment</label>
            <select
              className="border rounded px-3 py-2 text-sm bg-background"
              value={newAdmin.environment}
              onChange={(e) => setNewAdmin({ ...newAdmin, environment: e.target.value })}
            >
              <option value="">Select environment...</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>{env.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Snowflake Username</label>
            <input
              type="text"
              className="border rounded px-3 py-2 text-sm bg-background"
              placeholder="e.g. SHAGAN"
              value={newAdmin.snowflakeUser}
              onChange={(e) => setNewAdmin({ ...newAdmin, snowflakeUser: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input
              type="email"
              className="border rounded px-3 py-2 text-sm bg-background"
              placeholder="e.g. shagan@bankofmissouri.com"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            />
          </div>
          <Button onClick={addAdmin} disabled={saving} className="bg-[#016268] hover:bg-[#016268]/90">
            {saving ? "Adding..." : "Add Admin"}
          </Button>
        </div>

        {/* Admins by environment */}
        {environments.map((env) => {
          const envAdmins = allAdmins.filter((r: any) => r.REVIEW_TYPE === env.id)
          return (
            <div key={env.id} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-sm font-semibold text-[#0F2D4E] dark:text-[#00A85C]">{env.label}</div>
                {envAdmins.length < 2 && (
                  <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                    Needs {2 - envAdmins.length} more admin{envAdmins.length === 0 ? "s" : ""}
                  </span>
                )}
                {envAdmins.length >= 2 && (
                  <span className="text-xs text-[#00A85C] bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                    Ready
                  </span>
                )}
              </div>
              {envAdmins.length === 0 ? (
                <p className="text-xs text-muted-foreground italic ml-1">No admins assigned yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {envAdmins.map((admin: any) => (
                    <Badge key={admin.ID} variant="outline" className="flex items-center gap-2 py-1.5 px-3">
                      <Users className="w-3.5 h-3.5 text-[#016268]" />
                      <span className="font-medium">{admin.SNOWFLAKE_USER}</span>
                      {admin.EMAIL && (
                        <span className="text-muted-foreground text-xs">({admin.EMAIL})</span>
                      )}
                      <button
                        onClick={() => removeAdmin(admin.ID)}
                        className="ml-1 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
