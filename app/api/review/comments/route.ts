import { NextRequest } from "next/server"
import { querySnowflake } from "@/lib/snowflake"
import { getAuthContext } from "@/lib/auth"

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

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth.authorized) {
      return Response.json({ error: "Not authorized" }, { status: 403 })
    }

    const reviewId = request.nextUrl.searchParams.get("reviewId")
    if (!reviewId) {
      return Response.json({ error: "Missing reviewId" }, { status: 400 })
    }

    const rows = await querySnowflake(
      "SELECT * FROM AUDIT_APP_DB.APP_SCHEMA.REVIEW_COMMENTS WHERE REVIEW_ID = ? ORDER BY CREATED_AT ASC",
      { binds: [reviewId] },
    )

    return Response.json({
      data: rows.map(normalizeRow),
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth.authorized) {
      return Response.json({ error: "Not authorized" }, { status: 403 })
    }

    const body = await request.json()
    const { reviewId, comment } = body

    if (!reviewId || !comment) {
      return Response.json({ error: "Missing required fields: reviewId, comment" }, { status: 400 })
    }

    await querySnowflake(
      `INSERT INTO AUDIT_APP_DB.APP_SCHEMA.REVIEW_COMMENTS (REVIEW_ID, AUTHOR, COMMENT) VALUES (?, ?, ?)`,
      { binds: [reviewId, auth.user, comment] },
    )

    return Response.json({
      success: true,
      message: "Comment added",
      author: auth.user,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
