'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import link from 'next/link'

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
          {/* Logo da Premium Bravo */}
          <div className="flex items-center space-x-3">
            <link href="/" className="flex items-center">
              <img
                src="/logo.png"
                alt="Premium Bravo"
                className="h-8 w-auto"
              />
            </link>
          </div>

          {/* Menu de Navegação */}
          <div className="flex space-x-6">
            <a href="/projects" className="hover:text-premiumbravo-light transition-colors font-medium">
              Projects
            </a>
            <a href="/people" className="hover:text-premiumbravo-light transition-colors font-medium">
              Equipe
            </a>
            <a href="/timeline" className="hover:text-premiumbravo-light transition-colors font-medium">
              Timeline
            </a>
            <a href="/timesheet" className="hover:text-premiumbravo-light transition-colors font-medium">
              Timesheet
            </a>
            <a href="/reports" className="hover:text-premiumbravo-light transition-colors font-medium">
              Relations
            </a>
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
              <a href="/login" className="text-sm hover:text-premiumbravo-light transition-colors">
                Entrar
              </a>
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
