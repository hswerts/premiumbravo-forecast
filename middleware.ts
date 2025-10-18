// middleware.ts
import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: { signIn: "/login" },
})

export const config = {
  matcher: [
    // proteja tudo que NÃO seja public
    // ajuste a lista conforme suas rotas públicas
    "/((?!login|api/auth|timeline|_next|favicon.ico|assets|public).*)",
  ],
}
