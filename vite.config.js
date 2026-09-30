import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Ýerli dev: /api/* soraglaryny Vercel funksiýalary ýaly işledýär (api/ai.js, api/admin.js).
// Açarlar .env-den okalýar (SERVICE_ROLE / GROQ_KEY — VITE_ prefiksi ÝOK → brauzere gitmeýär).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      {
        name: 'local-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const m = req.url && req.url.match(/^\/api\/([a-z-]+)(\?.*)?$/)
            if (!m || m[1].startsWith('_')) return next()
            let raw = ''
            req.on('data', (c) => (raw += c))
            req.on('end', async () => {
              try {
                req.body = raw ? JSON.parse(raw) : {}
                const shim = {
                  status(c) { res.statusCode = c; return shim },
                  json(o) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)) },
                }
                const mod = await server.ssrLoadModule(`/api/${m[1]}.js`)
                await mod.default(req, shim)
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: e.message }))
              }
            })
          })
        },
      },
    ],
    server: { host: true, port: 5173 },
  }
})
