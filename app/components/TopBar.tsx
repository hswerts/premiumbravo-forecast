'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserBadge } from './UserBadge'
import Image from 'next/image'

export default function TopBar() {
  const pathname = usePathname()
  const linkCls = (href: string) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      pathname?.startsWith(href)
        ? 'bg-white/10 text-white'
        : 'text-white/90 hover:bg-white/10 hover:text-white'
    }`

  return (
    <header className="bg-teal-900">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          {/* Logo da Premium Bravo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Premium Bravo"
              width={140}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </Link>
          
          <nav className="hidden sm:flex items-center gap-1">
            <Link href="/projects" className={linkCls('/projects')}>Projetos</Link>
            <Link href="/people"   className={linkCls('/people')}>Equipe</Link>
            <Link href="/timeline" className={linkCls('/timeline')}>Timeline</Link>
            <Link href="/timesheet" className={linkCls('/timesheet')}>Timesheet</Link>
            <Link href="/reports"  className={linkCls('/reports')}>Relatórios</Link>
          </nav>
        </div>
        <UserBadge />
      </div>
    </header>
  )
}
