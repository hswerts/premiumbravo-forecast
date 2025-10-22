import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Premium Bravo Forecast',
  description: 'Sistema de gestão de projetos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {/* Layout raiz limpo - sem navbar */}
        {children}
      </body>
    </html>
  )
}