import type { Config, Context } from "@netlify/functions";
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { CREDIT_PACKS } from "../../lib/catalog.js";
import { getAccount, json, readJson, requireUser, unauthorized } from "../../lib/auth.js";

const STRIPE = "https://api.stripe.com/v1";

function stripeKey() {
  return Netlify.env.get("STRIPE_SECRET_KEY");
}

async function stripe(path: string, init: RequestInit = {}) {
  const res = await fetch(STRIPE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Stripe hatası");
  return data;
}

export default async (req: Request, context: Context) => {
  if (!stripeKey()) return json({ error: "Ödeme sistemi henüz yapılandırılmadı." }, 503);
  const user = await requireUser();
  if (!user) return unauthorized();
  const account = await getAccount(user.id);
  if (!account) return json({ error: "Önce hesabına Minecraft nickini bağla." }, 400);

  const action = context.params.action;
  const body = await readJson(req);

  // 1) Ödeme sayfası oluştur
  if (req.method === "POST" && action === "checkout") {
    const pack = CREDIT_PACKS.find((p) => p.id === body.packId);
    if (!pack) return json({ error: "Kredi paketi bulunamadı." }, 404);
    const origin = new URL(req.url).origin;
    const total = pack.credits + pack.bonus;
    const params = new URLSearchParams({
      mode: "payment",
      success_url: `${origin}/hesap?odeme={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/hesap?odeme=iptal`,
      client_reference_id: user.id,
      customer_email: account.email,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "try",
      "line_items[0][price_data][unit_amount]": String(pack.priceTry * 100),
      "line_items[0][price_data][product_data][name]": `${total} Syfielbox Kredisi`,
      "line_items[0][price_data][product_data][description]": `${account.nick} hesabına ${total} kredi`,
      "metadata[accountId]": user.id,
      "metadata[packId]": pack.id,
      "metadata[credits]": String(total),
    });
    try {
      const session = await stripe("/checkout/sessions", { method: "POST", body: params });
      return json({ url: session.url });
    } catch (err: any) {
      console.error(err);
      return json({ error: "Ödeme sayfası oluşturulamadı: " + err.message }, 502);
    }
  }

  // 2) Ödeme dönüşünde doğrula ve krediyi yükle (tekrar çağrılırsa ikinci kez yüklemez)
  if (req.method === "POST" && action === "confirm") {
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return json({ error: "Geçersiz ödeme." }, 400);
    let session: any;
    try {
      session = await stripe(`/checkout/sessions/${sessionId}`, { method: "GET" });
    } catch {
      return json({ error: "Ödeme doğrulanamadı." }, 400);
    }
    if (session.metadata?.accountId !== user.id) return json({ error: "Bu ödeme senin hesabına ait değil." }, 403);
    if (session.payment_status !== "paid") return json({ error: "Ödeme henüz tamamlanmadı." }, 402);

    const credits = Number(session.metadata.credits);
    const result = await db.execute(sql`
      WITH ins AS (
        INSERT INTO credit_transactions (account_id, amount, reason, payment_ref)
        VALUES (${user.id}, ${credits}, ${"Kredi yükleme (" + credits + " kredi)"}, ${sessionId})
        ON CONFLICT (payment_ref) DO NOTHING
        RETURNING amount
      )
      UPDATE accounts SET credits = credits + (SELECT amount FROM ins)
      WHERE id = ${user.id} AND EXISTS (SELECT 1 FROM ins)
      RETURNING credits
    `);
    const rows = ((result as any).rows ?? result) as any[];
    const fresh = await getAccount(user.id);
    return json({ ok: true, added: rows.length ? credits : 0, credits: fresh?.credits ?? 0 });
  }

  return new Response("Not found", { status: 404 });
};

export const config: Config = { path: "/api/payments/:action" };
