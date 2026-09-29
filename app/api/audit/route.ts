import { NextRequest } from "next/server"
import { querySnowflake } from "@/lib/snowflake"
import { AUDIT_QUERIES, REVIEW_QUERIES } from "@/lib/queries"

export const dynamic = "force-dynamic"

function toIso(val: unknown): string | null {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

type AuditKey = keyof typeof AUDIT_QUERIES
type ReviewKey = keyof typeof REVIEW_QUERIES

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k] = v instanceof Date ? toIso(v) : v
  }
  return out
}

export async function GET(request: NextRequest) {
  try {
    const control = request.nextUrl.searchParams.get("control") ?? ""
    const type = request.nextUrl.searchParams.get("type") ?? "audit"

    let sql: string | undefined
    if (type === "audit") {
      sql = AUDIT_QUERIES[control as AuditKey]
    } else if (type === "review") {
      sql = REVIEW_QUERIES[control as ReviewKey]
    }

    if (!sql) {
      return Response.json(
        { error: `Unknown ${type} control: ${control}` },
        { status: 400 },
      )
    }

    const rows = await querySnowflake(sql)
    const normalized = rows.map(normalizeRow)

    const acct = await querySnowflake("SELECT CURRENT_ACCOUNT() AS ACCT")
    const account = acct[0]?.ACCT ?? "unknown"

    return Response.json({
      data: normalized,
      control,
      generatedAt: new Date().toISOString(),
      account,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
