import { querySnowflake } from "@/lib/snowflake"

export const dynamic = "force-dynamic"

function toIso(val: unknown): string | null {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k] = v instanceof Date ? toIso(v) : v
  }
  return out
}

export async function GET() {
  try {
    const sql = `
      WITH schedule AS (
        SELECT
          s.REVIEW_TYPE,
          s.CADENCE,
          s.OWNER,
          s.NEXT_DUE_DATE,
          s.DESCRIPTION
        FROM AUDIT_APP_DB.APP_SCHEMA.REVIEW_SCHEDULE s
        WHERE s.ACTIVE = TRUE
      ),
      latest_completed AS (
        SELECT
          REVIEW_TYPE,
          MAX(APPROVED_AT) AS LAST_COMPLETED_AT,
          MAX(REVIEW_PERIOD) AS LAST_PERIOD
        FROM AUDIT_APP_DB.APP_SCHEMA.REVIEW_LOG
        WHERE STATUS = 'COMPLETED'
        GROUP BY REVIEW_TYPE
      )
      SELECT
        s.REVIEW_TYPE,
        s.CADENCE,
        s.OWNER,
        s.NEXT_DUE_DATE,
        s.DESCRIPTION,
        lc.LAST_COMPLETED_AT,
        lc.LAST_PERIOD,
        CASE
          WHEN s.NEXT_DUE_DATE < CURRENT_DATE() AND lc.LAST_COMPLETED_AT IS NULL THEN 'OVERDUE'
          WHEN s.NEXT_DUE_DATE < CURRENT_DATE() AND lc.LAST_COMPLETED_AT < s.NEXT_DUE_DATE THEN 'OVERDUE'
          WHEN s.NEXT_DUE_DATE <= DATEADD('day', 14, CURRENT_DATE()) THEN 'UPCOMING'
          ELSE 'ON_TRACK'
        END AS STATUS
      FROM schedule s
      LEFT JOIN latest_completed lc ON lc.REVIEW_TYPE = s.REVIEW_TYPE
      ORDER BY s.NEXT_DUE_DATE ASC
    `

    const rows = await querySnowflake(sql)

    return Response.json({
      data: rows.map(normalizeRow),
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
