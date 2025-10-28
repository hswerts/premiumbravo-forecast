'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link' // ✅ ADICIONADO: Import do Link

// Componente da Navbar separado para usar hooks
function Navbar() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login') // Redireciona para a tela de login
  }

  return (
    <nav className="bg-premiumbravo text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo e Título */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded flex items-center justify-center">
              <span className="font-bold text-sm">PB</span>
            </div>
            <span className="font-bold text-lg">Forecast</span>
          </div>

          {/* Menu de Navegação */}
          <div className="flex space-x-6">
            <Link href="/projects" className="hover:text-premiumbravo-light transition-colors font-medium">
              Projects
            </Link>
            <Link href="/people" className="hover:text-premiumbravo-light transition-colors font-medium">
              Equipe
            </Link>
            <Link href="/timeline" className="hover:text-premiumbravo-light transition-colors font-medium">
              Timeline
            </Link>
            <Link href="/timesheet" className="hover:text-premiumbravo-light transition-colors font-medium">
              Timesheet
            </Link>
            <Link href="/reports" className="hover:text-premiumbravo-light transition-colors font-medium">
              Relations
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <span className="text-sm">Carregando...</span>
            ) : session?.user ? (
              <>
                <span className="text-sm">
                  Olá, {session.user.name || session.user.email}
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-sm hover:text-premiumbravo-light transition-colors"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link href="/login" className="text-sm hover:text-premiumbravo-light transition-colors">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

// Layout principal (server component)
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}