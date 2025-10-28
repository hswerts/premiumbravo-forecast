// app/(protected)/layout.tsx
'use client'

import Link from 'next/link' // ✅ IMPORTANTE: Importar Link do Next.js
import { usePathname } from 'next/navigation'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* LOGO - CORRETO: Usar <Link> do Next.js */}
            <Link href="/" className="flex items-center">
              <img 
                src="/logo-premiumbravo.png" 
                alt="Premium Bravo" 
                className="h-10"
              />
            </Link>

            {/* MENU DE NAVEGAÇÃO */}
            <div className="flex gap-6">
              <Link
                href="/projects"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/projects')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Projetos
              </Link>

              <Link
                href="/people"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/people')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Equipe
              </Link>

              <Link
                href="/timeline"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/timeline')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Timeline
              </Link>

              <Link
                href="/timesheet"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/timesheet')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Timesheet
              </Link>

              <Link
                href="/reports"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/reports')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Relatórios
              </Link>
            </div>

            {/* BOTÃO DE LOGOUT */}
            <Link
              href="/api/auth/signout"
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium"
            >
              Sair
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto">
        {children}
      </main>
    </div>
  )
}