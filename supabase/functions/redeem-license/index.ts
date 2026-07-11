// Supabase Edge Function: redeem-license
// Called by both online/index.html (authenticated, via sb.functions.invoke)
// and offline/index.html (anon, via plain fetch with the anon apikey).
//
// Deploy: supabase functions deploy redeem-license
// Not deployed yet — see plan open items (needs Supabase CLI access).

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);

  let payload: { key?: string; product?: string; device_fingerprint?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, message: "Body tidak valid" }, 400);
  }

  const key = (payload.key || "").trim();
  const product = payload.product;
  const deviceFingerprint = payload.device_fingerprint || null;

  if (!key || (product !== "online" && product !== "offline")) {
    return json({ ok: false, message: "Kode lisensi atau produk tidak valid" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: license, error: findErr } = await admin
    .from("licenses")
    .select("*")
    .eq("key", key)
    .eq("product", product)
    .maybeSingle();

  if (findErr) return json({ ok: false, message: findErr.message }, 500);
  if (!license) return json({ ok: false, message: "Kode lisensi tidak ditemukan" }, 404);

  if (license.status === "redeemed") {
    // Offline: same device re-activating (e.g. reinstall) is fine.
    if (product === "offline" && license.device_fingerprint === deviceFingerprint) {
      return json({ ok: true });
    }
    return json({ ok: false, message: "Kode lisensi sudah dipakai" }, 409);
  }

  if (product === "online") {
    // Caller must be logged in — identify them from their JWT.
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const asUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await asUser.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ ok: false, message: "Sesi tidak valid, silakan login ulang" }, 401);
    const userId = userData.user.id;

    const { error: updLicenseErr } = await admin
      .from("licenses")
      .update({ status: "redeemed", redeemed_at: new Date().toISOString(), user_id: userId })
      .eq("id", license.id);
    if (updLicenseErr) return json({ ok: false, message: updLicenseErr.message }, 500);

    const { error: updProfileErr } = await admin
      .from("profiles")
      .upsert({ user_id: userId, paid: true, license_key: key });
    if (updProfileErr) return json({ ok: false, message: updProfileErr.message }, 500);

    return json({ ok: true });
  }

  // offline
  const { error: updErr } = await admin
    .from("licenses")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString(), device_fingerprint: deviceFingerprint })
    .eq("id", license.id);
  if (updErr) return json({ ok: false, message: updErr.message }, 500);

  return json({ ok: true });
});
