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
    const { reviewType, reviewPeriod, reviewer, reviewerNotes, evidenceData, rowCount } = body

    if (!reviewType || !reviewPeriod || !reviewer) {
      return Response.json(
        { error: "Missing required fields: reviewType, reviewPeriod, reviewer" },
        { status: 400 },
      )
    }

    const sql = `
      INSERT INTO AUDIT_APP_DB.APP_SCHEMA.REVIEW_LOG
        (REVIEW_TYPE, REVIEW_PERIOD, REVIEWER, REVIEWER_NOTES, EVIDENCE_DATA, ROW_COUNT, STATUS, REVIEWED_AT, CREATED_AT)
      VALUES
        (?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
    `

    await querySnowflake(sql, {
      binds: [
        reviewType,
        reviewPeriod,
        reviewer,
        reviewerNotes ?? null,
        evidenceData ? JSON.stringify(evidenceData) : null,
        rowCount ?? 0,
      ],
    })

    return Response.json({
      success: true,
      message: "Review signed off, pending approval",
      reviewType,
      reviewPeriod,
      reviewer,
      status: "PENDING_APPROVAL",
      signedAt: toIso(new Date()),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
