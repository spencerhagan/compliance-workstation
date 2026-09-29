// All audit and review SQL queries for the TBOM Compliance Workstation.
// Each query returns columns matching the exact CSV format auditors expect.

export const AUDIT_QUERIES = {
  // AS.1 - Password Policy Configuration
  "as1": `
    SELECT
      p.NAME AS POLICY_NAME,
      p.DATABASE_NAME,
      p.SCHEMA_NAME,
      p.OWNER,
      p.PASSWORD_MIN_LENGTH,
      p.PASSWORD_MAX_LENGTH,
      p.PASSWORD_MIN_UPPER_CASE_CHARS,
      p.PASSWORD_MIN_LOWER_CASE_CHARS,
      p.PASSWORD_MIN_NUMERIC_CHARS,
      p.PASSWORD_MIN_SPECIAL_CHARS,
      p.PASSWORD_MIN_AGE_DAYS,
      p.PASSWORD_MAX_AGE_DAYS,
      p.PASSWORD_MAX_RETRIES,
      p.PASSWORD_LOCKOUT_TIME_MINS,
      p.PASSWORD_HISTORY,
      p.COMMENT,
      p.CREATED,
      p.LAST_ALTERED
    FROM SNOWFLAKE.ACCOUNT_USAGE.PASSWORD_POLICIES p
    WHERE p.DELETED IS NULL
    ORDER BY p.NAME
  `,

  // AS.2 - Application Access Lists (Role Inventory)
  "as2": `
    SELECT
      r.NAME AS ROLE_NAME,
      r.OWNER AS ROLE_OWNER,
      r.CREATED_ON,
      r.COMMENT,
      COALESCE(gc.GRANTEE_COUNT, 0) AS USER_COUNT,
      COALESCE(pc.PRIVILEGE_COUNT, 0) AS PRIVILEGE_COUNT
    FROM SNOWFLAKE.ACCOUNT_USAGE.ROLES r
    LEFT JOIN (
      SELECT ROLE, COUNT(DISTINCT GRANTEE_NAME) AS GRANTEE_COUNT
      FROM SNOWFLAKE.ACCOUNT_USAGE.GRANTS_TO_USERS
      WHERE DELETED_ON IS NULL
      GROUP BY ROLE
    ) gc ON gc.ROLE = r.NAME
    LEFT JOIN (
      SELECT GRANTEE_NAME AS ROLE_NAME, COUNT(*) AS PRIVILEGE_COUNT
      FROM SNOWFLAKE.ACCOUNT_USAGE.GRANTS_TO_ROLES
      WHERE DELETED_ON IS NULL
      GROUP BY GRANTEE_NAME
    ) pc ON pc.ROLE_NAME = r.NAME
    WHERE r.DELETED_ON IS NULL
    ORDER BY r.NAME
  `,

  // AS.4 - User Access Review (matches exact CSV format from prior audit)
  "as4": `
    SELECT
      u.NAME AS USER_NAME,
      u.LOGIN_NAME,
      u.EMAIL,
      u.TYPE AS USER_TYPE,
      g.ROLE AS ASSIGNED_ROLE,
      u.DEFAULT_ROLE,
      g.GRANTED_BY,
      u.CREATED_ON AS USER_CREATED_ON,
      u.LAST_SUCCESS_LOGIN,
      u.PASSWORD_LAST_SET_TIME,
      u.SNOWFLAKE_LOCK AS ACCOUNT_EXPIRES_AT,
      u.MUST_CHANGE_PASSWORD,
      u.HAS_PASSWORD,
      u.DISABLED,
      u.SNOWFLAKE_LOCK AS LOCKED_UNTIL_TIME,
      u.HAS_MFA,
      u.HAS_RSA_PUBLIC_KEY,
      u.OWNER AS USER_OWNER,
      u.COMMENT AS USER_COMMENT
    FROM SNOWFLAKE.ACCOUNT_USAGE.USERS u
    LEFT JOIN SNOWFLAKE.ACCOUNT_USAGE.GRANTS_TO_USERS g
      ON g.GRANTEE_NAME = u.NAME
      AND g.DELETED_ON IS NULL
    WHERE u.DELETED_ON IS NULL
    ORDER BY u.NAME, g.ROLE
  `,

  // AS.5 - Administrative / Elevated Access Rights
  "as5": `
    SELECT
      u.NAME AS USER_NAME,
      u.LOGIN_NAME,
      u.EMAIL,
      u.TYPE AS USER_TYPE,
      g.ROLE AS ELEVATED_ROLE,
      CASE g.ROLE
        WHEN 'ACCOUNTADMIN' THEN 'FULL ADMIN: Add/delete users, modify all security settings, billing, full account control'
        WHEN 'SECURITYADMIN' THEN 'SECURITY ADMIN: Manage grants, create/manage roles'
        WHEN 'SYSADMIN' THEN 'SYSTEM ADMIN: Create/manage warehouses, databases, schemas, infrastructure'
        WHEN 'USERADMIN' THEN 'USER ADMIN: Add/delete users, create/manage roles'
        WHEN 'ORGADMIN' THEN 'ORG ADMIN: Manage organization-level operations'
      END AS ROLE_DESCRIPTION,
      g.GRANTED_BY,
      g.CREATED_ON AS ROLE_GRANTED_ON,
      u.CREATED_ON AS USER_CREATED_ON,
      u.LAST_SUCCESS_LOGIN,
      u.PASSWORD_LAST_SET_TIME,
      u.SNOWFLAKE_LOCK AS ACCOUNT_EXPIRES_AT,
      u.DISABLED,
      u.HAS_MFA,
      u.SNOWFLAKE_LOCK AS LOCKED_UNTIL_TIME,
      u.OWNER AS USER_OWNER
    FROM SNOWFLAKE.ACCOUNT_USAGE.USERS u
    JOIN SNOWFLAKE.ACCOUNT_USAGE.GRANTS_TO_USERS g
      ON g.GRANTEE_NAME = u.NAME
      AND g.DELETED_ON IS NULL
    WHERE u.DELETED_ON IS NULL
      AND g.ROLE IN ('ACCOUNTADMIN', 'SECURITYADMIN', 'SYSADMIN', 'USERADMIN', 'ORGADMIN')
    ORDER BY
      CASE g.ROLE
        WHEN 'ACCOUNTADMIN' THEN 1
        WHEN 'SECURITYADMIN' THEN 2
        WHEN 'SYSADMIN' THEN 3
        WHEN 'USERADMIN' THEN 4
        WHEN 'ORGADMIN' THEN 5
      END,
      u.NAME
  `,

  // AS.6 - Segregation of Duties Matrix
  "as6": `
    WITH elevated_users AS (
      SELECT
        g.GRANTEE_NAME AS USER_NAME,
        u.LOGIN_NAME,
        u.EMAIL,
        u.TYPE AS USER_TYPE,
        g.ROLE AS ELEVATED_ROLE,
        u.DISABLED
      FROM SNOWFLAKE.ACCOUNT_USAGE.GRANTS_TO_USERS g
      JOIN SNOWFLAKE.ACCOUNT_USAGE.USERS u
        ON u.NAME = g.GRANTEE_NAME AND u.DELETED_ON IS NULL
      WHERE g.DELETED_ON IS NULL
        AND g.ROLE IN ('ACCOUNTADMIN', 'SECURITYADMIN', 'SYSADMIN', 'USERADMIN')
    )
    SELECT
      a.USER_NAME,
      a.LOGIN_NAME,
      a.EMAIL,
      a.USER_TYPE,
      a.ELEVATED_ROLE AS ROLE_A,
      b.ELEVATED_ROLE AS ROLE_B,
      CASE
        WHEN a.ELEVATED_ROLE = 'ACCOUNTADMIN' AND b.ELEVATED_ROLE = 'SECURITYADMIN'
          THEN 'HIGH: Full admin + security admin on same user'
        WHEN a.ELEVATED_ROLE = 'ACCOUNTADMIN' AND b.ELEVATED_ROLE = 'SYSADMIN'
          THEN 'MEDIUM: Full admin + system admin on same user'
        WHEN a.ELEVATED_ROLE = 'SECURITYADMIN' AND b.ELEVATED_ROLE = 'SYSADMIN'
          THEN 'MEDIUM: Security admin + system admin on same user'
        ELSE 'LOW: Multiple elevated roles'
      END AS CONFLICT_TYPE,
      a.DISABLED
    FROM elevated_users a
    JOIN elevated_users b
      ON a.USER_NAME = b.USER_NAME AND a.ELEVATED_ROLE < b.ELEVATED_ROLE
    ORDER BY
      CASE
        WHEN a.ELEVATED_ROLE = 'ACCOUNTADMIN' THEN 1
        ELSE 2
      END,
      a.USER_NAME
  `,

  // AS.7 - Job Scheduling (Task History)
  "as7": `
    SELECT
      DATABASE_NAME,
      SCHEMA_NAME,
      NAME AS TASK_NAME,
      STATE,
      SCHEDULED_TIME,
      QUERY_START_TIME,
      COMPLETED_TIME,
      QUERY_TEXT,
      ERROR_CODE,
      ERROR_MESSAGE,
      QUERY_ID,
      RUN_ID,
      ATTEMPT_NUMBER
    FROM SNOWFLAKE.ACCOUNT_USAGE.TASK_HISTORY
    WHERE SCHEDULED_TIME >= DATEADD('day', -30, CURRENT_TIMESTAMP())
    ORDER BY SCHEDULED_TIME DESC
    LIMIT 5000
  `,
} as const

