"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")
    const res = await signIn("credentials", {
      redirect: false,
      code,
      pin,
    })
    setLoading(false)
    if (res?.ok) {
      router.push("/projects") // redirecione para onde quiser
    } else {
      setErrorMsg("Código ou PIN inválidos.")
    }
  }

  return (
    <div className="min-h-[70vh] container mx-auto flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold mb-4 text-center">Entrar</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Código (Timesheet)</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0001"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">PIN</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              type="password"
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••"
            />
          </div>
          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
