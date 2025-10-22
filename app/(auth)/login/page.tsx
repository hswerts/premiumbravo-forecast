"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginPage() {
  const [code, setCode] = useState("")
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!code || !pin) {
      setErrorMsg("Por favor, preencha todos os campos.")
      return
    }

    setLoading(true)
    setErrorMsg("")
    
    try {
      const result = await signIn("credentials", {
        code: code.trim(),
        pin: pin.trim(),
        redirect: false,
      })

      if (result?.error) {
        setErrorMsg("Código ou PIN inválidos.")
      } else if (result?.ok) {
        // Força um refresh completo para atualizar a sessão
        window.location.href = "/projects"
      } else {
        setErrorMsg("Erro desconhecido ao fazer login.")
      }
    } catch (error) {
      console.error("Login error:", error)
      setErrorMsg("Erro ao conectar com o servidor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-premiumbravo-dark via-premiumbravo to-premiumbravo-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-premiumbravo to-premiumbravo-dark rounded-full flex items-center justify-center mx-auto mb-4">
              <svg 
                width="40" 
                height="40" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path 
                  d="M16 16C16 14.3431 17.3431 13 19 13C20.6569 13 22 14.3431 22 16C22 17.6569 20.6569 19 19 19H6C4.34315 19 3 17.6569 3 16C3 14.3431 4.34315 13 6 13C7.65685 13 9 14.3431 9 16" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
                <path 
                  d="M8 8C8 6.34315 9.34315 5 11 5C12.6569 5 14 6.34315 14 8C14 9.65685 12.6569 11 11 11H6C4.34315 11 3 9.65685 3 8C3 6.34315 4.34315 5 6 5C7.65685 5 9 6.34315 9 8" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-premiumbravo-dark mb-2">Forecast</h1>
            <p className="text-premiumbravo-light tracking-widest text-sm font-medium">premium bravo</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código (Timesheet)
              </label>
              <input
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setCode(value)
                  setErrorMsg("")
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-premiumbravo focus:border-premiumbravo transition-all duration-200"
                placeholder="0001"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN
              </label>
              <div className="relative">
                <input
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    setPin(value)
                    setErrorMsg("")
                  }}
                  type={showPassword ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-premiumbravo focus:border-premiumbravo transition-all duration-200 pr-12"
                  placeholder="••••••"
                  disabled={loading}
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-premiumbravo transition-colors duration-200 p-1"
                  disabled={loading}
                >
                  {showPassword ? "🔒" : "👁️"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-pulse">
                <p className="text-red-700 text-sm text-center font-medium">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-premiumbravo to-premiumbravo-dark text-white py-3 px-4 rounded-lg font-semibold hover:from-premiumbravo-dark hover:to-premiumbravo-dark transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Entrando...
                </div>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Link para recuperação de senha */}
          <div className="text-center mt-6">
            <a 
              href="#" 
              className="text-premiumbravo-light hover:text-premiumbravo-dark text-sm font-medium transition-colors duration-200"
            >
              Esqueceu seu código ou PIN?
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white text-opacity-80 text-sm">
            Sistema Premium Bravo Forecast
          </p>
        </div>
      </div>
    </div>
  )
}