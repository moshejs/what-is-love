/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static: deployed to GitHub Pages under /<repo>, set by CI.
  output: 'export',
  basePath: process.env.PAGES_BASE_PATH || '',
}

export default nextConfig
