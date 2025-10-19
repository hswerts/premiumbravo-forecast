// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
  },
  images: {
    unoptimized: false, // Vercel suporta otimização de imagens
  },
  async redirects() {
    return [
      {
        source: "/",            // quando acessar a raiz
        destination: "/projects", // redireciona para a página de projetos
        permanent: false,        // 307 temporário
      },
    ]
  },
}

export default nextConfig