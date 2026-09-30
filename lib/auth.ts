import { querySnowflake } from "@/lib/snowflake"

export interface AuthContext {
  user: string
  isOrgAdmin: boolean
  accounts: string[]
  authorized: boolean
}

const ORG_ADMIN_USER = "SHAGAN"
// SPCS service accounts (owner's-rights mode) should be treated as org admin
const SPCS_SERVICE_PATTERN = /^MANAGED_SERVICE_\d+$/

export async function getAuthContext(): Promise<AuthContext> {
  const userRows = await querySnowflake("SELECT CURRENT_USER() AS USERNAME")
  const user = (userRows[0]?.USERNAME ?? "").toString().toUpperCase()

  if (!user) {
    return { user: "", isOrgAdmin: false, accounts: [], authorized: false }
  }

  const isOrgAdmin = user === ORG_ADMIN_USER || SPCS_SERVICE_PATTERN.test(user)

  // Org admin has access to everything
  if (isOrgAdmin) {
    return {
      user,
      isOrgAdmin: true,
      accounts: ["TBOM_MAIN", "CONTRACT_SERVICES", "SPECIALTY_FINANCE", "PCI_SECURE"],
      authorized: true,
    }
  }

  // Check if user exists in REVIEWERS table
  const reviewerRows = await querySnowflake(
    "SELECT DISTINCT REVIEW_TYPE FROM AUDIT_APP_DB.APP_SCHEMA.REVIEWERS WHERE SNOWFLAKE_USER = ? AND ACTIVE = TRUE",
    { binds: [user] },
  )

  if (reviewerRows.length === 0) {
    return { user, isOrgAdmin: false, accounts: [], authorized: false }
  }

  return {
    user,
    isOrgAdmin: false,
    accounts: reviewerRows.map((r: any) => r.REVIEW_TYPE),
    authorized: true,
  }
}
