// middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  // página de login customizada
  pages: { signIn: '/login' },

  // regra de autorização: se tiver token (usuário logado), deixa passar
  callbacks: {
    authorized: ({ token }) => !!token,
  },
})

// proteja só as rotas privadas (adicione/remova conforme sua necessidade)
export const config = {
  matcher: [
    '/projects/:path*',
    '/people/:path*',
    '/reports/:path*',
    // '/timeline/:path*',  // se quiser proteger a timeline também, descomente
  ],
}
