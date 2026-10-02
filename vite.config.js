import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import bcrypt from 'bcryptjs'

// Yerli dev: GROQ_KEY, SUPABASE_SERVICE_KEY .env-den okalýar (VITE_ yok → brauzera gideñok)
// Vercel: Settings → Environment Variables → GROQ_KEY, SUPABASE_SERVICE_KEY

const SB_URL = 'https://gilwqcqzzlxvdpqokpyh.supabase.co'

// Klassyky service_role açary JWT ("eyJ..."): apikey + Bearer ikisi hem gerek.
// Täze "sb_secret_..." açary JWT däl: diňe apikey başlygy bilen iberilýär.
function sbHeaders(key) {
  const h = { apikey: key }
  if (key.startsWith('eyJ')) h.Authorization = 'Bearer ' + key
  return h
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', c => (body += c))
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // ahli env (VITE_-siz hem)

  return {
    plugins: [
      react(),
      {
        name: 'local-groq-proxy',
        configureServer(server) {
          server.middlewares.use('/api/ai', async (req, res) => {
            res.setHeader('Content-Type', 'application/json')
            if (req.method !== 'POST') {
              res.statusCode = 405
              return res.end(JSON.stringify({ error: 'Dine POST' }))
            }
            try {
              const { system, messages } = await readBody(req)
              const GROQ_KEY = env.GROQ_KEY
              if (!GROQ_KEY) throw new Error('.env-de GROQ_KEY yok!')
              if (!Array.isArray(messages)) throw new Error('messages array gerek')

              // api/ai.js bilen edil şol bir logika
              const msgs = messages
                .filter(m => m && (m.role === 'user' || m.role === 'assistant')
                  && typeof m.content === 'string' && m.content.trim()
                  && !m.content.startsWith('⚠️'))
                .slice(-16)
                .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }))
              if (!msgs.length) throw new Error('Boş habar')

              const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + GROQ_KEY,
                },
                body: JSON.stringify({
                  model: 'openai/gpt-oss-120b',
                  // gpt-oss "reasoning" model: pikir tokenleri hem şu çäge girýär.
                  // 600 az bolup jogap boş gelýärdi → 2048 + pikiri gysgaltmak.
                  max_completion_tokens: 2048,
                  reasoning_effort: 'low',
                  include_reasoning: false,
                  temperature: 0.7,
                  messages: [
                    { role: 'system', content: String(system || 'Sen peydaly AI komekci.').slice(0, 12000) },
                    ...msgs,
                  ],
                }),
              })

              const data = await r.json().catch(() => ({}))
              if (!r.ok) {
                res.statusCode = r.status
                let m = data?.error?.message || 'HTTP ' + r.status
                if (r.status === 429) m = 'Groq çäkleme (rate limit): birnäçe sekuntdan täzeden synanyşyň.'
                return res.end(JSON.stringify({ error: m }))
              }

              const choice = data?.choices?.[0]
              const text = (choice?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
              if (!text) {
                res.statusCode = 502
                return res.end(JSON.stringify({ error: choice?.finish_reason === 'length'
                  ? 'Jogap token çäginden geçdi. Soragy gysgaldyň.' : 'Boş jogap geldi' }))
              }
              res.end(JSON.stringify({ text }))
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: e.message }))
            }
          })

          // ── Ýerli dev: /api/verify-password ────────────────────
          // api/verify-password.js bilen edil şol bir logika (Vercel-de
          // şol faýl işleýär; bu diňe "npm run dev" wagtynda gerek).
          server.middlewares.use('/api/verify-password', async (req, res) => {
            res.setHeader('Content-Type', 'application/json')
            if (req.method !== 'POST') {
              res.statusCode = 405
              return res.end(JSON.stringify({ error: 'Diňe POST' }))
            }
            try {
              const SERVICE_KEY = env.SUPABASE_SERVICE_KEY
              if (!SERVICE_KEY) throw new Error('.env-de SUPABASE_SERVICE_KEY ýok!')

              const { username, userId, password } = await readBody(req)
              if (!password || (!username && !userId)) {
                res.statusCode = 400
                return res.end(JSON.stringify({ error: 'username ýa-da userId, we password gerek' }))
              }

              const filter = userId
                ? `id=eq.${encodeURIComponent(userId)}`
                : `username=eq.${encodeURIComponent(username.trim())}`

              const r = await fetch(`${SB_URL}/rest/v1/users?${filter}&select=*`, {
                headers: sbHeaders(SERVICE_KEY),
              })
              if (!r.ok) throw new Error(await r.text())
              const rows = await r.json()
              const found = Array.isArray(rows) ? rows[0] : null
              if (!found) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'notfound' })) }

              const stored = found.password || ''
              const looksHashed = /^\$2[aby]\$/.test(stored)
              let ok = false
              if (looksHashed) {
                ok = await bcrypt.compare(password, stored)
              } else {
                ok = stored === password
                if (ok) {
                  const newHash = bcrypt.hashSync(password, 10)
                  fetch(`${SB_URL}/rest/v1/users?id=eq.${found.id}`, {
                    method: 'PATCH',
                    headers: { ...sbHeaders(SERVICE_KEY), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: newHash }),
                  }).catch(() => {})
                }
              }
              if (!ok) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'wrong' })) }

              const { password: _pw, ...safe } = found
              res.end(JSON.stringify({ user: safe }))
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: e.message }))
            }
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
