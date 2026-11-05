import type { Config } from "@netlify/functions";
import { desc, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { players } from "../../db/schema.js";
import { json } from "../../lib/auth.js";

const SORTS: Record<string, any> = {
  points: desc(players.points),
  kills: desc(players.kills),
  wins: desc(players.wins),
  kdr: sql`(${players.kills}::float / GREATEST(${players.deaths}, 1)) DESC`,
};

export default async (req: Request) => {
  const url = new URL(req.url);
  const nick = url.searchParams.get("nick");
  if (nick) {
    const [p] = await db.select().from(players).where(sql`lower(${players.nick}) = lower(${nick})`);
    if (!p) return json({ error: "Oyuncu bulunamadı." }, 404);
    const [{ rank }] = (await db
      .select({ rank: sql<number>`count(*) + 1` })
      .from(players)
      .where(sql`${players.points} > ${p.points}`)) as any;
    return json({ player: p, rank: Number(rank) });
  }
  const sort = SORTS[url.searchParams.get("sort") || "points"] ?? SORTS.points;
  const list = await db.select().from(players).orderBy(sort, desc(players.points)).limit(100);
  return Response.json(
    { players: list },
    { headers: { "Netlify-CDN-Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
};

export const config: Config = { path: "/api/leaderboard" };
