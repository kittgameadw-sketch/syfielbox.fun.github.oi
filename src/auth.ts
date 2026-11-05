// Tarayıcı tarafı hesap sistemi — esbuild ile public/assets/auth.js'e paketlenir
import {
  login, signup, logout, getUser, handleAuthCallback, onAuthChange,
  requestPasswordRecovery, updateUser, AuthError, MissingIdentityError,
} from "@netlify/identity";

type Me = { user: { email?: string }; account: any | null; orders?: any[]; transactions?: any[]; admin: boolean } | null;

const state: { user: any; me: Me } = { user: null, me: null };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const toast = (m: string) => (window as any).showToast?.(m);

async function api(path: string, opts: { method?: string; body?: unknown } = {}) {
  const res = await fetch(path, {
    method: opts.method || "GET",
    credentials: "same-origin",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Bir hata oluştu."), { status: res.status });
  return data;
}

function authMessage(err: unknown) {
  if (err instanceof MissingIdentityError) return "Giriş sistemi şu an kullanılamıyor.";
  if (err instanceof AuthError) {
    const m = (err.message || "").toLowerCase();
    if (m.includes("email not confirmed")) return "E-postanı henüz onaylamadın. Gelen kutunu kontrol et.";
    if (err.status === 401 || err.status === 400) return "E-posta veya şifre hatalı.";
    if (err.status === 403) return "Kayıtlar şu an kapalı.";
    if (err.status === 422) return m.includes("password") ? "Şifre en az 6 karakter olmalı." : "Bu e-posta zaten kayıtlı veya geçersiz.";
    if (err.status === 429) return "Çok fazla deneme yaptın, biraz bekle.";
    return err.message;
  }
  return (err as Error)?.message || "Bir hata oluştu.";
}

/* ---------- Modal ---------- */
const modal = document.createElement("div");
modal.className = "auth-modal";
modal.innerHTML = `
  <div class="auth-box card">
    <button class="auth-close" aria-label="Kapat"><i class="fa-solid fa-xmark"></i></button>
    <img src="/logo.png?v=10" alt="" class="auth-logo">
    <div class="auth-tabs"><button data-tab="login" class="active">Giriş Yap</button><button data-tab="signup">Kayıt Ol</button></div>
    <form data-form="login">
      <div class="field"><label>E-posta</label><input name="email" type="email" required autocomplete="email" placeholder="ornek@mail.com"></div>
      <div class="field"><label>Şifre</label><input name="password" type="password" required autocomplete="current-password" placeholder="••••••••"></div>
      <button class="btn btn-primary" type="submit"><i class="fa-solid fa-right-to-bracket"></i> Giriş Yap</button>
      <a href="#" class="auth-link" data-go="forgot">Şifremi unuttum</a>
    </form>
    <form data-form="signup" hidden>
      <div class="field"><label>Minecraft Nick</label><input name="nick" required maxlength="16" pattern="[A-Za-z0-9_]{3,16}" placeholder="Syfiel_PVPer" autocomplete="username"></div>
      <div class="field"><label>E-posta</label><input name="email" type="email" required autocomplete="email" placeholder="ornek@mail.com"></div>
      <div class="field"><label>Şifre <span>(en az 6 karakter)</span></label><input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="••••••••"></div>
      <button class="btn btn-primary" type="submit"><i class="fa-solid fa-user-plus"></i> Kayıt Ol</button>
    </form>
    <form data-form="forgot" hidden>
      <p class="auth-info">Hesabının e-postasını yaz, şifre sıfırlama bağlantısı gönderelim.</p>
      <div class="field"><label>E-posta</label><input name="email" type="email" required placeholder="ornek@mail.com"></div>
      <button class="btn btn-primary" type="submit"><i class="fa-solid fa-envelope"></i> Bağlantı Gönder</button>
      <a href="#" class="auth-link" data-go="login">Girişe dön</a>
    </form>
    <form data-form="reset" hidden>
      <p class="auth-info">Yeni şifreni belirle.</p>
      <div class="field"><label>Yeni Şifre</label><input name="password" type="password" required minlength="6" autocomplete="new-password"></div>
      <button class="btn btn-primary" type="submit"><i class="fa-solid fa-key"></i> Şifreyi Kaydet</button>
    </form>
    <form data-form="nick" hidden>
      <p class="auth-info">Son adım! Hesabına Minecraft nickini bağla. Satın aldıkların bu nicke teslim edilir.</p>
      <div class="field"><label>Minecraft Nick</label><input name="nick" required maxlength="16" pattern="[A-Za-z0-9_]{3,16}" placeholder="Syfiel_PVPer"></div>
      <button class="btn btn-primary" type="submit"><i class="fa-solid fa-link"></i> Nicki Bağla</button>
    </form>
    <div class="form-msg" data-msg></div>
  </div>`;
document.body.append(modal);
const msgEl = modal.querySelector<HTMLElement>("[data-msg]")!;

function setMsg(text = "", ok = false) {
  msgEl.className = "form-msg" + (text ? (ok ? " ok" : " err") : "");
  msgEl.textContent = text;
}
function showForm(name: string) {
  modal.querySelectorAll<HTMLFormElement>("form").forEach((f) => (f.hidden = f.dataset.form !== name));
  modal.querySelectorAll<HTMLButtonElement>(".auth-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  (modal.querySelector(".auth-tabs") as HTMLElement).style.display = name === "login" || name === "signup" ? "" : "none";
  setMsg();
}
function openAuth(form = "login") {
  showForm(form);
  modal.classList.add("open");
  setTimeout(() => modal.querySelector<HTMLInputElement>(`form[data-form="${form}"] input`)?.focus(), 50);
}
function closeAuth() { modal.classList.remove("open"); }

modal.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  if (t === modal || t.closest(".auth-close")) closeAuth();
  const tab = t.closest<HTMLElement>("[data-tab]");
  if (tab) showForm(tab.dataset.tab!);
  const go = t.closest<HTMLElement>("[data-go]");
  if (go) { e.preventDefault(); showForm(go.dataset.go!); }
});
addEventListener("keydown", (e) => e.key === "Escape" && closeAuth());

async function busy(form: HTMLFormElement, fn: () => Promise<void>) {
  const btn = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Bekle...';
  setMsg();
  try { await fn(); } catch (err) { setMsg(authMessage(err)); } finally { btn.disabled = false; btn.innerHTML = html; }
}

modal.querySelectorAll<HTMLFormElement>("form").forEach((form) =>
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const d = Object.fromEntries(new FormData(form)) as Record<string, string>;
    busy(form, async () => {
      switch (form.dataset.form) {
        case "login": {
          await login(d.email.trim(), d.password);
          await afterLogin();
          break;
        }
        case "signup": {
          if (!/^[A-Za-z0-9_]{3,16}$/.test(d.nick)) throw new Error("Minecraft nicki 3-16 karakter olmalı (harf, rakam, _).");
          localStorage.setItem("syf_pending_nick", d.nick.trim());
          const u = await signup(d.email.trim(), d.password, { full_name: d.nick.trim() });
          if (u.emailVerified) await afterLogin();
          else { showForm("login"); setMsg("📧 Kayıt alındı! E-postana gelen onay bağlantısına tıkla, sonra giriş yap.", true); }
          break;
        }
        case "forgot": {
          await requestPasswordRecovery(d.email.trim());
          setMsg("📧 Sıfırlama bağlantısı gönderildi, e-postanı kontrol et.", true);
          break;
        }
        case "reset": {
          await updateUser({ password: d.password });
          toast("🔑 Şifren güncellendi!");
          await afterLogin();
          break;
        }
        case "nick": {
          await api("/api/me", { method: "POST", body: { nick: d.nick.trim() } });
          localStorage.removeItem("syf_pending_nick");
          await refresh();
          closeAuth();
          toast("✅ Nick bağlandı, hoş geldin " + d.nick + "!");
          break;
        }
      }
    });
  })
);

