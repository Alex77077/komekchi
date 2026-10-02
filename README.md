# Komekchi — Gurnamak we Deploy Etmek

## ✅ v14 — Näme düzedildi (AI, Supabase, ekran)

### 1) AI näme üçin "chat" etmeýärdi
`openai/gpt-oss-120b` "reasoning" (pikir ýöredýän) model. Ol jogap ýazmazdan öň
gizlin pikir tokenlerini sarp edýär. Kodda `max_tokens: 600` bardy — token çäk
diňe pikire ýetip, jogaba ýetmeýärdi → jogap boş gelýärdi → "Boş jogap geldi".
**Düzediş** (`api/ai.js` + `vite.config.js`): `max_completion_tokens: 2048`,
`reasoning_effort: "low"`, `include_reasoning: false`. Goşmaça: öňki
"⚠️ Ýalňyşlyk" habarlary AI-a gaýtadan ugradylmaýar; 401/429 ýalňyşlyklary
düşnükli görkezilýär; söhbetiň iň soňky 16 habary iberilýär.

### 2) Supabase düzedişleri
- **Ulanyjy goşmak / parol üýtgetmek işlemeýärdi.** `users` tablisasynda `password`
  sütüni anon-dan gizlenen, ýöne kod `Prefer: return=representation` ulanýardy
  (`RETURNING *` → "permission denied"). Indi `users` üçin `return=minimal`.
- **Realtime köne v1 formatda ýazylypdy** → täze Supabase serweri üýtgeşmeleri
  ibermeýärdi. Indi v2 (`postgres_changes`), bir WebSocket, awtomatik täzeden
  baglanma, we täzeden baglananda maglumat täzelenýär. Sahypa täzeden görünende
  we her 2 minutda fonda maglumat täzelenýär (smartboard üçin).
- **`users` Realtime-dan aýryldy:** ol bütin setiri (parol hash-i bilen) ähli
  brauzerlere iberýärdi. Ulanyjy sanawy indi diňe howpsuz sütünler bilen alynýar.
- **Login:** serwer ýalňyşlygy (mysal: `SUPABASE_SERVICE_KEY` ýok) öň "nädogry
  parol" diýip görkezilýärdi; indi hakyky sebäp görkezilýär.
- `sb_secret_...` (täze Supabase açary) goldawy: `Authorization` diňe JWT açarda.
- **`supabase_fix.sql`** — RLS, users GRANT, Realtime publication, Storage bucket
  rugsatlary we `settings` id=1 setiri (SQL Editor-de bir gezek işlediň).

### 3) Ekran (telefon / planşet / kompýuter / smartboard)
- Viewport `viewport-fit=cover` (iPhone çykyntylary), `100vh` → dinamik beýiklik
  (adres setiri / klawiatura bilen dogry).
- Planşetde header sygmaýardy → 1100px-den kiçi ekranda kompakt header.
- Kanban we karta gridleri ekrana görä sütün sanyny çalyşýar; modallardaky 2
  sütünli formalar kiçi telefonda ezilmeýär.
- iOS-da input basylanda sahypa ulalmaýar; hover diňe syçanly enjamda;
  barmak enjamlarynda min. 36px düwmeler.
- **Smartboard / uly ekran:** interfeýs awtomatik ulalýar (barmakly 1600px+ → 125%,
  2200px+ → 150%, 3000px+ (4K) → 200%). Header-däki 🖥 düwme bilen elde
  Auto / 100% / 125% / 150% / 200% saýlap bolýar.

### ⚠️ SIZ ETMELI 3 ÄDIM
1. **Groq:** console.groq.com → API Keys → köne açary poz ediň, TÄZE açar dörediň
   (öňki zip-de açyk ýazylypdy). Vercel → Settings → Environment Variables →
   `GROQ_KEY` = täze açar.
2. **Vercel-de `SUPABASE_SERVICE_KEY`** goşuň (Supabase → Settings → API →
   `service_role`). Bu ýok bolsa giriş işlemez. Soň **Redeploy**.
