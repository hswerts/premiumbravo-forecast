// next.config.ts
const isProd = process.env.NODE_ENV === 'production'
const repo = 'premiumbravo-forecast'


const nextConfig = {
output: 'export', // gera site estático em /out
basePath: isProd ? `/${repo}` : '',
assetPrefix: isProd ? `/${repo}/` : '',
images: { unoptimized: true }, // GitHub Pages não lida com Image Optimization
trailingSlash: true, // ajuda no Pages (URLs com /)
}
export default nextConfig
