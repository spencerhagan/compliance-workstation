import { NextRequest } from "next/server"
import { querySnowflake } from "@/lib/snowflake"
import { getAuthContext } from "@/lib/auth"

export const dynamic = "force-dynamic"

function toIso(val: unknown): string | null {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth.authorized) {
      return Response.json({ error: "Not authorized" }, { status: 403 })
    }

    const body = await request.json()
    const { reviewId, approverNotes, certificationAcknowledged } = body

    if (!reviewId) {
      return Response.json(
        { error: "Missing required field: reviewId" },
        { status: 400 },
      )
    }

    if (!certificationAcknowledged) {
      return Response.json(
        { error: "Certification must be acknowledged before approving" },
        { status: 400 },
      )
    }

    const existing = await querySnowflake(
      "SELECT REVIEWER, STATUS FROM AUDIT_APP_DB.APP_SCHEMA.REVIEW_LOG WHERE ID = ?",
      { binds: [reviewId] },
    )

    if (existing.length === 0) {
      return Response.json(
        { error: `Review ID ${reviewId} not found` },
        { status: 404 },
      )
    }

    const row = existing[0]

    if (row.STATUS !== "PENDING_APPROVAL") {
      return Response.json(
        { error: `Review is not pending approval (current status: ${row.STATUS})` },
        { status: 400 },
      )
    }

    if (row.REVIEWER === auth.user) {
      return Response.json(
        { error: "Approver cannot be the same person as the reviewer (separation of duties)" },
        { status: 400 },
      )
    }

    const sql = `
      UPDATE AUDIT_APP_DB.APP_SCHEMA.REVIEW_LOG
      SET STATUS = 'COMPLETED',
          APPROVER = ?,
          APPROVER_NOTES = ?,
          APPROVED_AT = CURRENT_TIMESTAMP()
      WHERE ID = ?
    `

    await querySnowflake(sql, {
      binds: [auth.user, approverNotes ?? null, reviewId],
    })

    return Response.json({
      success: true,
      message: "Review approved",
      reviewId,
      approver: auth.user,
      status: "COMPLETED",
      approvedAt: toIso(new Date()),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
