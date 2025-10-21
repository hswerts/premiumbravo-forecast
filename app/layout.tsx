// app/layout.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import './globals.css'

// ⬇️ ADICIONE: provider do NextAuth e o UserBadge
import { SessionProvider } from 'next-auth/react'
import { UserBadge } from './components/UserBadge'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  useEffect(() => {
    const cleanupBodyClasses = () => {
      if (typeof document !== 'undefined') {
        const body = document.body
        const classes = body.className.split(' ')
        const uniqueClasses = [...new Set(classes)]
        body.className = uniqueClasses.join(' ').trim()
      }
    }
    cleanupBodyClasses()
  }, [])

  return (
    <html lang="pt-BR">
      <head>
        <title>PB Forecast</title>
        <meta name="description" content="Sistema de gestão de alocação de equipes" />
      </head>
      <body className="antialiased">
        {/* ⬇️ ENVOLVE tudo com o SessionProvider */}
        <SessionProvider>
          <nav className="bg-premiumbravo text-white shadow-lg">
            <div className="container mx-auto px-6 py-3">
              <div className="flex justify-between items-center">
                {/* Lado esquerdo: logo + links */}
                <div className="flex items-center space-x-8">
                  <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
                    PB Forecast
                  </Link>
                  <div className="flex space-x-4">
                    <Link
                      href="/projects"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        pathname === '/projects' ? 'bg-premiumbravo-dark' : 'hover:opacity-80'
                      }`}
                    >
                      Projetos
                    </Link>
                    <Link
                      href="/people"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        pathname === '/people' ? 'bg-premiumbravo-dark' : 'hover:opacity-80'
                      }`}
                    >
                      Equipe
                    </Link>
                    <Link
                      href="/timeline"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        pathname === '/timeline' ? 'bg-premiumbravo-dark' : 'hover:opacity-80'
                      }`}
                    >
                      Timeline
                    </Link>
                    <Link
                      href="/timesheet"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        pathname === '/timesheet' ? 'bg-premiumbravo-dark' : 'hover:opacity-80'
                      }`}
                    >
                      Timesheet
                    </Link>
                    <Link
                      href="/reports"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        pathname === '/reports' ? 'bg-premiumbravo-dark' : 'hover:opacity-80'
                      }`}
                    >
                      Relatórios
                    </Link>
                  </div>
                </div>

                {/* Lado direito: usuário logado + sair (só aparece quando autenticado) */}
                <UserBadge />
              </div>
            </div>
          </nav>

          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  )
}