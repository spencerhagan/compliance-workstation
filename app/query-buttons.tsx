"use client"

import { useState } from "react"

type SingleResult = {
  mode: string
  result: { USER: string; ROLE: string } | null
  error?: string
}

type QueryResponse = {
  service: SingleResult
  caller: SingleResult
  error?: string
}

export function QueryButtons() {
  const [data, setData] = useState<QueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runBoth() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/query")
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setData(json)
      }
    } catch {
      setError("Request failed")
    } finally {
      setLoading(false)
    }
  }

  const svc = data?.service
  const cal = data?.caller

  return (
    <section>
      <button onClick={runBoth} disabled={loading} className="btn">
        {loading ? "Running..." : "Compare Service vs Caller Context"}
      </button>

      {error && <p className="error-text">{error}</p>}

      {data && (
        <table className="result-table">
          <thead>
            <tr>
              <th />
              <th>Service</th>
              <th>Caller</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>USER</th>
              <td>{svc?.error ? <span className="error-text">{svc.error}</span> : (svc?.result?.USER ?? "—")}</td>
              <td>{cal?.error ? <span className="error-text">{cal.error}</span> : (cal?.result?.USER ?? "—")}</td>
            </tr>
            <tr>
              <th>ROLE</th>
              <td>{svc?.error ? <span className="error-text">{svc.error}</span> : (svc?.result?.ROLE ?? "—")}</td>
              <td>{cal?.error ? <span className="error-text">{cal.error}</span> : (cal?.result?.ROLE ?? "—")}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  )
}
