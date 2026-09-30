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

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (!auth.authorized) {
      return Response.json({ error: "Not authorized" }, { status: 403 })
    }

    const rows = await querySnowflake(
      "SELECT * FROM AUDIT_APP_DB.APP_SCHEMA.SETTINGS_CHANGE_LOG ORDER BY CHANGED_AT DESC LIMIT 500",
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
