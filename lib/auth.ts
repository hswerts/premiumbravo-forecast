// lib/auth.ts
import type { NextAuthOptions, User, Session } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { JWT } from 'next-auth/jwt'
import { compare } from 'bcryptjs'
import { supabase } from '@/lib/supabase'

// --------- Tipos auxiliares (sem usar `any`) ----------
interface DbPerson {
  id: string
  timesheet_code: string
  full_name: string
  pin_hash: string | null
  is_admin: boolean
}

type AuthorizedUser = User & {
  code: string
  is_admin: boolean
}

// Token JWT com nossos campos extras
type AppToken = JWT & {
  code?: string
  is_admin?: boolean
}

// Session.user com nossos campos extras
type AppSessionUser = {
  name?: string | null
  code?: string
  is_admin?: boolean
}

// ------------------------------------------------------

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: 'Timesheet',
      credentials: {
        code: { label: 'Código', type: 'text' },
        pin: { label: 'PIN', type: 'password' }
      },
      async authorize(credentials): Promise<User | null> {
        const code = credentials?.code?.trim()
        const pin = credentials?.pin ?? ''

        if (!code || !pin) return null

        const { data, error } = await supabase
          .from('people')
          .select('id, timesheet_code, full_name, pin_hash, is_admin')
          .eq('timesheet_code', code)
          .single<DbPerson>()

        if (error || !data || !data.pin_hash) return null

        const ok = await compare(pin, data.pin_hash)
        if (!ok) return null

        const user: AuthorizedUser = {
          id: data.id,
          name: data.full_name,
          code: data.timesheet_code,
          is_admin: data.is_admin
        }

        return user
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }): Promise<AppToken> {
      const t = token as AppToken
      if (user) {
        const u = user as AuthorizedUser
        t.code = u.code
        t.is_admin = u.is_admin
        t.name = u.name ?? null
      }
      return t
    },
    async session({ session, token }): Promise<Session> {
      const t = token as AppToken
      const s = session as Session & { user: AppSessionUser }

      s.user = {
        ...(session.user ?? {}),
        name: typeof t.name === 'string' ? t.name : null,
        code: t.code,
        is_admin: t.is_admin
      }

      return s
    }
  },
  pages: {
    signIn: '/login'
  }
}
