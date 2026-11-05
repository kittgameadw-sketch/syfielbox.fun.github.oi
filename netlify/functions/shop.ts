import type { Config } from "@netlify/functions";
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { CREDIT_PACKS, PRODUCTS } from "../../lib/catalog.js";
import { getAccount, json, readJson, requireUser, unauthorized } from "../../lib/auth.js";

export default async (req: Request) => {
  if (req.method === "GET") return json({ products: PRODUCTS, packs: CREDIT_PACKS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const user = await requireUser();
  if (!user) return unauthorized();
  const account = await getAccount(user.id);
  if (!account) return json({ error: "Önce hesabına Minecraft nickini bağla." }, 400);

  const { productId } = await readJson(req);
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return json({ error: "Ürün bulunamadı." }, 404);

  // Tek sorguda atomik: bakiye yeterliyse düş, sipariş ve kredi hareketi oluştur
  const result = await db.execute(sql`
    WITH upd AS (
      UPDATE accounts SET credits = credits - ${product.price}
      WHERE id = ${user.id} AND credits >= ${product.price}
      RETURNING id, nick, credits
    ), o AS (
      INSERT INTO orders (account_id, nick, product_id, product_name, price)
      SELECT id, nick, ${product.id}, ${product.name}, ${product.price} FROM upd
      RETURNING id
    ), t AS (
      INSERT INTO credit_transactions (account_id, amount, reason)
      SELECT id, ${-product.price}, ${"Satın alma: " + product.name} FROM upd
      RETURNING id
    )
    SELECT upd.credits, (SELECT id FROM o) AS order_id FROM upd
  `);
  const rows = ((result as any).rows ?? result) as any[];
  if (!rows.length) {
    return json({ error: `Yetersiz bakiye. Bu ürün ${product.price} kredi, bakiyen ${account.credits} kredi.` }, 402);
  }
  return json({ ok: true, credits: Number(rows[0].credits), orderId: rows[0].order_id });
};

export const config: Config = { path: "/api/shop" };
