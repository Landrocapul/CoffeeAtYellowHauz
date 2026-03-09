import React, { useState } from 'react'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-6">
      <h1 className="text-lg font-semibold">Login</h1>
      <p className="mt-1 text-sm text-zinc-600">Stub UI only. API/auth will be wired next.</p>

      <label className="mt-4 block text-sm font-medium">Username</label>
      <input
        className="mt-1 w-full rounded border px-3 py-2"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <label className="mt-4 block text-sm font-medium">Password</label>
      <input
        className="mt-1 w-full rounded border px-3 py-2"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="mt-5 w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
        type="button"
        onClick={() => alert(`Login not implemented yet. user=${username}`)}
      >
        Sign in
      </button>
    </div>
  )
}
