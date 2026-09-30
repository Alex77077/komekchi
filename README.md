# Kömekçi v2 — gurnamak (Supabase Auth + rol esasly RLS)

## Näme üýtgedi?
- **Giriş**: Supabase Auth (parol Auth-da, bcrypt). Sahypa täzelenende çykyp gitmeýär (sessiýa saklanýar).
- **3 rol serwerde goralýar (RLS)** — diňe interfeýsde gizlenmeýär:
  - `admin` — hemme zat; ulanyjy/işgär/bölüm/sazlama dolandyrýar.
  - `bashlik` — diňe **öz bölüminiň** işgärlerini, tabşyryklaryny, dowamatyny görýär/üýtgedýär (başlyk işgäre baglanyp, işgär bölümde bolmaly).
  - `ishgar` — diňe öz tabşyryklary we öz dowamaty; tabşyryk poz(y)p bilmeýär.
- Ulanyjy döretmek/üýtgetmek/pozmak → `api/admin.js` (service_role açary diňe serwerde).
- `/api/ai` indi diňe giren ulanyjylar üçin.
- Düzedilen säwlikler: möhlet (overdue) hasaplamasy işlemeýärdi (sene formaty); dowamat ýazgysy pozulanda bazada galýardy; 1000 setirden köp maglumat kesilýärdi; realtime token-siz işlemeýärdi; `users` kanalynda parol hash-i sirkulýasiýa gidýärdi; faýllar hemmä açykdy (indi ýapyk bucket + wagtlaýyn link); wagt guşagy bir bolmaly (Asia/Ashgabat).
- Dil (TK/RU/EN): galan gataň tekstler, aý atlary, sütün atlary sözlüge geçirildi.
- Ekran: telefon (1 sütün + aşaky nawigasiýa), planşet (nawigasiýa nyşanlar), kompýuter, uly monitor/smart board (≥1800px awtomatik ulalýar, barmak üçin uly düwmeler).

## Gurnamak (tertip bilen)
1. **Supabase → SQL Editor**: `supabase/01_schema_and_security.sql` faýlyny doly işlediň.
   Köne `users` tablisasyndaky ulanyjylar (parollary bilen) awtomatik Auth-a göçürilýär; olar ozalky login/parol bilen girýär.
2. **Supabase → Project Settings → API**: `URL`, `anon` we `service_role` açarlaryny alyň.
3. **Vercel → Settings → Environment Variables** (ýa-da ýerli `.env`, nusga: `.env.example`):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_KEY`
   ⚠️ `SUPABASE_SERVICE_ROLE_KEY` we `GROQ_KEY` üçin **VITE_ prefiksi bolmaly däl**.
4. `npm install && npm run dev` (ýa-da Vercel-e push → Redeploy).
5. Ýaňy admin bilen giriň → **Admin → Ulanyjylar**: her başlyga/işgäre işgär baglaň (`wid`), başlyga bölümli işgär baglaň.

## Howpsuzlyk — siz etmeli zat
- Öňki zip-däki **Groq açary açyk boldy** → console.groq.com-da köne açary poz, täze dörediň.
- Supabase-däki köne "anon full access" policy-ler SQL bilen aýryldy; `users` tablisasyna hiç kim girip bilmeýär.
  Göçürme dogry geçenini barlansoň `drop table public.users;` edip bilersiňiz.
- Login adynda a-z, 0-9, `.`, `_`, `-` ulanmak maslahat (beýleki harplar hem işleýär).
