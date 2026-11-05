import type { Config } from "@netlify/functions";

const SERVER_IP = "syfielbox.fun";
const DISCORD_INVITE = "syfielbox";

async function fetchJson(url: string, ms = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Syfielbox-Website/1.0" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export default async () => {
  const [mc, dc] = await Promise.all([
    fetchJson(`https://api.mcsrvstat.us/3/${SERVER_IP}`),
    fetchJson(`https://discord.com/api/v10/invites/${DISCORD_INVITE}?with_counts=true`),
  ]);

  const server = mc
    ? {
        online: Boolean(mc.online),
        players: mc.players?.online ?? 0,
        max: mc.players?.max ?? 0,
        version: mc.version ?? null,
        motd: Array.isArray(mc.motd?.clean) ? mc.motd.clean.join(" ").trim() : null,
      }
    : { online: false, players: 0, max: 0, version: null, motd: null };

  const discord = dc
    ? {
        online: dc.approximate_presence_count ?? null,
        members: dc.approximate_member_count ?? null,
        name: dc.guild?.name ?? null,
      }
    : { online: null, members: null, name: null };

  return Response.json(
    { server, discord, updatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
};

export const config: Config = { path: "/api/status" };