export const REVIEW_QUERIES = {
  // Monthly: Failed Login Review (last 30 days)
  "failed_login": `
    SELECT
      USER_NAME,
      CLIENT_IP,
      REPORTED_CLIENT_TYPE,
      FIRST_AUTHENTICATION_FACTOR,
      ERROR_CODE,
      ERROR_MESSAGE,
      EVENT_TIMESTAMP,
      IS_SUCCESS
    FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
    WHERE EVENT_TIMESTAMP >= DATEADD('day', -30, CURRENT_TIMESTAMP())
      AND IS_SUCCESS = 'NO'
    ORDER BY EVENT_TIMESTAMP DESC
  `,

  // Monthly: Audit & Change Log Review (DDL changes, medium/high severity)
  "change_log": `
    SELECT
      QUERY_TEXT,
      USER_NAME,
      ROLE_NAME,
      DATABASE_NAME,
      SCHEMA_NAME,
      QUERY_TYPE,
      EXECUTION_STATUS,
      START_TIME,
      END_TIME,
      ERROR_CODE,
      ERROR_MESSAGE
    FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
    WHERE START_TIME >= DATEADD('day', -30, CURRENT_TIMESTAMP())
      AND QUERY_TYPE IN (
        'CREATE_TABLE', 'DROP_TABLE', 'ALTER_TABLE',
        'CREATE_VIEW', 'DROP_VIEW', 'ALTER_VIEW',
        'CREATE_ROLE', 'DROP_ROLE', 'ALTER_ROLE',
        'CREATE_USER', 'DROP_USER', 'ALTER_USER',
        'GRANT', 'REVOKE',
        'CREATE_MASKING_POLICY', 'DROP_MASKING_POLICY',
        'CREATE_ROW_ACCESS_POLICY', 'DROP_ROW_ACCESS_POLICY',
        'CREATE_NETWORK_POLICY', 'DROP_NETWORK_POLICY'
      )
    ORDER BY START_TIME DESC
    LIMIT 5000
  `,

  // Quarterly: PCI Data Review (classification + masking coverage)
  "pci_data": `
    SELECT
      tc.TABLE_CATALOG AS DATABASE_NAME,
      tc.TABLE_SCHEMA AS SCHEMA_NAME,
      tc.TABLE_NAME,
      tc.COLUMN_NAME,
      tc.DATA_TYPE,
      ct.TAG_NAME AS CLASSIFICATION_TAG,
      ct.TAG_VALUE AS CLASSIFICATION_VALUE,
      mp.POLICY_NAME AS MASKING_POLICY,
      CASE WHEN mp.POLICY_NAME IS NOT NULL THEN 'MASKED' ELSE 'NOT MASKED' END AS MASKING_STATUS
    FROM SNOWFLAKE.ACCOUNT_USAGE.COLUMNS tc
    LEFT JOIN SNOWFLAKE.ACCOUNT_USAGE.TAG_REFERENCES ct
      ON ct.OBJECT_DATABASE = tc.TABLE_CATALOG
      AND ct.OBJECT_SCHEMA = tc.TABLE_SCHEMA
      AND ct.OBJECT_NAME = tc.TABLE_NAME
      AND ct.COLUMN_NAME = tc.COLUMN_NAME
      AND ct.TAG_SCHEMA = 'CORE'
      AND ct.TAG_DATABASE = 'SNOWFLAKE'
      AND ct.DOMAIN = 'COLUMN'
    LEFT JOIN SNOWFLAKE.ACCOUNT_USAGE.POLICY_REFERENCES mp
      ON mp.REF_DATABASE_NAME = tc.TABLE_CATALOG
      AND mp.REF_SCHEMA_NAME = tc.TABLE_SCHEMA
      AND mp.REF_ENTITY_NAME = tc.TABLE_NAME
      AND mp.REF_COLUMN_NAME = tc.COLUMN_NAME
      AND mp.POLICY_KIND = 'MASKING_POLICY'
    WHERE tc.DELETED IS NULL
      AND ct.TAG_VALUE IS NOT NULL
    ORDER BY tc.TABLE_CATALOG, tc.TABLE_SCHEMA, tc.TABLE_NAME, tc.COLUMN_NAME
  `,

  // Semi-Annual: User Access Review (with 90-day inactive flag)
  "user_access": `
    SELECT
      u.NAME AS USER_NAME,
      u.LOGIN_NAME,
      u.EMAIL,
      u.TYPE AS USER_TYPE,
      u.DEFAULT_ROLE,
      u.OWNER AS USER_OWNER,
      u.CREATED_ON,
      u.LAST_SUCCESS_LOGIN,
      u.DISABLED,
      u.HAS_MFA,
      u.HAS_RSA_PUBLIC_KEY,
      u.COMMENT,
      CASE
        WHEN u.LAST_SUCCESS_LOGIN IS NULL THEN 'NEVER LOGGED IN'
        WHEN DATEDIFF('day', u.LAST_SUCCESS_LOGIN, CURRENT_TIMESTAMP()) > 90 THEN 'INACTIVE >90 DAYS'
        ELSE 'ACTIVE'
      END AS ACTIVITY_STATUS,
      DATEDIFF('day', u.LAST_SUCCESS_LOGIN, CURRENT_TIMESTAMP()) AS DAYS_SINCE_LAST_LOGIN
    FROM SNOWFLAKE.ACCOUNT_USAGE.USERS u
    WHERE u.DELETED_ON IS NULL
    ORDER BY
      CASE
        WHEN u.LAST_SUCCESS_LOGIN IS NULL THEN 0
        ELSE DATEDIFF('day', u.LAST_SUCCESS_LOGIN, CURRENT_TIMESTAMP())
      END DESC
  `,

  // Annual: Role Access Review
  "role_access": `
    SELECT
      r.NAME AS ROLE_NAME,
      r.OWNER AS ROLE_OWNER,
      r.CREATED_ON,
      r.COMMENT,
      g.PRIVILEGE,
      g.GRANTED_ON AS OBJECT_TYPE,
      g.NAME AS OBJECT_NAME,
      g.TABLE_CATALOG AS OBJECT_DATABASE,
      g.TABLE_SCHEMA AS OBJECT_SCHEMA,
      g.GRANTED_BY,
      g.GRANT_OPTION
    FROM SNOWFLAKE.ACCOUNT_USAGE.ROLES r
    LEFT JOIN SNOWFLAKE.ACCOUNT_USAGE.GRANTS_TO_ROLES g
      ON g.GRANTEE_NAME = r.NAME
      AND g.DELETED_ON IS NULL
    WHERE r.DELETED_ON IS NULL
    ORDER BY r.NAME, g.PRIVILEGE
  `,

  // Annual: Audit Confirmation (pulls from review log)
  "audit_confirm": `
    SELECT
      REVIEW_TYPE,
      REVIEW_PERIOD,
      STATUS,
      REVIEWER,
      REVIEWED_AT,
      APPROVER,
      APPROVED_AT,
      ROW_COUNT
    FROM AUDIT_APP_DB.APP_SCHEMA.REVIEW_LOG
    ORDER BY REVIEWED_AT DESC
  `,
} as const

