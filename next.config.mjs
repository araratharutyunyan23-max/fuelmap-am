/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow accessing dev-mode HMR + RSC resources from public tunnels
  // (Cloudflare quick tunnels, ngrok) when testing on a real phone.
  allowedDevOrigins: ['*.trycloudflare.com', '*.ngrok-free.app', '*.ngrok.io'],
}

export default nextConfig
