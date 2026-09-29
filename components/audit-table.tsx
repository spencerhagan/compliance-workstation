"use client"

import * as React from "react"
import { useState, useMemo, useCallback, useImperativeHandle, forwardRef } from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Trash2,
  Bookmark,
  Search,
} from "lucide-react"

export interface AuditTableProps {
  data: Record<string, any>[]
  columns: string[]
}

export interface AuditTableHandle {
  getReviewedData: () => Record<string, any>[]
}

const AuditTable = forwardRef<AuditTableHandle, AuditTableProps>(
  ({ data, columns }, ref) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set())
    const [notes, setNotes] = useState<Map<number, string>>(new Map())
    const [flagged, setFlagged] = useState<Set<number>>(new Set())
    const [sortCol, setSortCol] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
    const [filterText, setFilterText] = useState("")

    const toggleSort = useCallback(
      (col: string) => {
        if (sortCol === col) {
          setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        } else {
          setSortCol(col)
          setSortDir("asc")
        }
      },
      [sortCol]
    )

    const toggleSelect = useCallback((idx: number) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(idx)) next.delete(idx)
        else next.add(idx)
        return next
      })
    }, [])

    const toggleFlag = useCallback((idx: number) => {
      setFlagged((prev) => {
        const next = new Set(prev)
        if (next.has(idx)) next.delete(idx)
        else next.add(idx)
        return next
      })
    }, [])

    const deleteRow = useCallback((idx: number) => {
      setDeletedIds((prev) => new Set(prev).add(idx))
    }, [])

    const setNote = useCallback((idx: number, value: string) => {
      setNotes((prev) => {
        const next = new Map(prev)
        next.set(idx, value)
        return next
      })
    }, [])

    const filteredAndSorted = useMemo(() => {
      const lowerFilter = filterText.toLowerCase()
      let rows = data
        .map((row, originalIndex) => ({ row, originalIndex }))
        .filter(({ originalIndex }) => !deletedIds.has(originalIndex))

      if (lowerFilter) {
        rows = rows.filter(({ row }) =>
          columns.some((col) =>
            String(row[col] ?? "")
              .toLowerCase()
              .includes(lowerFilter)
          )
        )
      }

      if (sortCol) {
        rows.sort((a, b) => {
          const aVal = a.row[sortCol] ?? ""
          const bVal = b.row[sortCol] ?? ""
          const aStr = String(aVal)
          const bStr = String(bVal)
          const aNum = Number(aVal)
          const bNum = Number(bVal)
          let cmp: number
          if (!isNaN(aNum) && !isNaN(bNum) && aStr !== "" && bStr !== "") {
            cmp = aNum - bNum
          } else {
            cmp = aStr.localeCompare(bStr, undefined, { sensitivity: "base" })
          }
          return sortDir === "asc" ? cmp : -cmp
        })
      }

      return rows
    }, [data, columns, deletedIds, filterText, sortCol, sortDir])

    const getReviewedData = useCallback((): Record<string, any>[] => {
      return data
        .map((row, idx) => {
          if (deletedIds.has(idx)) return null
          return {
            ...row,
            REVIEWER_NOTES: notes.get(idx) || "",
            FLAGGED: flagged.has(idx) ? "YES" : "NO",
          }
        })
        .filter(Boolean) as Record<string, any>[]
    }, [data, deletedIds, notes, flagged])

    useImperativeHandle(ref, () => ({ getReviewedData }), [getReviewedData])

    const visibleCount = filteredAndSorted.length
    const totalCount = data.length
    const deletedCount = deletedIds.size

    return (
      <div className="flex flex-col gap-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter rows..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#016268]"
            />
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {visibleCount} of {totalCount} rows
            {deletedCount > 0 && (
              <span className="text-red-500 ml-1">
                ({deletedCount} removed)
              </span>
            )}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-auto max-h-[70vh]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[#0F2D4E]">
              <TableRow className="border-b-0 hover:bg-[#0F2D4E]">
                <TableHead className="w-10 text-white">
                  <input
                    type="checkbox"
                    className="rounded border-white/50"
                    checked={
                      filteredAndSorted.length > 0 &&
                      filteredAndSorted.every(({ originalIndex }) =>
                        selectedIds.has(originalIndex)
                      )
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(
                          new Set(
                            filteredAndSorted.map(({ originalIndex }) => originalIndex)
                          )
                        )
                      } else {
                        setSelectedIds(new Set())
                      }
                    }}
                  />
                </TableHead>
                {columns.map((col) => (
                  <TableHead
                    key={col}
                    className="text-white cursor-pointer select-none whitespace-nowrap hover:bg-white/10"
                    onClick={() => toggleSort(col)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col}
                      {sortCol === col ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="w-24 text-white text-center">
                  Notes
                </TableHead>
                <TableHead className="w-10 text-white text-center">
                  Flag
                </TableHead>
                <TableHead className="w-10 text-white" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No rows to display.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map(({ row, originalIndex }) => (
                  <TableRow
                    key={originalIndex}
                    data-state={
                      selectedIds.has(originalIndex) ? "selected" : undefined
                    }
                    className={
                      flagged.has(originalIndex)
                        ? "bg-[#FBBA16]/5 hover:bg-[#FBBA16]/10"
                        : ""
                    }
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(originalIndex)}
                        onChange={() => toggleSelect(originalIndex)}
                        className="rounded"
                      />
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell
                        key={col}
                        className="max-w-[300px] truncate"
                        title={String(row[col] ?? "")}
                      >
                        {String(row[col] ?? "")}
                      </TableCell>
                    ))}
                    <TableCell>
                      <input
                        type="text"
                        placeholder="Add note..."
                        value={notes.get(originalIndex) || ""}
                        onChange={(e) => setNote(originalIndex, e.target.value)}
                        className="w-full min-w-[120px] rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#016268]"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFlag(originalIndex)}
                        title={
                          flagged.has(originalIndex)
                            ? "Remove flag"
                            : "Flag for review"
                        }
                      >
                        <Bookmark
                          className={`h-4 w-4 ${
                            flagged.has(originalIndex)
                              ? "fill-[#FBBA16] text-[#FBBA16]"
                              : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(originalIndex)}
                        title="Remove row"
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }
)

AuditTable.displayName = "AuditTable"

export { AuditTable }
