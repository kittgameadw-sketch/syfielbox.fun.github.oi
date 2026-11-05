import type { Config, Context } from "@netlify/functions";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { tournamentEntries, tournaments } from "../../db/schema.js";
import { getAccount, json, requireUser, unauthorized } from "../../lib/auth.js";

export default async (req: Request, context: Context) => {
  const user = await requireUser();
  const id = Number(context.params.id);

  if (req.method === "GET" && !context.params.id) {
    const list = await db
      .select({
        id: tournaments.id,
        title: tournaments.title,
        description: tournaments.description,
        type: tournaments.type,
        prize: tournaments.prize,
        startsAt: tournaments.startsAt,
        maxPlayers: tournaments.maxPlayers,
        entries: sql<number>`(select count(*) from tournament_entries e where e.tournament_id = ${tournaments.id})`,
        joined: user
          ? sql<boolean>`exists(select 1 from tournament_entries e where e.tournament_id = ${tournaments.id} and e.account_id = ${user.id})`
          : sql<boolean>`false`,
      })
      .from(tournaments)
      .where(sql`${tournaments.startsAt} > now() - interval '1 day'`)
      .orderBy(asc(tournaments.startsAt));
    return json({ tournaments: list.map((t) => ({ ...t, entries: Number(t.entries) })) });
  }

  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  if (!user) return unauthorized();
  const account = await getAccount(user.id);
  if (!account) return json({ error: "Önce hesabına Minecraft nickini bağla." }, 400);

  if (req.method === "POST") {
    const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    if (!t) return json({ error: "Turnuva bulunamadı." }, 404);
    if (t.startsAt.getTime() < Date.now()) return json({ error: "Bu turnuva başladı, kayıtlar kapandı." }, 400);
    // Kontenjan kontrolü + kayıt tek sorguda
    const result = await db.execute(sql`
      INSERT INTO tournament_entries (tournament_id, account_id, nick)
      SELECT ${id}, ${user.id}, ${account.nick}
      WHERE (SELECT count(*) FROM tournament_entries WHERE tournament_id = ${id}) < ${t.maxPlayers}
      ON CONFLICT ON CONSTRAINT tournament_entries_unique DO NOTHING
      RETURNING id
    `);
    const rows = ((result as any).rows ?? result) as any[];
    if (!rows.length) {
      const [mine] = await db.select().from(tournamentEntries).where(and(eq(tournamentEntries.tournamentId, id), eq(tournamentEntries.accountId, user.id)));
      return mine ? json({ ok: true }) : json({ error: "Kontenjan doldu." }, 409);
    }
    return json({ ok: true }, 201);
  }

  if (req.method === "DELETE") {
    await db.delete(tournamentEntries).where(and(eq(tournamentEntries.tournamentId, id), eq(tournamentEntries.accountId, user.id)));
    return json({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = { path: ["/api/tournaments", "/api/tournaments/:id"] };
