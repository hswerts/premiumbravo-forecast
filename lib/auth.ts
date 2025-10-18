// lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { supabase } from "@/lib/supabase" // seu client já existente

export const authOptions = {
  providers: [
    Credentials({
      name: "Timesheet",
      credentials: {
        code: { label: "Código", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        const code = credentials?.code?.trim()
        const pin = credentials?.pin ?? ""

        if (!code || !pin) return null

        // Busca no Supabase
        const { data, error } = await supabase
          .from("people")
          .select("id, timesheet_code, full_name, pin_hash, is_admin")
          .eq("timesheet_code", code)
          .single()

        if (error || !data || !data.pin_hash) return null

        const ok = await compare(pin, data.pin_hash)
        if (!ok) return null

        // Retorna o usuário para a sessão
        return {
          id: data.id,
          code: data.timesheet_code,
          name: data.full_name,
          is_admin: data.is_admin,
        } as any
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.code = (user as any).code
        token.is_admin = (user as any).is_admin
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        name: token.name as string,
        code: token.code as string,
        is_admin: !!token.is_admin,
      } as any
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies Parameters<typeof NextAuth>[0]
