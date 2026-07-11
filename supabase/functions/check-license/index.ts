import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);

  let payload: { email?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, message: "Body tidak valid" }, 400);
  }

  const email = (payload.email || "").trim().toLowerCase();
  if (!email) return json({ ok: false, message: "Email wajib diisi" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: licenses, error } = await admin
    .from("licenses")
    .select("key, product, status, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false });

  if (error) return json({ ok: false, message: error.message }, 500);
  if (!licenses || licenses.length === 0) {
    return json({ ok: false, message: "Belum ada lisensi untuk email ini. Kalau baru bayar, tunggu 5 menit lalu coba lagi." }, 404);
  }

  return json({
    ok: true,
    licenses: licenses.map((l) => ({
      key: l.key,
      product: l.product,
      status: l.status,
      created_at: l.created_at,
    })),
  });
});
