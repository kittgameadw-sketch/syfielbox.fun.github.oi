import type { Config } from "@netlify/functions";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { accounts, creditTransactions, orders } from "../../db/schema.js";
import { getAccount, isAdmin, json, NICK_RE, readJson, requireUser, unauthorized } from "../../lib/auth.js";

export default async (req: Request) => {
  const user = await requireUser();
  if (!user) return unauthorized();

  if (req.method === "GET") {
    const account = await getAccount(user.id);
    if (!account) return json({ user: { email: user.email }, account: null, admin: isAdmin(user) });
    const [myOrders, txs] = await Promise.all([
      db.select().from(orders).where(eq(orders.accountId, user.id)).orderBy(desc(orders.createdAt)).limit(50),
      db.select().from(creditTransactions).where(eq(creditTransactions.accountId, user.id)).orderBy(desc(creditTransactions.createdAt)).limit(50),
    ]);
    return json({ user: { email: user.email }, account, orders: myOrders, transactions: txs, admin: isAdmin(user) });
  }

  if (req.method === "POST") {
    // Hesabı oluştur / nick bağla
    const body = await readJson(req);
    const nick = typeof body.nick === "string" ? body.nick.trim() : "";
    if (!NICK_RE.test(nick)) return json({ error: "Minecraft nicki 3-16 karakter olmalı (harf, rakam, _)." }, 400);
    const existing = await getAccount(user.id);
    if (existing) return json({ account: existing });
    const [taken] = await db.select({ id: accounts.id }).from(accounts).where(sql`lower(${accounts.nick}) = lower(${nick})`);
    if (taken) return json({ error: "Bu nick başka bir hesaba bağlı." }, 409);
    const [account] = await db.insert(accounts).values({ id: user.id, email: user.email ?? "", nick }).returning();
    return json({ account }, 201);
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = { path: "/api/me" };
