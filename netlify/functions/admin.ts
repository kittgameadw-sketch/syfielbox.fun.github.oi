import type { Config, Context } from "@netlify/functions";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { accounts, applications, creditTransactions, orders, players, tournamentEntries, tournaments } from "../../db/schema.js";
import { forbidden, isAdmin, json, NICK_RE, readJson, requireUser, unauthorized } from "../../lib/auth.js";

const APP_STATUSES = ["beklemede", "kabul", "red"];
const ORDER_STATUSES = ["beklemede", "teslim edildi", "iptal"];
const int = (v: unknown) => Math.max(0, Math.trunc(Number(v) || 0));

export default async (req: Request, context: Context) => {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const { resource, id } = context.params;
  const body = req.method === "GET" || req.method === "DELETE" ? {} : await readJson(req);

  try {
    // Genel bakış: panelin ihtiyaç duyduğu her şey
    if (req.method === "GET" && resource === "overview") {
      const [apps, accs, ords, plys, tours, entries, [totals]] = await Promise.all([
        db.select().from(applications).orderBy(desc(applications.createdAt)).limit(200),
        db.select().from(accounts).orderBy(desc(accounts.createdAt)).limit(500),
        db.select().from(orders).orderBy(desc(orders.createdAt)).limit(300),
        db.select().from(players).orderBy(desc(players.points)).limit(500),
        db.select().from(tournaments).orderBy(desc(tournaments.startsAt)).limit(100),
        db.select().from(tournamentEntries).orderBy(desc(tournamentEntries.createdAt)).limit(1000),
        db.execute(sql`SELECT
          (SELECT count(*) FROM accounts) AS accounts,
          (SELECT count(*) FROM applications WHERE status = 'beklemede') AS pending_apps,
          (SELECT count(*) FROM orders WHERE status = 'beklemede') AS pending_orders,
          (SELECT coalesce(sum(amount),0) FROM credit_transactions WHERE payment_ref IS NOT NULL) AS credits_sold`).then((r: any) => r.rows ?? r),
      ]);
      return json({ applications: apps, accounts: accs, orders: ords, players: plys, tournaments: tours, entries, totals });
    }

    if (req.method === "PATCH" && resource === "applications") {
      if (!APP_STATUSES.includes(body.status)) return json({ error: "Geçersiz durum." }, 400);
      await db.update(applications).set({ status: body.status }).where(eq(applications.id, Number(id)));
      return json({ ok: true });
    }

    if (req.method === "PATCH" && resource === "orders") {
      if (!ORDER_STATUSES.includes(body.status)) return json({ error: "Geçersiz durum." }, 400);
      const [order] = await db.select().from(orders).where(eq(orders.id, Number(id)));
      if (!order) return json({ error: "Sipariş yok." }, 404);
      // İptal edilen siparişin kredisi iade edilir (bir kez)
      if (body.status === "iptal" && order.status !== "iptal") {
        await db.execute(sql`
          WITH o AS (UPDATE orders SET status = 'iptal' WHERE id = ${order.id} AND status <> 'iptal' RETURNING account_id, price, product_name),
          t AS (INSERT INTO credit_transactions (account_id, amount, reason) SELECT account_id, price, 'İade: ' || product_name FROM o)
          UPDATE accounts SET credits = credits + (SELECT price FROM o) WHERE id = (SELECT account_id FROM o)`);
      } else {
        await db.update(orders).set({ status: body.status }).where(eq(orders.id, order.id));
      }
      return json({ ok: true });
    }

    if (req.method === "POST" && resource === "credits") {
      const amount = Math.trunc(Number(body.amount));
      if (!amount || Math.abs(amount) > 100000) return json({ error: "Geçerli bir miktar gir." }, 400);
      const reason = String(body.reason || "Admin düzeltmesi").slice(0, 120);
      const result = await db.execute(sql`
        WITH upd AS (UPDATE accounts SET credits = credits + ${amount} WHERE id = ${id} AND credits + ${amount} >= 0 RETURNING id, credits),
        t AS (INSERT INTO credit_transactions (account_id, amount, reason) SELECT id, ${amount}, ${reason} FROM upd)
        SELECT credits FROM upd`);
      const rows = ((result as any).rows ?? result) as any[];
      if (!rows.length) return json({ error: "Hesap bulunamadı veya bakiye eksiye düşer." }, 400);
      return json({ ok: true, credits: Number(rows[0].credits) });
    }

    if (req.method === "POST" && resource === "players") {
      const nick = String(body.nick || "").trim();
      if (!NICK_RE.test(nick)) return json({ error: "Geçersiz nick." }, 400);
      const values = { nick, kills: int(body.kills), deaths: int(body.deaths), wins: int(body.wins), points: int(body.points), updatedAt: new Date() };
      const [p] = await db.insert(players).values(values)
        .onConflictDoUpdate({ target: players.nick, set: { kills: values.kills, deaths: values.deaths, wins: values.wins, points: values.points, updatedAt: values.updatedAt } })
        .returning();
      return json({ player: p });
    }
    if (req.method === "DELETE" && resource === "players") {
      await db.delete(players).where(eq(players.id, Number(id)));
      return json({ ok: true });
    }

    if (req.method === "POST" && resource === "tournaments") {
      const title = String(body.title || "").trim().slice(0, 80);
      const startsAt = new Date(body.startsAt);
      if (!title || isNaN(startsAt.getTime())) return json({ error: "Başlık ve tarih zorunlu." }, 400);
      const [t] = await db.insert(tournaments).values({
        title,
        description: String(body.description || "").slice(0, 600),
        type: String(body.type || "Turnuva").slice(0, 30),
        prize: String(body.prize || "").slice(0, 120),
        startsAt,
        maxPlayers: Math.min(512, Math.max(2, int(body.maxPlayers) || 32)),
      }).returning();
      return json({ tournament: t }, 201);
    }
    if (req.method === "DELETE" && resource === "tournaments") {
      await db.delete(tournaments).where(eq(tournaments.id, Number(id)));
      return json({ ok: true });
    }
  } catch (err) {
    console.error(err);
    return json({ error: "Sunucu hatası." }, 500);
  }

  return new Response("Not found", { status: 404 });
};

export const config: Config = { path: ["/api/admin/:resource", "/api/admin/:resource/:id"] };
