import { NextRequest } from "next/server"
import { querySnowflake } from "@/lib/snowflake"

export const dynamic = "force-dynamic"

function toIso(val: unknown): string | null {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reviewId, approver, approverNotes } = body

    if (!reviewId || !approver) {
      return Response.json(
        { error: "Missing required fields: reviewId, approver" },
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

    if (row.REVIEWER === approver) {
      return Response.json(
        { error: "Approver cannot be the same person as the reviewer" },
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
      binds: [approver, approverNotes ?? null, reviewId],
    })

    return Response.json({
      success: true,
      message: "Review approved",
      reviewId,
      approver,
      status: "COMPLETED",
      approvedAt: toIso(new Date()),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