/* ---------- Durum ---------- */
async function refresh() {
  state.user = await getUser();
  state.me = null;
  if (state.user) {
    try { state.me = await api("/api/me"); } catch { state.me = null; }
  }
  renderNav();
  dispatchEvent(new CustomEvent("syf:auth", { detail: state }));
  return state;
}

async function afterLogin() {
  await refresh();
  if (state.me && !state.me.account) {
    const pending = localStorage.getItem("syf_pending_nick");
    if (pending) {
      try {
        await api("/api/me", { method: "POST", body: { nick: pending } });
        localStorage.removeItem("syf_pending_nick");
        await refresh();
      } catch (err) {
        openAuth("nick");
        setMsg((err as Error).message);
        return;
      }
    } else {
      openAuth("nick");
      return;
    }
  }
  closeAuth();
  toast("👋 Hoş geldin " + (state.me?.account?.nick || "") + "!");
}

function renderNav() {
  const cta = document.querySelector(".nav-cta");
  if (!cta) return;
  let slot = cta.querySelector<HTMLElement>(".nav-account");
  if (!slot) {
    slot = document.createElement("div");
    slot.className = "nav-account";
    cta.prepend(slot);
  }
  const acc = state.me?.account;
  if (!state.user) {
    slot.innerHTML = `<button class="btn btn-ghost btn-sm" data-auth-open><i class="fa-solid fa-user"></i> <span>Giriş Yap</span></button>`;
  } else {
    const nick = acc?.nick || state.user.email;
    slot.innerHTML = `
      <button class="acc-chip" data-acc-toggle>
        ${acc ? `<img src="https://mc-heads.net/avatar/${encodeURIComponent(acc.nick)}/28" alt="">` : '<i class="fa-solid fa-user"></i>'}
        <span class="acc-name">${esc(nick)}</span>
        ${acc ? `<span class="acc-credits"><i class="fa-solid fa-coins"></i> ${acc.credits}</span>` : ""}
      </button>
      <div class="acc-menu">
        <a href="/hesap"><i class="fa-solid fa-id-card"></i> Hesabım</a>
        <a href="/hesap#kredi"><i class="fa-solid fa-coins"></i> Kredi Yükle</a>
        ${state.me?.admin ? '<a href="/admin"><i class="fa-solid fa-screwdriver-wrench"></i> Admin Paneli</a>' : ""}
        <button data-logout><i class="fa-solid fa-right-from-bracket"></i> Çıkış Yap</button>
      </div>`;
  }
}

