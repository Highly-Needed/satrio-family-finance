import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SCALEV_API_KEY = Deno.env.get("SCALEV_API_KEY")!;

const SCALEV_API = "https://api.scalev.com";

const VARIANT_MAP: Record<string, "online" | "offline"> = {
  "variant_OYtN-AjBEesIGm5BjX1TSjV0": "online",
  "variant_Mj0wSBgSZ5iDHoPWn2hwxDB9": "offline",
};

function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const group = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${group()}-${group()}-${group()}-${group()}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const ordersRes = await fetch(
    `${SCALEV_API}/v3/orders?payment_status=paid&columns=order_id,destination_address,orderlines&page_size=25`,
    {
      headers: {
        Authorization: `Bearer ${SCALEV_API_KEY}`,
        Accept: "application/json",
      },
    },
  );

  if (!ordersRes.ok) {
    const err = await ordersRes.text();
    return json({ ok: false, message: `Scalev API error: ${ordersRes.status}`, detail: err }, 502);
  }

  const ordersData = await ordersRes.json();
  const orders = ordersData.data || ordersData.results || ordersData || [];

  if (!Array.isArray(orders)) {
    return json({ ok: false, message: "Unexpected Scalev response shape", raw: ordersData }, 502);
  }

  let created = 0;
  let skipped = 0;

  for (const order of orders) {
    const orderId = order.order_id;
    if (!orderId) continue;

    const { data: existing } = await admin
      .from("licenses")
      .select("id")
      .eq("scalev_order_id", orderId)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    const email =
      order.destination_address?.email ||
      order.customer?.email ||
      null;

    const orderlines: any[] = order.orderlines || [];

    if (orderlines.length === 0) {
      const key = generateLicenseKey();
      await admin.from("licenses").insert({
        key,
        product: null,
        email,
        scalev_order_id: orderId,
        scalev_variant_id: null,
        status: "unused",
      });
      created++;
      continue;
    }

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
      created++;
    }
  }

  return json({ ok: true, created, skipped, total_orders: orders.length });
});
