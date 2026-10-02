// Vercel Serverless Function — Parol barlagy (howpsuz, serwer tarapynda)
//
// NÄME ÜÇIN BU FAÝL GEREK:
// "users" tablisasynda "password" sütünini "anon" açary bilen okamak
// Supabase-de gadagan edilen (dogry-da, howpsuzlyk üçin). Emma Login we
// Profil ("parolyňy üýtget") barlagy parol sütünini bir gezek okamaly.
// Şonuň üçin bu barlagy diňe serwerde, "service_role" açary bilen
// (ol RLS-i bes edýär) edýäris — brauzere parol hiç haçan gitmeýär.
//
// GEREKLI ENV ÜYTGEÝJISI (Vercel → Settings → Environment Variables):
//   SUPABASE_SERVICE_KEY = <Supabase → Project Settings → API → service_role>
//   ⚠️ "service_role" açary ÇAK GIZLIN — diňe şu ýerde, serwerde ulanylýar.
//      Ony hiç haçan frontend koda, .env-den başga faýla, ýa-da git-e goşmaň.

import bcrypt from "bcryptjs";

const SB_URL = "https://gilwqcqzzlxvdpqokpyh.supabase.co";

// Klassyky service_role açary JWT ("eyJ..."): apikey + Bearer ikisi hem gerek.
// Täze "sb_secret_..." açary JWT däl: diňe apikey başlygy bilen iberilýär
// (Bearer bilen ibersek Supabase "Invalid JWT" berýär).
function sbHeaders(key) {
  const h = { apikey: key };
  if (key.startsWith("eyJ")) h.Authorization = "Bearer " + key;
  return h;
}

function looksHashed(pw) {
  return typeof pw === "string" && /^\$2[aby]\$/.test(pw);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Diňe POST" });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SERVICE_KEY) {
    return res.status(500).json({
      error: "SUPABASE_SERVICE_KEY Vercel Environment Variables-da ýok. Supabase → Settings → API → service_role açaryny goşuň.",
    });
  }

  const { username, userId, password } = req.body || {};
  if (
    typeof password !== "string" || !password ||
    (username !== undefined && typeof username !== "string") ||
    (!username && !userId)
  ) {
    return res.status(400).json({ error: "username ýa-da userId, we password gerek" });
  }

  try {
    // service_role açary RLS-i bes edýär — "password" sütünini-de okap bileris.
    const filter = userId
      ? `id=eq.${encodeURIComponent(userId)}`
      : `username=eq.${encodeURIComponent(username.trim())}`;

    const r = await fetch(`${SB_URL}/rest/v1/users?${filter}&select=*`, {
      headers: sbHeaders(SERVICE_KEY),
    });
    if (!r.ok) {
      const e = await r.text();
      // 401/403 bu ýerde adatça SUPABASE_SERVICE_KEY nädogry diýmekdir
      return res.status(500).json({ error: "Supabase: " + e });
    }
    const rows = await r.json();
    const found = Array.isArray(rows) ? rows[0] : null;

    if (!found) return res.status(401).json({ error: "notfound" });

    const stored = found.password || "";
    let ok = false;

    if (looksHashed(stored)) {
      ok = await bcrypt.compare(password, stored);
    } else {
      // Köne, hash edilmedik hasap — göni deňeşdir
      ok = stored === password;
      if (ok) {
        // Üstünlikli bolsa, indi bcrypt hash-e geçirýäris (bir gezeklik)
        const newHash = bcrypt.hashSync(password, 10);
        await fetch(`${SB_URL}/rest/v1/users?id=eq.${encodeURIComponent(found.id)}`, {
          method: "PATCH",
          headers: { ...sbHeaders(SERVICE_KEY), "Content-Type": "application/json" },
          body: JSON.stringify({ password: newHash }),
        }).catch(() => {});
      }
    }

    if (!ok) return res.status(401).json({ error: "wrong" });

    const { password: _pw, ...safe } = found;
    return res.status(200).json({ user: safe });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Serwer ýalňyşlygy" });
  }
}
