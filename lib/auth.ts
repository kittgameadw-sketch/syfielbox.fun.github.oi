import { getUser } from "@netlify/identity";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { accounts } from "../db/schema.js";

export async function requireUser() {
  const user = await getUser();
  return user ?? null;
}

export function isAdmin(user: { roles?: string[] } | null) {
  return Boolean(user?.roles?.includes("admin"));
}

export async function getAccount(userId: string) {
  const [acc] = await db.select().from(accounts).where(eq(accounts.id, userId));
  return acc ?? null;
}

export const json = (data: unknown, status = 200) => Response.json(data, { status });
export const unauthorized = () => json({ error: "Bu işlem için giriş yapmalısın." }, 401);
export const forbidden = () => json({ error: "Bu işlem için yetkin yok." }, 403);

export async function readJson(req: Request): Promise<Record<string, any>> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export const NICK_RE = /^[A-Za-z0-9_]{3,16}$/;