3. **Supabase → SQL Editor** → `supabase_fix.sql`-i işlediň.

---

## 🚨 GIRIŞ WE AI IŞLEMEDIK BOLSA — MUNY EDIŇ (ZERUR)

Iki sany täze säwlik tapyldy we kod tarapy düzedildi, ýöne **biri üçin
size 1 sany täze açar goşmak gerek** — ýogsam giriş entek işlemez.

### 1) AI işlänok ("model tapylmady" ýalňyşlygy)

**Sebäbi:** Groq `llama-3.3-70b-versatile` modelini 16-njy awgustda
ýapdy. **Kod tarapyndan düzedildi** (`openai/gpt-oss-120b`-e geçirildi)
— siz hiç zat etmeli däl, diňe täze zip-i deploy ediň.

### 2) Hiç kim girip bilenok ("nädogry ulanyjy/parol")

**Sebäbi:** Öňki gezek berlen Supabase SQL "parol sütünini anon
okap bilmesin" diýip berkitdi — ýöne Login şol sütüni okamaly eken.
Ikisi biri-birine garşy geldi, şonuň üçin HIÇ KIM giriş edip bilenokdy.

**Düzediş:** Parol barlagy indi täze, howpsuz serwer funksiýasynda
(`/api/verify-password.js`) bolýar — ol "service_role" açar bilen
işleýär (RLS-i sylamaýar, diňe serwerde, brauzere hiç zat ibermeýär).

**SIZ ETMELI ÝEKE-TÄK ÄDIM:**

1. Supabase → siziň proýektiňiz → **Settings → API**
2. **"service_role"** ýazgysynyň deňinden **gizlin açary** göçüriň
   (⚠️ bu "anon" açardan başga — has ygtyýarly, ony hiç ýerde
   paýlaşmaň, diňe indiki ädimde ulanjak)
3. Vercel → proýektiňiz → **Settings → Environment Variables** →
   täze goşuň:
   ```
   Name:  SUPABASE_SERVICE_KEY
   Value: <göçüren açaryňyz>
   ```
4. Vercel-de **Redeploy** ediň (ýa-da täzeden deploy ediň)
5. Ýerli dev üçin-de: taslamanyň `.env` faýlynda
   `SUPABASE_SERVICE_KEY=` ýazgysynyň deňine şol açary ýapyşdyryň

Şondan soň giriş öňki ýaly (ulanyjy ady + parol) işlär — ulanyjylar
hiç zat üýtgänini duýmaz, diňe arka tarapda howpsuzlyk gowulaşdy.

---

## ⚠️ HOWPSUZLYK — DIŇE ÖZÜŇIZ EDIP BILJEK 2 ÄDIM

Bu proýektde iki sany möhüm howpsuzlyk kemçiligi tapyldy. Kodda düzedilip
bilinjek ýerler eýýäm düzedildi (aşakda "Kodda näme üýtgedi?" bölümine
serediň), ýöne **şu 2 ädimi diňe siz, Groq we Supabase dolandyryş
panelinden edip bilersiňiz:**

### 1. Groq API açaryny täzeden dörediň (ROTATE ETMELI)

Bu zip faýlyň içindäki `.env`-de hakyky Groq API açary bar eken
(`gsk_...`). Bu açar indi "aňsat elýeterli" hasap edilmeli, şonuň üçin:

1. https://console.groq.com → API Keys
2. Köne açary **poziň (revoke/delete)**
3. Täze açar dörediň
4. Ony diňe Vercel-yň **Settings → Environment Variables** ýerinde
   `GROQ_KEY` ady bilen goýuň (we ýerli `.env` faýlyňyzda-da täzeläň)

### 2. Supabase-de Row Level Security (RLS) ýakyň

