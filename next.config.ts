// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Vercel já otimiza imagens; pode deixar "false" para usar <Image> normalmente
    unoptimized: false,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/projects",
        permanent: false, // redireciona a home para /projects
      },
    ]
  },
}

export default nextConfig
