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
  // Bundle the Armenian font files into the IG-cron serverless function.
  // Next.js's static analyser doesn't trace process.cwd()-rooted reads,
  // so without this the readFileSync('./fonts/*.ttf') in the route lands
  // on a missing file at runtime — Armenian glyphs then fall back to
  // tofu boxes. Including the dir explicitly is the documented fix.
  outputFileTracingIncludes: {
    '/api/cron/instagram-daily': ['./fonts/**/*'],
  },
}

export default nextConfig
