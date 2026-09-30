// Ulanyjy dolandyryşy — diňe serwerde (service_role açary brauzere GIDENOK).
// Çagyryjy hökmany girmeli. "create/update/delete" diňe admin üçin; "self" islendik ulanyjy öz hasaby üçin.
import { SB_URL, ANON, SERVICE, toEmail, bearer, getUser, svc, authAdmin } from "./_sb.js";

const ROLES = ["admin", "bashlik", "ishgar"];
const fail = (res, code, msg) => res.status(code).json({ error: msg });

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "POST gerek");
  if (!SB_URL || !ANON || !SERVICE)
    return fail(res, 500, "Serwerde SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY goýulmadyk");

  const authUser = await getUser(bearer(req));
  if (!authUser) return fail(res, 401, "Giriş gerek");

  let me;
  try {
    const rows = await svc(`profiles?id=eq.${authUser.id}&select=*`);
    me = rows?.[0];
  } catch (e) { return fail(res, 500, e.message); }
  if (!me) return fail(res, 403, "Profil tapylmady");

  const b = req.body || {};
  const username = b.username ? String(b.username).trim().toLowerCase() : null;
  const name = b.name ? String(b.name).trim() : null;

  try {
    // ── Öz profilini üýtgetmek (ähli rollar) ─────────────────────────
    if (b.action === "self") {
      if (b.newPassword) {
        if (String(b.newPassword).length < 4) return fail(res, 400, "Parol gysga");
        // köne paroly serwerde barlaýarys
        const chk = await fetch(SB_URL + "/auth/v1/token?grant_type=password", {
          method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
          body: JSON.stringify({ email: authUser.email, password: b.oldPassword || "" }),
        });
        if (!chk.ok) return fail(res, 400, "WRONG_PASSWORD");
      }
      if (username && username !== me.username) {
        const dup = await svc(`profiles?username=eq.${encodeURIComponent(username)}&select=id`);
        if (dup?.length) return fail(res, 409, "USERNAME_TAKEN");
      }
      const authPatch = {};
      if (username && username !== me.username) { authPatch.email = toEmail(username); authPatch.email_confirm = true; }
      if (b.newPassword) authPatch.password = b.newPassword;
      if (Object.keys(authPatch).length) await authAdmin(`users/${me.id}`, "PUT", authPatch);
      const patch = {};
      if (name) patch.name = name;
      if (username) patch.username = username;
      const out = Object.keys(patch).length ? await svc(`profiles?id=eq.${me.id}`, "PATCH", patch) : [me];
      return res.status(200).json({ profile: out[0] });
    }

    // ── Aşakdakylar diňe admin üçin ─────────────────────────────────
    if (me.role !== "admin") return fail(res, 403, "Diňe admin");

    if (b.action === "create") {
      if (!username || !name || !b.password || !ROLES.includes(b.role)) return fail(res, 400, "Maglumat ýetmezçilik edýär");
      if (String(b.password).length < 4) return fail(res, 400, "Parol gysga");
      const dup = await svc(`profiles?username=eq.${encodeURIComponent(username)}&select=id`);
      if (dup?.length) return fail(res, 409, "USERNAME_TAKEN");
      const created = await authAdmin("users", "POST", { email: toEmail(username), password: b.password, email_confirm: true });
      try {
        const out = await svc("profiles", "POST", { id: created.id, username, name, role: b.role, wid: b.wid || null });
        return res.status(200).json({ profile: out[0] });
      } catch (e) {
        await authAdmin(`users/${created.id}`, "DELETE").catch(() => {}); // yza al
        throw e;
      }
    }

    if (b.action === "update") {
      if (!b.id) return fail(res, 400, "id gerek");
      const rows = await svc(`profiles?id=eq.${b.id}&select=*`);
      const target = rows?.[0];
      if (!target) return fail(res, 404, "Ulanyjy tapylmady");
      if (b.role && !ROLES.includes(b.role)) return fail(res, 400, "Rol nädogry");
      if (target.id === me.id && b.role && b.role !== "admin") return fail(res, 400, "Özüňiziň admin rolyňyzy aýryp bilmersiňiz");
      if (username && username !== target.username) {
        const dup = await svc(`profiles?username=eq.${encodeURIComponent(username)}&select=id`);
        if (dup?.length) return fail(res, 409, "USERNAME_TAKEN");
      }
      const authPatch = {};
      if (username && username !== target.username) { authPatch.email = toEmail(username); authPatch.email_confirm = true; }
      if (b.password) {
        if (String(b.password).length < 4) return fail(res, 400, "Parol gysga");
        authPatch.password = b.password;
      }
      if (Object.keys(authPatch).length) await authAdmin(`users/${target.id}`, "PUT", authPatch);
      const patch = {};
      if (name) patch.name = name;
      if (username) patch.username = username;
      if (b.role) patch.role = b.role;
      if ("wid" in b) patch.wid = b.wid || null;
      const out = Object.keys(patch).length ? await svc(`profiles?id=eq.${target.id}`, "PATCH", patch) : [target];
      return res.status(200).json({ profile: out[0] });
    }

    if (b.action === "delete") {
      if (!b.id) return fail(res, 400, "id gerek");
      if (b.id === me.id) return fail(res, 400, "Özüňizi pozup bilmersiňiz");
      await authAdmin(`users/${b.id}`, "DELETE"); // profiles ON DELETE CASCADE
      return res.status(200).json({ ok: true });
    }

    return fail(res, 400, "Nätanyş action");
  } catch (e) {
    return fail(res, 500, e.message || "Serwer ýalňyşlygy");
  }
}
