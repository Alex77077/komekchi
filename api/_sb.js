// Umumy kömekçiler (Vercel bu faýly route hasaplamaýar — "_" bilen başlaýar)
export const SB_URL  = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
export const ANON    = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
export const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Login ady → e-poçta (SQL-daky _kom_email() we src/App.jsx-daky toEmail() bilen birmeňzeş)
export function toEmail(username) {
  const u = String(username || "").trim().toLowerCase();
  if (/^[a-z0-9._-]{1,40}$/.test(u)) return u + "@komekchi.app";
  return "u_" + Buffer.from(u, "utf8").toString("hex") + "@komekchi.app";
}

export function bearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}

// Token dogry bolsa ulanyjyny gaýtarýar
export async function getUser(token) {
  if (!token || !SB_URL || !ANON) return null;
  const r = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: ANON, Authorization: "Bearer " + token } });
  if (!r.ok) return null;
  return r.json();
}

// service_role bilen PostgREST (diňe serwerde)
export async function svc(path, method = "GET", body) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, {
    method,
    headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t || "HTTP " + r.status);
  return t ? JSON.parse(t) : null;
}

export async function authAdmin(path, method, body) {
  const r = await fetch(SB_URL + "/auth/v1/admin/" + path, {
    method,
    headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  const j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(j?.msg || j?.message || j?.error_description || "HTTP " + r.status);
  return j;
}
