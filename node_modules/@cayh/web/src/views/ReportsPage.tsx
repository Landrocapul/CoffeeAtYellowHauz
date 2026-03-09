import React from 'react'

export function ReportsPage() {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h1 className="text-lg font-semibold">Reports</h1>
      <p className="mt-1 text-sm text-zinc-600">Temporal + FSN analytics will be implemented next.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">Peak Hours</div>
          <div className="mt-2 text-sm text-zinc-600">Placeholder chart</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">FSN Classification</div>
          <div className="mt-2 text-sm text-zinc-600">Placeholder table</div>
        </div>
      </div>
    </div>
  )
}
