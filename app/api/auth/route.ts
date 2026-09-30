import { getAuthContext } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const auth = await getAuthContext()
    return Response.json(auth)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 500 })
  }
}