Häzir programma diňe `anon` açary bilen işleýär (sessiýa/token ýok).
Bu, RLS ýakylmasa, **islendik adam** (siziň sahypaňyzy açman-da, göni
Supabase REST API-a ýüz tutup) ähli işgärleri, tabşyryklary we hatda
ulanyjy sanawyny okap/üýtgedip/pozup biler diýmekdir.

Supabase dolandyryş panelinde **SQL Editor**-e giriň we şuny işlediň:

```sql
-- 1) Ähli tablisalarda RLS ýakmak
alter table public.workers  enable row level security;
alter table public.tasks    enable row level security;
alter table public.attend   enable row level security;
alter table public.depts    enable row level security;
alter table public.settings enable row level security;
alter table public.users    enable row level security;

-- 2) Programma öňki ýaly işlemegi üçin "anon" roluna rugsat bermeli
--    (bu ädim RLS-i diňe "ýakýar", access-i entek çäklendirenok —
--     munuň sebäbi: app entek hakyky giriş-esasly (auth) ulgam
--     ulanmaýar, "3-nji ädime" serediň)
create policy "anon full access" on public.workers  for all to anon using (true) with check (true);
create policy "anon full access" on public.tasks    for all to anon using (true) with check (true);
create policy "anon full access" on public.attend   for all to anon using (true) with check (true);
create policy "anon full access" on public.depts    for all to anon using (true) with check (true);
create policy "anon full access" on public.settings for all to anon using (true) with check (true);
create policy "anon full access" on public.users    for all to anon using (true) with check (true);

-- 3) IŇ MÖHÜMI: "password" sütünini "anon"-dan aýyrmak.
--    Frontend indi muny select etmeýär (kodda düzedildi), ýöne
--    muny hem DB derejesinde gadagan etmek gerek — ýogsam kimdir
--    biri Supabase REST API-a göni "users?select=*" sorap bilýär.
revoke select on public.users from anon;
grant select (id, username, role, name, wid, created_at) on public.users to anon;
```

**Bellik:** Ýokardaky "anon full access" policy-ler programmany öňki
ýaly işledýär (parollar indi goralan), ýöne heniz-de "işgär öz
tabşyrygyny üýtgetsin, başgalaryňkyny üýtgedip bilmesin" ýaly hakyky
rol-esasly gorag ýok — bu diňe interfeýsde (görünişde) gizlenýär, DB-de
däl. Muny doly düzetmek üçin geljekde **Supabase Auth**-a geçmek maslahat
berilýär (`auth.uid()`-e esaslanan policy-ler bilen). Häzirlikçe iň
uly howp — parollaryň açylmagy — ýapyldy.

---

## Kodda näme üýtgedi? (howpsuzlyk + säwlik düzedişleri)

### 3-nji tapgyr (giriş + AI düzedişi — iň täze)

- **AI modeli täzelendi:** `llama-3.3-70b-versatile` (Groq tarapyndan
  ýapyldy) → `openai/gpt-oss-120b`. Iki ýerde-de düzedildi:
  `api/ai.js` (Vercel) we `vite.config.js` (ýerli dev).
- **Giriş düzedildi:** Täze `api/verify-password.js` goşuldy. Bu
  öňki sessiýada goýlan RLS (parol sütünini goramak) bilen Login-iň
  arasyndaky gapma-garşylygy çözýär — indi parol barlagy diňe
  serwerde, `SUPABASE_SERVICE_KEY` bilen bolýar. **Bu täze açary
  goşmasaňyz giriş işlemez** — ýokardaky "🚨 GIRIŞ WE AI..." bölümine
  serediň.
- Ulanylmadyk `looksHashed`/`verifyPassword` (indi diňe serwerde
  gerek) kody arassalandy.


### Dil ulgamy (TK/RU/EN) düzedişleri — 2-nji tapgyr

Siz aýdan mesele dogry eken: käbir maglumat/funksiýa dil çalşylanda
üýtgemeýärdi. Sebäbi bir topar ýerde tekst `tl.xxx` arkaly däl-de,
gönüden-göni koda ýazylan eken (diňe Türkmen). Tapyp düzedenlerim:

