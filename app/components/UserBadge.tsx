'use client'
import { useSession, signOut } from 'next-auth/react'

export function UserBadge() {
  const { data } = useSession()
  const user = data?.user as { code?: string; name?: string; is_admin?: boolean } | undefined
  if (!user) return null

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/90">
        {user.name ? `${user.name} ` : ''}({user.code})
        {user.is_admin ? ' • admin' : ''}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-md"
      >
        Sair
      </button>
    </div>
  )
}
