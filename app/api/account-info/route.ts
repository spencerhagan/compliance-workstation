import { querySnowflake } from "@/lib/snowflake"

export const dynamic = "force-dynamic"

function toIso(val: unknown): string | null {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

export async function GET() {
  try {
    const rows = await querySnowflake(
      "SELECT CURRENT_ACCOUNT() AS ACCOUNT, CURRENT_ACCOUNT_NAME() AS ACCOUNT_NAME, CURRENT_USER() AS USERNAME, CURRENT_ROLE() AS ROLE, CURRENT_REGION() AS REGION",
    )
    const row = rows[0] ?? {}
    const acct = (row.ACCOUNT ?? "").toString().toUpperCase()
    const acctName = (row.ACCOUNT_NAME ?? "").toString().toUpperCase()
    const isMain = acct === "OWB85847" || acctName === "SRB23980"

    return Response.json({
      account: row.ACCOUNT ?? null,
      accountName: row.ACCOUNT_NAME ?? null,
      user: row.USERNAME ?? null,
      role: row.ROLE ?? null,
      region: row.REGION ?? null,
      isMainAccount: isMain,
      generatedAt: toIso(new Date()),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
