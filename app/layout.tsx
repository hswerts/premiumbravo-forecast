// app/layout.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link' // ← ESTA LINHA ESTAVA FALTANDO!
import { usePathname } from 'next/navigation'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  useEffect(() => {
    const cleanupBodyClasses = () => {
      if (typeof document !== 'undefined') {
        const body = document.body;
        const classes = body.className.split(' ');
        const uniqueClasses = [...new Set(classes)];
        body.className = uniqueClasses.join(' ').trim();
      }
    };
    cleanupBodyClasses();
  }, []);

  return (
    <html lang="pt-BR">
      <head>
        <title>PB Forecast</title>
        <meta name="description" content="Sistema de gestão de alocação de equipes" />
      </head>
      <body className="antialiased">
        <nav className="bg-premiumbravo text-white shadow-lg">
          <div className="container mx-auto px-6 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-bold">PremiumBravo Forecast</h1>
                <div className="flex space-x-4">
                  <Link 
                    href="/projects" 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === '/projects' ? 'bg-blue-700' : 'hover:bg-blue-500'
                    }`}
                  >
                    Projetos
                  </Link>
                  <Link 
                    href="/people" 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === '/people' ? 'bg-blue-700' : 'hover:bg-blue-500'
                    }`}
                  >
                    Equipe
                  </Link>
                  <Link 
                    href="/timeline" 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === '/timeline' ? 'bg-blue-700' : 'hover:bg-blue-500'
                    }`}
                  >
                    Timeline
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
}
