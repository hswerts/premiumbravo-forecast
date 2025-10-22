// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth({
  // página de login customizada - mantém '/login' pois o grupo (auth) não afeta a URL
  pages: { signIn: '/login' },
  
  // regra de autorização: se tiver token (usuário logado), deixa passar
  callbacks: {
    authorized: ({ token }) => !!token, // CORREÇÃO: !!token em vez de lltoken
  },
})

// protege só as rotas privadas (adicione/remova conforme sua necessidade)
export const config = {
  matcher: [
    '/projects/:path*',
    '/people/:path*',
    '/reports/:path*',
    // '/timeline/:path*',  // se quiser proteger a timeline também, descomente
  ],
}