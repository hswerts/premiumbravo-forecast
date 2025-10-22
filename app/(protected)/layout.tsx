export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
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
              <a href="/relations" className="hover:text-premiumbravo-light transition-colors font-medium">
                Relations
              </a>
            </div>

            {/* User Menu (opcional) */}
            <div className="flex items-center space-x-4">
              <button className="text-sm hover:text-premiumbravo-light transition-colors">
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo das páginas */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}