document.addEventListener("click", async (e) => {
  const t = e.target as HTMLElement;
  if (t.closest("[data-auth-open]")) { e.preventDefault(); openAuth((t.closest("[data-auth-open]") as HTMLElement).dataset.authOpen || "login"); }
  const toggle = t.closest("[data-acc-toggle]");
  document.querySelectorAll(".nav-account.open").forEach((n) => { if (!toggle || !n.contains(toggle)) n.classList.remove("open"); });
  if (toggle) toggle.parentElement!.classList.toggle("open");
  if (t.closest("[data-logout]")) {
    await logout().catch(() => {});
    await refresh();
    toast("👋 Çıkış yapıldı.");
    if (/^\/(hesap|admin)/.test(location.pathname)) location.href = "/";
  }

  // Mağaza: krediyle satın al
  const buy = t.closest<HTMLElement>("[data-buy]");
  if (buy) {
    e.preventDefault();
    if (!state.user) return openAuth("login");
    if (!state.me?.account) return openAuth("nick");
    const name = buy.dataset.name || "ürün";
    const price = buy.dataset.price;
    if (!confirm(`${name} için ${price} kredi harcanacak. Onaylıyor musun?`)) return;
    buy.setAttribute("disabled", "");
    try {
      const r = await api("/api/shop", { method: "POST", body: { productId: buy.dataset.buy } });
      toast(`🎉 ${name} satın alındı! Kalan bakiye: ${r.credits} kredi`);
      await refresh();
    } catch (err: any) {
      toast("⚠️ " + err.message);
      if (err.status === 402 && confirm("Bakiyen yetersiz. Kredi yükleme sayfasına gitmek ister misin?")) location.href = "/hesap#kredi";
    } finally { buy.removeAttribute("disabled"); }
  }

  // Kredi paketi satın al (Stripe)
  const pack = t.closest<HTMLElement>("[data-pack]");
  if (pack) {
    e.preventDefault();
    if (!state.user) return openAuth("login");
    if (!state.me?.account) return openAuth("nick");
    pack.setAttribute("disabled", "");
    try {
      const r = await api("/api/payments/checkout", { method: "POST", body: { packId: pack.dataset.pack } });
      location.href = r.url;
    } catch (err: any) {
      toast("⚠️ " + err.message);
      pack.removeAttribute("disabled");
    }
  }
});

/* ---------- Başlat ---------- */
(window as any).Syf = { state, api, esc, refresh, openAuth, closeAuth };

(async () => {
  try {
    const cb = await handleAuthCallback();
    if (cb?.type === "recovery") { await refresh(); openAuth("reset"); return; }
    if (cb?.type === "confirmation" || cb?.type === "oauth") { history.replaceState(null, "", location.pathname + location.search); await afterLogin(); return; }
  } catch (err) {
    toast("⚠️ " + authMessage(err));
  }
  await refresh();
  if (state.user && state.me && !state.me.account) openAuth("nick");
})();

onAuthChange(() => { refresh(); });
