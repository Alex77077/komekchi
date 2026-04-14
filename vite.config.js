import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Yerli dev: GROQ_KEY .env-den okalýar (VITE_ yok → brauzera gideñok)
// Vercel: Settings → Environment Variables → GROQ_KEY

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // ahli env (VITE_-siz hem)

  return {
    plugins: [
      react(),
      {
        name: 'local-groq-proxy',
        configureServer(server) {
          server.middlewares.use('/api/ai', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              return res.end(JSON.stringify({ error: 'Dine POST' }))
            }
            let body = ''
            req.on('data', c => (body += c))
            req.on('end', async () => {
              try {
                const { system, messages } = JSON.parse(body)
                const GROQ_KEY = env.GROQ_KEY
                if (!GROQ_KEY) throw new Error('.env-de GROQ_KEY yok!')

                const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + GROQ_KEY,
                  },
                  body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    max_tokens: 600,
                    temperature: 0.7,
                    messages: [
                      { role: 'system', content: system || 'Sen peydaly AI komekci.' },
                      ...messages,
                    ],
                  }),
                })

                const data = await r.json()
                if (!r.ok) throw new Error(data?.error?.message || 'HTTP ' + r.status)

                const text = data?.choices?.[0]?.message?.content
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ text }))
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
    server: {
      host: true,
      port: 5173,
    },
  }
})