- **Rol atlary** (Admin/Başlyk/Işgär) — `RL` obýektinde hemişelik
  ýazylan eken, indi `tl.roleAdmin/roleBashlik/roleIshgar` bilen.
- **Tabşyryk derejesi** (Ýokary/Orta/Pes) — edil şonuň ýaly `PM`
  obýektinde hemişelik eken, indi `tl.high/medium/low` bilen.
- **Çykyş (Logout) düwmesi** nädogry açar (`tl.exit`) ulanýardy —
  dogry `tl.logout` bilen çalşyldy (rus dilinde "Уход" ➜ "Выход").
- **Parol güýç ölçegi** (Profil → parol üýtget) doly Türkmençe
  galýardy; bir ýerde `tl.saved.replace(...)` diýen syrly hile bilen
  ýasalypdyr, diňe Türkmen dilinde işleýärdi.
- **`calcH`** funksiýasy ("8sa 30min") — sagat/minut gysga ýazgylary
  hemişe Türkmençe gaýtarýardy (Dowamat, Hasabat, toast-lar).
- **PDF Hasabat eksporty** — sözbaşy, sene formaty (öň hemişe
  `tk-TM` locale), "Döredilen:" ýazgysy — indi doly terjime bolýar.
- **AI kömekçisiniň salamlaşma ýazgysy** hemişe Türkmençe çykýardy.
- **16+ sany `toast("Ýalňyşlyk", ...)`** — ýalňyşlyk toast-larynyň
  sözbaşysy hemişe Türkmençe "Ýalňyşlyk" bolup galýardy.
- Bölüm (depts) toast-lary, Sazlamalar panelindäki arhiw belligi,
  TaskForm-daky "Dereje/Sütün/Tabşyryk ady" ýaly bellikler,
  "Giç geldi" toast-yndaky "Iş:" sözi — ählisi indi `tl`-den alynýar.

**Barlag usuly:** TK/RU/EN sözlükleriniň hersinde takyk 253 açar bar
we üçüsi-de gabat gelýär (programma bilen deňeşdirdim). Galan,
hiç ýerde ulanylmaýan birnäçe açar (mysal: `deptManager`, `myDept`)
bar — bular entek gurulmadyk (ulanylmaýan) aýratynlyklar üçin
goýlan, häzirki interfeýsde ýalňyş tekst görkezenoklar, arassaçylyk
üçin galdyryldy.

### 1-nji tapgyr (howpsuzlyk + ilkinji säwlikler)


- **Parollar indi hash edilýär** (`bcryptjs`). Giriş diňe degişli bir
  ulanyjyny sorap, hash bilen deňeşdirýär — indi bütin ulanyjy
  sanawy (parollar bilen) sahypa açylanda brauzere ýüklenmeýär.
- Admin panelinde açyk parollar indi görkezilmeýär.
- `/api/ai` proxy-den "islendik saýt ulanyp bilsin" diýen CORS
  rugsady aýryldy (öň islendik daşarky sahypa siziň Groq hasabyňyzy
  ulanyp bilýärdi).
- **Säwlik düzedildi:** Dowamat (Attend) sahypasynda taryhy maglumatlar
  başlangyçda ýüklenmeýärdi (`setAttend` kodda kommentli galypdyr).
- **Säwlik düzedildi:** Işe giriş wagty (`doIn`) ýalňyşlyk bolsa,
  "yza almak" (rollback) kody `newA is not defined` diýen täze
  ýalňyşlyk berýärdi (üýtgeýji nädogry ýerde kesgitlenipdir).
- **Säwlik düzedildi:** Kanban-da tabşyryk "Tamamlandy" edilende,
  `settings is not defined` diýen ýalňyşlyk çykýardy (component-e
  `settings` geçirilmändir).

---

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

