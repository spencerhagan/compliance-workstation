"use client"

import { useState } from "react"

export function TimeButton() {
  const [time, setTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/time")
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setTime(data.time)
      }
    } catch {
      setError("Failed to fetch time")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading} className="btn">
        {loading ? "Loading..." : "What's the time?"}
      </button>

      {time && (
        <p className="result-text">
          Snowflake says: <strong>{time}</strong>
        </p>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
