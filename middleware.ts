import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { 
    signIn: '/login'  // Mantém '/login' - o grupo (auth) não afeta a URL
  },
  callbacks: {
    authorized: ({ token }) => !!token, // Corrigido: !!token
  },
})

export const config = {
  matcher: [
    '/projects/:path*',
    '/people/:path*',
    '/reports/:path*',
    '/timeline/:path*',
    '/timesheet/:path*' 
  ],
}