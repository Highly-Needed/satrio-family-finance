import { createClient } from "npm:@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIGNING_SECRET = Deno.env.get("SCALEV_SIGNING_SECRET")!;

const VARIANT_MAP: Record<string, "online" | "offline"> = {
  "variant_OYtN-AjBEesIGm5BjX1TSjV0": "online",
  "variant_Mj0wSBgSZ5iDHoPWn2hwxDB9": "offline",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const group = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${group()}-${group()}-${group()}-${group()}`;
}

async function verifyHmac(rawBody: string, header: string | null): Promise<boolean> {
  if (!header) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SIGNING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const calculated = base64Encode(new Uint8Array(sig));
  return calculated === header;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);

  const rawBody = await req.text();

  const hmacHeader = req.headers.get("X-Scalev-Hmac-Sha256");
  if (!(await verifyHmac(rawBody, hmacHeader))) {
    return json({ ok: false, message: "Invalid signature" }, 401);
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, message: "Body bukan JSON valid" }, 400);
  }

  if (body.event === "business.test_event") {
    return json({ ok: true, message: "Test event received" });
  }

  if (body.event !== "order.payment_status_changed") {
    return json({ ok: true, message: "Event ignored" });
  }

  const data = body.data;
  if (data?.payment_status !== "paid") {
    return json({ ok: true, message: "Not a paid event, ignored" });
  }

  const email = data.destination_address?.email;
  const orderId = data.order_id;
  const orderlines: any[] = data.orderlines || [];

  if (!email || !orderId || orderlines.length === 0) {
    return json({ ok: false, message: "Missing order data" }, 200);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  for (const line of orderlines) {
    const variantId = line.variant_unique_id;
    const product = VARIANT_MAP[variantId] || null;
    const key = generateLicenseKey();

    await admin.from("licenses").insert({
      key,
      product,
      email,
      scalev_order_id: orderId,
      scalev_variant_id: variantId,
      status: "unused",
    });
  }

  return json({ ok: true });
});
