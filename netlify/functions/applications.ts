import type { Config } from "@netlify/functions";
import { count } from "drizzle-orm";
import { db } from "../../db/index.js";
import { applications } from "../../db/schema.js";

const ROLES = ["Rehber", "Moderatör", "Builder", "İçerik Üreticisi"];

function clean(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export default async (req: Request) => {
  if (req.method === "GET") {
    try {
      const [row] = await db.select({ total: count() }).from(applications);
      return Response.json({ total: row?.total ?? 0 });
    } catch (err) {
      console.error(err);
      return Response.json({ total: null }, { status: 500 });
    }
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  // Honeypot: botlar bu gizli alanı doldurur
  if (clean(body.website, 100)) {
    return Response.json({ ok: true }, { status: 201 });
  }

  const nick = clean(body.nick, 16);
  const discord = clean(body.discord, 40);
  const age = Number(body.age);
  const role = clean(body.role, 40);
  const playtime = clean(body.playtime, 60);
  const experience = clean(body.experience, 1500);
  const reason = clean(body.reason, 2000);

  const errors: string[] = [];
  if (!/^[A-Za-z0-9_]{3,16}$/.test(nick)) errors.push("Minecraft nicki 3-16 karakter olmalı (harf, rakam, _).");
  if (discord.length < 2) errors.push("Discord kullanıcı adını yaz.");
  if (!Number.isInteger(age) || age < 10 || age > 80) errors.push("Geçerli bir yaş gir.");
  if (!ROLES.includes(role)) errors.push("Bir pozisyon seç.");
  if (!playtime) errors.push("Günlük aktiflik süreni yaz.");
  if (reason.length < 30) errors.push("Neden seni seçmeliyiz? En az 30 karakter yaz.");

  if (errors.length) return Response.json({ error: errors.join(" ") }, { status: 400 });

  try {
    const [created] = await db
      .insert(applications)
      .values({ nick, discord, age, role, playtime, experience, reason })
      .returning({ id: applications.id });
    return Response.json({ ok: true, id: created.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Başvuru şu an kaydedilemedi, lütfen biraz sonra tekrar dene." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/applications" };