// Metadata for each control / review
export const AUDIT_CONTROLS = [
  { id: "as1", label: "AS.1", title: "Password Policy", description: "Password policy configuration and complexity requirements" },
  { id: "as2", label: "AS.2", title: "Access Lists", description: "Application role inventory and privilege assignments" },
  { id: "as4", label: "AS.4", title: "User Access Review", description: "Complete user access listing with roles and login activity" },
  { id: "as5", label: "AS.5", title: "Admin Access", description: "Users with elevated administrative roles" },
  { id: "as6", label: "AS.6", title: "SOD Matrix", description: "Segregation of duties -- users holding multiple elevated roles" },
  { id: "as7", label: "AS.7", title: "Job Scheduling", description: "Snowflake task execution history (last 30 days)" },
] as const

export const REVIEW_TYPES = [
  { id: "failed_login", label: "Failed Logins", cadence: "Monthly", owner: "Product Admin(s)", description: "Review failed login attempts for suspicious activity" },
  { id: "change_log", label: "Change Log", cadence: "Monthly", owner: "Product Admin(s)", description: "Review DDL/security changes -- medium and high severity items" },
  { id: "pci_data", label: "PCI Data", cadence: "Quarterly", owner: "Info Sec", description: "Verify PCI data has proper classification and masking" },
  { id: "user_access", label: "User Access", cadence: "Semi-Annual", owner: "Product Admin(s)", description: "Review users, disable 90-day inactive, compare to HR" },
  { id: "role_access", label: "Role Access", cadence: "Annual", owner: "Product Admin(s)", description: "Review roles and assigned privileges" },
  { id: "audit_confirm", label: "Audit Confirm", cadence: "Annual", owner: "Info Sec", description: "Confirm all scheduled reviews were completed" },
] as const

// CSV export file names matching RSM folder structure
export const EXPORT_FILE_NAMES: Record<string, { folder: string; filename: string }> = {
  as1: { folder: "AS.1", filename: "AS.1.1 - Password Policy - Snowflake.csv" },
  as2: { folder: "AS.2", filename: "AS.2.3 - Application Access Lists - Snowflake.csv" },
  as4: { folder: "AS.4", filename: "AS.4.2 - Application User Access Review - Snowflake.csv" },
  as5: { folder: "AS.5", filename: "AS.5.1 - Administrative Access Rights - Snowflake.csv" },
  as6: { folder: "AS.6", filename: "AS.6 - SOD Matrix - Snowflake.csv" },
  as7: { folder: "AS.7", filename: "AS.7.3 - Job Scheduling Tools - Snowflake.csv" },
}
