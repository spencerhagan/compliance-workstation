import { NextRequest } from "next/server"
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
    const rows = await querySnowflake(
      "SELECT * FROM AUDIT_APP_DB.APP_SCHEMA.REVIEWERS WHERE ACTIVE = TRUE ORDER BY REVIEW_TYPE, SNOWFLAKE_USER",
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
    const body = await request.json()
    const { reviewType, role, snowflakeUser, email } = body

    if (!reviewType || !role || !snowflakeUser) {
      return Response.json(
        { error: "Missing required fields: reviewType, role, snowflakeUser" },
        { status: 400 },
      )
    }

    const sql = `
      INSERT INTO AUDIT_APP_DB.APP_SCHEMA.REVIEWERS
        (REVIEW_TYPE, ROLE, SNOWFLAKE_USER, EMAIL, ACTIVE, CREATED_AT)
      VALUES
        (?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP())
    `

    await querySnowflake(sql, {
      binds: [reviewType, role, snowflakeUser, email ?? null],
    })

    return Response.json({
      success: true,
      message: "Reviewer added",
      reviewType,
      snowflakeUser,
      createdAt: toIso(new Date()),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get("id")

    if (!id) {
      return Response.json(
        { error: "Missing required query parameter: id" },
        { status: 400 },
      )
    }

    const sql = `
      UPDATE AUDIT_APP_DB.APP_SCHEMA.REVIEWERS
      SET ACTIVE = FALSE
      WHERE ID = ?
    `

    await querySnowflake(sql, { binds: [id] })

    return Response.json({
      success: true,
      message: "Reviewer deactivated",
      id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
