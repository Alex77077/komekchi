# Komekchi — Gurnamak we Deploy Etmek

## AI (Groq) Nädip Işleýär?

API key **brauzerda görünmeýär** — diňe Vercel serwerinde saklanýar.
Frontend `/api/ai` endpoint-a ýüz tutýar, ol hem Groq-a proxy edýär.

---

## Ýerli Dev (npm run dev)

1. `.env` faýlyny açyň (`.gitignore`-da goralýar):
   ```
   GROQ_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
   ```
2. `npm install && npm run dev`

> Vite özi `/api/ai` sorагlaryny ele alyp Groq-a iberer.

---

## Vercel Deploy

1. GitHub-a push ediň (`.env` `.gitignore`-da — push edilmeýär)
2. Vercel-da: **Settings → Environment Variables** goşuň:
   ```
   Name:  GROQ_KEY
   Value: gsk_xxxxxxxxxxxxxxxxxxxxx
   ```
   ⚠️ `VITE_` prefiksi **bolmaly däl** — bolsa key brauzere gider!
3. Redeploy ediň

---

## Groq Key Nireden Almaly?

https://console.groq.com → API Keys → Create API Key
