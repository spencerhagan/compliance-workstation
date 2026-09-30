"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
  History,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  ShieldAlert,
} from "lucide-react"
import { InfoTip } from "@/components/info-tip"

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
    "pending_approval": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "pending approval": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "not_started": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    "not started": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    "not run": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  }
  const display = status.replace(/_/g, " ")
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status.toLowerCase()] || styles["not run"]}`}>
      {status.toLowerCase().includes("completed") && <CheckCircle2 className="w-3 h-3 mr-1" />}
      {status.toLowerCase().includes("overdue") && <XCircle className="w-3 h-3 mr-1" />}
      {status.toLowerCase().includes("pending") && <Clock className="w-3 h-3 mr-1" />}
      {display}
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

  // Auth gate
  if (accountInfo && accountInfo.authorized === false) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <ShieldAlert className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Not Authorized</h2>
          <p className="text-muted-foreground">
            Your Snowflake user ({accountInfo.user}) is not registered as a reviewer.
            Contact your administrator to get access.
          </p>
        </Card>
      </main>
    )
  }

  const sections = [
    { id: "dashboard", label: "Dashboard", icon: Shield, description: "Review status and upcoming tasks" },
    { id: "audit-export", label: "Audit Export", icon: FileText, description: "RSM AS.1-AS.7 evidence generation" },
    { id: "review-log", label: "Review Log", icon: ClipboardCheck, description: "Visual audit trail with sign-off history" },
    { id: "audit-trail", label: "Audit Trail", icon: History, description: "Settings change history" },
    { id: "settings", label: "Settings", icon: Settings, description: "Manage reviewers, approvers, and schedules" },
  ]

  return (
    <main className="w-full min-h-screen">
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
        {accountInfo && (
          <div className="flex items-center gap-3 mb-6 text-sm text-muted-foreground">
            <Badge variant="outline" className="font-mono">
              {accountInfo.account || "Loading..."}
            </Badge>
            <span>User: {accountInfo.user}</span>
            <span>Role: {accountInfo.role}</span>
            {accountInfo.isOrgAdmin && (
              <Badge className="bg-[#0F2D4E] text-white text-xs">Org Admin</Badge>
            )}
          </div>
        )}

        {activeSection === "dashboard" && (
          <DashboardView
            reviewLog={reviewLog?.data || []}
            loading={reviewLogLoading}
            accountInfo={accountInfo}
          />
        )}
        {activeSection === "audit-export" && <AuditExportView />}
        {activeSection === "review-log" && (
          <ReviewLogView
            reviewLog={reviewLog?.data || []}
            loading={reviewLogLoading}
            accountInfo={accountInfo}
          />
        )}
        {activeSection === "audit-trail" && <AuditTrailView />}
        {activeSection === "settings" && <SettingsView />}
      </div>
    </main>
  )
}

function DashboardView({ reviewLog, loading, accountInfo }: { reviewLog: any[]; loading: boolean; accountInfo: any }) {
  const { data: reviewers } = useQuery({
    queryKey: ["reviewers"],
    queryFn: () => fetch("/api/settings/reviewers").then((r) => r.json()).catch(() => ({ data: [] })),
  })

  const assignedReviewers = (reviewers?.data || []) as any[]
  const uniqueAdmins = [...new Set(assignedReviewers.filter((r: any) => r.ACTIVE).map((r: any) => r.SNOWFLAKE_USER))]

  const trackerRows = reviewSchedule.map((review) => {
    const completed = reviewLog.filter((r: any) => r.REVIEW_TYPE === review.type && r.STATUS === "COMPLETED")
    const pending = reviewLog.filter((r: any) => r.REVIEW_TYPE === review.type && r.STATUS === "PENDING_APPROVAL")
    const lastCompleted = completed.length > 0 ? completed[0] : null
    const lastPending = pending.length > 0 ? pending[0] : null

    let status = "Not Started"
    let statusColor = "text-gray-500"
    if (lastCompleted) { status = "Completed"; statusColor = "text-[#00A85C]" }
    else if (lastPending) { status = "Pending Approval"; statusColor = "text-blue-600" }

    return { ...review, status, statusColor, lastCompleted, lastPending }
  })

  const completedCount = trackerRows.filter((r) => r.status === "Completed").length
  const pendingCount = trackerRows.filter((r) => r.status === "Pending Approval").length
  const notStartedCount = trackerRows.filter((r) => r.status === "Not Started").length

  // Pending approval items where current user is NOT the reviewer (can approve)
  const canApprove = reviewLog.filter(
    (r: any) => r.STATUS === "PENDING_APPROVAL" && r.REVIEWER !== accountInfo?.user
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Compliance Dashboard</h2>
        <p className="text-muted-foreground mt-1">Upcoming reviews and compliance status</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 p-3 bg-[#FBBA16]/10 border border-[#FBBA16]/30 rounded-lg">
          <div className="w-5 h-5 border-2 border-[#016268] border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-sm">Connecting to Snowflake and loading review data...</span>
        </div>
      )}

      {/* Awaiting Your Approval */}
      {canApprove.length > 0 && (
        <Card className="p-4 border-2 border-blue-300 bg-blue-50/50 dark:bg-blue-900/10">
          <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Awaiting Your Approval ({canApprove.length})
          </h3>
          <div className="space-y-2">
            {canApprove.map((entry: any) => {
              const label = reviewSchedule.find((r) => r.type === entry.REVIEW_TYPE)?.label || entry.REVIEW_TYPE
              return (
                <div key={entry.ID} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded p-3 border">
                  <div>
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground text-sm ml-2">Period: {entry.REVIEW_PERIOD}</span>
                    <span className="text-muted-foreground text-sm ml-2">Reviewed by: {entry.REVIEWER}</span>
                  </div>
                  <ApproveButton reviewId={entry.ID} reviewType={entry.REVIEW_TYPE} />
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Scorecard */}
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
        <h3 className="text-lg font-semibold mb-4">Compliance Tracker</h3>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0F2D4E] text-white">
                  <th className="px-4 py-3 text-left font-medium">Review</th>
                  <th className="px-4 py-3 text-left font-medium">Cadence</th>
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
                      <span className={`font-medium ${row.statusColor}`}>
                        {row.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                        {row.status === "Pending Approval" && <Clock className="w-3.5 h-3.5 inline mr-1" />}
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.lastCompleted?.REVIEWER || row.lastPending?.REVIEWER || "--"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.lastCompleted?.REVIEWED_AT?.slice(0, 10) || row.lastPending?.REVIEWED_AT?.slice(0, 10) || "--"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.lastCompleted?.APPROVER ? (
                        <span>{row.lastCompleted.APPROVER} <span className="text-muted-foreground">({row.lastCompleted.APPROVED_AT?.slice(0, 10)})</span></span>
                      ) : "--"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/review?type=${row.type}`}>
                        <Button size="sm" variant={row.status === "Completed" ? "outline" : "default"}
                          className={row.status === "Completed" ? "" : "bg-[#0F2D4E] hover:bg-[#0F2D4E]/90"}
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
        <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
        <Card className="p-4">
          {(() => {
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
            activities.sort((a, b) => (b.time || "").localeCompare(a.time || ""))

            if (activities.length === 0) {
              return (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No activity yet. Activity will appear here as admins complete reviews and approve sign-offs.
                </div>
              )
            }
            return (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {activities.slice(0, 20).map((act, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 ${act.color}`}>
                      {act.icon === "check" ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{act.text}</div>
                      <div className="text-xs text-muted-foreground">
                        {act.time ? new Date(act.time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
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

// ==================== APPROVE BUTTON WITH CERTIFICATION MODAL ====================

function ApproveButton({ reviewId, reviewType }: { reviewId: number; reviewType: string }) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [certified, setCertified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const queryClient = useQueryClient()

  const label = reviewSchedule.find((r) => r.type === reviewType)?.label || reviewType

  async function handleApprove() {
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/review/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          approverNotes: notes,
          certificationAcknowledged: certified,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Approval failed")
      } else {
        setOpen(false)
        queryClient.invalidateQueries({ queryKey: ["review-log"] })
      }
    } catch {
      setError("Network error")
    }
    setSubmitting(false)
  }

  if (!open) {
    return (
      <Button size="sm" className="bg-[#00A85C] hover:bg-[#00A85C]/90" onClick={() => setOpen(true)}>
        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
      <Card className="p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-2">Approve: {label}</h3>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3 mb-4 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300 mb-2">Certification Statement</p>
          <p className="text-amber-700 dark:text-amber-400">
            I certify that I have independently reviewed the evidence and findings for this compliance review.
            I confirm the review was conducted in accordance with Bank of Missouri compliance policies and
            that the data has been accurately represented.
          </p>
        </div>
        <label className="flex items-start gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={certified}
            onChange={(e) => setCertified(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            I understand I am certifying this review as a separate approver and that I am not the person who conducted the review.
          </span>
        </label>
        <textarea
          className="w-full border rounded p-3 text-sm bg-background mb-3"
          rows={3}
          placeholder="Approver notes (optional)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={handleApprove} disabled={!certified || submitting} className="bg-[#00A85C] hover:bg-[#00A85C]/90">
            {submitting ? "Approving..." : "Confirm Approval"}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}

// ==================== COMMENT THREAD ====================

function CommentThread({ reviewId }: { reviewId: number }) {
  const [expanded, setExpanded] = useState(false)
  const [newComment, setNewComment] = useState("")
  const queryClient = useQueryClient()

  const { data: comments } = useQuery({
    queryKey: ["comments", reviewId],
    queryFn: () => fetch(`/api/review/comments?reviewId=${reviewId}`).then((r) => r.json()),
    enabled: expanded,
  })

  const addComment = useMutation({
    mutationFn: async () => {
      await fetch("/api/review/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, comment: newComment }),
      })
    },
    onSuccess: () => {
      setNewComment("")
      queryClient.invalidateQueries({ queryKey: ["comments", reviewId] })
    },
  })

  return (
    <div className="mt-2">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <MessageSquare className="w-3.5 h-3.5" />
        Comments {comments?.data?.length > 0 && `(${comments.data.length})`}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-muted">
          {(comments?.data || []).map((c: any) => (
            <div key={c.ID} className="text-xs">
              <span className="font-medium">{c.AUTHOR}</span>
              <span className="text-muted-foreground ml-1">
                {c.CREATED_AT ? new Date(c.CREATED_AT).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
              </span>
              <p className="mt-0.5">{c.COMMENT}</p>
            </div>
          ))}
          <div className="flex gap-1">
            <input
              type="text"
              className="flex-1 text-xs border rounded px-2 py-1 bg-background"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newComment.trim() && addComment.mutate()}
            />
            <Button size="sm" variant="ghost" onClick={() => newComment.trim() && addComment.mutate()} disabled={!newComment.trim()}>
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== VIEWS ====================

function AuditExportView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">RSM Audit Export</h2>
          <p className="text-muted-foreground mt-1">Generate and review AS.1-AS.7 evidence for auditors</p>
        </div>
        <Link href="/audit">
          <Button className="bg-[#0F2D4E] hover:bg-[#0F2D4E]/90">
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

function ReviewLogView({ reviewLog, loading, accountInfo }: { reviewLog: any[]; loading: boolean; accountInfo: any }) {
  function downloadEvidence(entry: any) {
    const evidence = entry.EVIDENCE_DATA
    if (!evidence) return
    let data: any[]
    try { data = typeof evidence === "string" ? JSON.parse(evidence) : Array.isArray(evidence) ? evidence : [evidence] } catch { data = [{ note: "Evidence data could not be parsed" }] }
    if (data.length === 0) return
    const headers = Object.keys(data[0])
    const escape = (val: any) => { const s = val == null ? "" : String(val); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s }
    const csv = [headers.join(","), ...data.map((row: any) => headers.map((h) => escape(row[h])).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `${entry.REVIEW_TYPE}_${entry.REVIEW_PERIOD}_evidence.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Review Log</h2>
        <p className="text-muted-foreground mt-1">Audit trail of all completed reviews with sign-off records</p>
      </div>

      {reviewLog.length === 0 ? (
        <Card className="p-8 text-center">
          {loading ? (
            <>
              <div className="w-12 h-12 mx-auto mb-3 border-4 border-[#016268] border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Connecting to Snowflake...</p>
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
            <Card key={entry.ID || i} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.REVIEW_TYPE}</span>
                    <StatusBadge status={entry.STATUS || "unknown"} />
                    {entry.ACCOUNT && <Badge variant="outline" className="text-xs">{entry.ACCOUNT}</Badge>}
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
                <div className="mt-2 text-sm bg-muted/50 rounded p-2">Notes: {entry.REVIEWER_NOTES}</div>
              )}
              <div className="flex items-center gap-3 mt-2">
                {entry.EVIDENCE_DATA && (
                  <Button size="sm" variant="outline" onClick={() => downloadEvidence(entry)} className="text-xs">
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download Evidence CSV
                  </Button>
                )}
                {entry.STATUS === "PENDING_APPROVAL" && entry.REVIEWER !== accountInfo?.user && (
                  <ApproveButton reviewId={entry.ID} reviewType={entry.REVIEW_TYPE} />
                )}
              </div>
              <CommentThread reviewId={entry.ID} />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function AuditTrailView() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-trail"],
    queryFn: () => fetch("/api/audit-trail").then((r) => r.json()),
  })

  const [filterUser, setFilterUser] = useState("")
  const [filterType, setFilterType] = useState("")

  const entries = (data?.data || []) as any[]
  const users = [...new Set(entries.map((e: any) => e.CHANGED_BY).filter(Boolean))]
  const types = [...new Set(entries.map((e: any) => e.CHANGE_TYPE).filter(Boolean))]

  const filtered = entries.filter((e: any) => {
    if (filterUser && e.CHANGED_BY !== filterUser) return false
    if (filterType && e.CHANGE_TYPE !== filterType) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Audit Trail</h2>
        <p className="text-muted-foreground mt-1">History of all settings changes and administrative actions</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select className="border rounded px-3 py-2 text-sm bg-background" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
          <option value="">All Users</option>
          {users.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select className="border rounded px-3 py-2 text-sm bg-background" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Actions</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 border-4 border-[#016268] border-t-transparent rounded-full animate-spin" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <History className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No audit trail entries found.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0F2D4E] text-white">
                  <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry: any) => (
                  <tr key={entry.ID} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {entry.CHANGED_AT ? new Date(entry.CHANGED_AT).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
                      }) : "--"}
                    </td>
                    <td className="px-4 py-3 font-medium">{entry.CHANGED_BY || "--"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{entry.CHANGE_TYPE || "--"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[400px] truncate">{entry.DETAILS || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
    { id: "TBOM_MAIN", label: "TBOM Main (OWB85847)" },
    { id: "CONTRACT_SERVICES", label: "Contract Services (KRC49646)" },
    { id: "SPECIALTY_FINANCE", label: "Specialty Finance (WEC34903)" },
    { id: "PCI_SECURE", label: "PCI Secure (ARC23842)" },
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
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage environment admins and notification settings</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">Environment Admins</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Any admin can review or approve -- but the reviewer and approver must be different people.
        </p>

        <div className="flex gap-3 items-end mb-6 flex-wrap">
          <div>
            <label className="text-sm font-medium block mb-1">Environment</label>
            <select className="border rounded px-3 py-2 text-sm bg-background" value={newAdmin.environment} onChange={(e) => setNewAdmin({ ...newAdmin, environment: e.target.value })}>
              <option value="">Select environment...</option>
              {environments.map((env) => <option key={env.id} value={env.id}>{env.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Snowflake Username</label>
            <input type="text" className="border rounded px-3 py-2 text-sm bg-background" placeholder="e.g. SHAGAN" value={newAdmin.snowflakeUser} onChange={(e) => setNewAdmin({ ...newAdmin, snowflakeUser: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input type="email" className="border rounded px-3 py-2 text-sm bg-background" placeholder="e.g. shagan@bankofmissouri.com" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} />
          </div>
          <Button onClick={addAdmin} disabled={saving} className="bg-[#0F2D4E] hover:bg-[#0F2D4E]/90">
            {saving ? "Adding..." : "Add Admin"}
          </Button>
        </div>

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
                  <span className="text-xs text-[#00A85C] bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">Ready</span>
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
                      {admin.EMAIL && <span className="text-muted-foreground text-xs">({admin.EMAIL})</span>}
                      <button onClick={() => removeAdmin(admin.ID)} className="ml-1 text-muted-foreground hover:text-red-600 transition-colors">
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
