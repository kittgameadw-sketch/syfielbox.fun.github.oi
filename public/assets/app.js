/* =========================================================
   SYFIELBOX.FUN — Ortak site scripti
   ========================================================= */
const SITE = {
  ip: "Syfielbox.fun",
  discord: "https://discord.gg/syfielbox",
};

/* ---------- Navbar & Footer ---------- */
const NAV_LINKS = [
  { href: "/", label: "Anasayfa", icon: "fa-house" },
  { href: "/magaza", label: "Mağaza", icon: "fa-store" },
  { href: "/kurallar", label: "Kurallar", icon: "fa-scroll" },
  { href: "/basvuru", label: "Başvuru", icon: "fa-user-shield" },
];

function currentPath() {
  const p = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/");
  return p === "" ? "/" : p;
}

function renderChrome() {
  const path = currentPath();
  const header = document.createElement("header");
  header.className = "nav";
  header.innerHTML = `
    <a href="/" class="brand"><img src="/logo.png?v=3" alt="Syfielbox logosu"><span>SYFIELBOX<b>.FUN</b></span></a>
    <nav class="nav-links" id="navLinks">
      ${NAV_LINKS.map(
        (l) => `<a href="${l.href}" class="${path === l.href ? "active" : ""}"><i class="fa-solid ${l.icon}"></i> ${l.label}</a>`
      ).join("")}
    </nav>
    <div class="nav-cta">
      <a class="btn btn-discord btn-sm" href="${SITE.discord}" target="_blank" rel="noopener"><i class="fa-brands fa-discord"></i><span>Discord</span></a>
      <button class="menu-btn" id="menuBtn" aria-label="Menüyü aç"><i class="fa-solid fa-bars"></i></button>
    </div>`;
  document.body.prepend(header);

  const footer = document.createElement("footer");
  footer.innerHTML = `
    <div class="container foot">
      <a href="/" class="brand"><img src="/logo.png?v=3" alt=""><span>SYFIELBOX<b>.FUN</b></span></a>
      <div class="foot-links">
        ${NAV_LINKS.map((l) => `<a href="${l.href}">${l.label}</a>`).join("")}
        <a href="${SITE.discord}" target="_blank" rel="noopener">Discord</a>
      </div>
      <p>&copy; ${new Date().getFullYear()} Syfielbox.Fun — Mojang veya Microsoft ile bağlantılı değildir.</p>
    </div>`;
  document.body.append(footer);

  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  const snow = document.createElement("canvas");
  snow.id = "snow";
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.id = "toast";
  document.body.append(backdrop, snow, toast);

  document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("navLinks").classList.toggle("open");
  });
}

/* ---------- Yardımcılar ---------- */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("show"), 2600);
}

async function copyIp() {
  try {
    await navigator.clipboard.writeText(SITE.ip);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = SITE.ip;
    document.body.append(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  showToast("⚡ IP kopyalandı: " + SITE.ip);
}
window.copyIp = copyIp;
window.showToast = showToast;

/* ---------- Kar taneleri ---------- */
function startSnow() {
  const c = document.getElementById("snow");
  const ctx = c.getContext("2d");
  let w, h, flakes;
  const resize = () => {
    w = c.width = innerWidth;
    h = c.height = innerHeight;
    const n = Math.min(90, Math.floor(w / 18));
    flakes = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.8 + 0.4,
      s: Math.random() * 0.5 + 0.2,
      d: Math.random() * Math.PI * 2,
      o: Math.random() * 0.5 + 0.2,
    }));
  };
  resize();
  addEventListener("resize", resize);
  (function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      f.y += f.s;
      f.d += 0.01;
      f.x += Math.sin(f.d) * 0.3;
      if (f.y > h + 5) { f.y = -5; f.x = Math.random() * w; }
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(207, 250, 254, ${f.o})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  })();
}

/* ---------- Scroll animasyonları ---------- */
function startReveal() {
  // Otomatik efekt türleri
  document.querySelectorAll(".section-head.reveal, .page-hero .container").forEach((el) => { el.classList.add("reveal", "fx-blur"); });
  document.querySelectorAll(".stats-bar.reveal, .cta.reveal").forEach((el) => el.classList.add("fx-zoom"));
  document.querySelectorAll(".steps .reveal").forEach((el, i) => el.classList.add(i % 2 ? "fx-right" : "fx-left"));
  document.querySelectorAll(".rule-group.reveal, .role.reveal").forEach((el) => el.classList.add("fx-left"));
  document.querySelectorAll(".product.reveal, .feature.reveal, .donor.reveal, .news.reveal").forEach((el) => el.classList.add("fx-flip"));

  // Aynı gruptaki kartlar sırayla gelsin
  const groups = new Map();
  document.querySelectorAll(".reveal").forEach((el) => {
    const k = el.parentElement;
    const i = groups.get(k) || 0;
    groups.set(k, i + 1);
    el.style.setProperty("--d", Math.min(i, 6) * 0.09 + "s");
  });

  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
        // Animasyon bitince gecikmeyi kaldır ki hover efekti gecikmesin
        setTimeout(() => e.target.classList.add("done"), 1400);
      }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

/* ---------- Kaydırma: ilerleme çubuğu, paralaks, yukarı çık ---------- */
function startScrollFx() {
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  const top = document.createElement("button");
  top.className = "to-top";
  top.setAttribute("aria-label", "Yukarı çık");
  top.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  top.onclick = () => scrollTo({ top: 0, behavior: "smooth" });
  document.body.append(bar, top);

  const heroArt = document.querySelector(".hero-art");
  const heroText = document.querySelector(".hero-inner > div:first-child");
  const hint = document.querySelector(".scroll-hint");
  let ticking = false;
  const update = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    top.classList.toggle("show", y > 500);
    document.querySelector(".nav")?.classList.toggle("scrolled", y > 20);
    if (y < innerHeight * 1.2) {
      if (heroArt) heroArt.style.transform = `translate3d(0, ${y * 0.25}px, 0)`;
      if (heroText) { heroText.style.transform = `translate3d(0, ${y * 0.12}px, 0)`; heroText.style.opacity = Math.max(0, 1 - y / 650); }
      if (hint) hint.style.opacity = Math.max(0, 1 - y / 200);
    }
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* ---------- Canlı sunucu & Discord durumu ---------- */
function setText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = value;
    el.classList.remove("skeleton");
  });
}

async function loadStatus() {
  if (!document.querySelector("[data-status]")) return;
  try {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error();
    const { server, discord } = await res.json();
    const fmt = (n) => (typeof n === "number" ? n.toLocaleString("tr-TR") : "—");

    setText("[data-status='players']", server.online ? fmt(server.players) : "0");
    setText("[data-status='max']", server.online ? fmt(server.max) : "—");
    const range = server.motd && server.motd.match(/\[\s*(\d[\d.]*\s*-\s*\d[\d.]*)\s*\]/);
    setText("[data-status='version']", range ? range[1].replace(/\s*-\s*/, "–") : server.version ? server.version.replace(/^.*?(\d)/, "$1") : "—");
    setText("[data-status='state']", server.online ? "Çevrimiçi" : "Çevrimdışı");
    setText("[data-status='dc-online']", fmt(discord.online));
    setText("[data-status='dc-members']", fmt(discord.members));
    document.querySelectorAll("[data-status='dot']").forEach((d) => {
      d.classList.remove("on", "off");
      d.classList.add(server.online ? "on" : "off");
    });
  } catch {
    setText("[data-status]:not([data-status='dot'])", "—");
  }
}

/* ---------- Başlat ---------- */
renderChrome();
startSnow();
startReveal();
startScrollFx();
loadStatus();
setInterval(loadStatus, 60000);

/* ---------- Açılış ekranı & logo 3D eğilme ---------- */
addEventListener("load", () => setTimeout(() => document.getElementById("preloader")?.classList.add("done"), 400));
setTimeout(() => document.getElementById("preloader")?.classList.add("done"), 3000);
(() => {
  const tilt = document.getElementById("logoTilt");
  if (!tilt) return;
  addEventListener("mousemove", (e) => {
    const x = (e.clientX / innerWidth - 0.5) * 2;
    const y = (e.clientY / innerHeight - 0.5) * 2;
    tilt.style.transform = `perspective(800px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
  });
})();

/* ---------- Tıklama animasyonu (buz kırılması) ---------- */
addEventListener("pointerdown", (e) => {
  clickBurst(e.clientX, e.clientY);

  const target = e.target.closest(".btn, .nav-links a, .tabs a");
  if (target) {
    const r = target.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const rp = document.createElement("span");
    rp.className = "ripple";
    rp.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    target.append(rp);
    setTimeout(() => rp.remove(), 650);
  }
});

/* ---------- Sayfa geçiş animasyonu ---------- */
(() => {
  const pt = document.createElement("div");
  pt.className = "page-transition";
  pt.innerHTML = '<div class="pt-layer"></div><div class="pt-layer"></div><img src="/logo.png?v=3" alt="">';
  document.body.append(pt);

  // Başka sayfadan geçişle gelindiyse perdeyi aç
  if (sessionStorage.getItem("pt") === "1") {
    sessionStorage.removeItem("pt");
    document.getElementById("preloader")?.remove();
    pt.classList.add("in");
    setTimeout(() => pt.classList.remove("in"), 900);
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return; // aynı sayfadaki bölüme kaydırma
    if (url.pathname === location.pathname && url.search === location.search) return;
    e.preventDefault();
    sessionStorage.setItem("pt", "1");
    pt.classList.remove("in");
    pt.classList.add("out");
    setTimeout(() => (location.href = url.href), 600);
  });

  // Geri tuşuyla dönüldüğünde perdeyi temizle
  addEventListener("pageshow", (e) => { if (e.persisted) pt.classList.remove("out", "in"); });
})();

/* ---------- Gelişmiş tıklama efekti (canvas parçacıkları) ---------- */
const fxCanvas = document.createElement("canvas");
fxCanvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:300";
document.body.append(fxCanvas);
const fx = fxCanvas.getContext("2d");
const parts = [];
const waves = [];
let combo = 0, lastClick = 0, fxRunning = false;
const COLORS = ["#ffffff", "#cffafe", "#a5f3fc", "#22d3ee", "#2dd4bf", "#3b82f6"];
const FX_DPR = Math.min(devicePixelRatio || 1, 1.5);
const MAX_PARTS = 140;
function sizeFx() { fxCanvas.width = innerWidth * FX_DPR; fxCanvas.height = innerHeight * FX_DPR; fx.setTransform(FX_DPR, 0, 0, FX_DPR, 0, 0); }
sizeFx(); addEventListener("resize", sizeFx);

function clickBurst(x, y) {
  const now = performance.now();
  combo = now - lastClick < 600 ? Math.min(combo + 1, 6) : 0;
  lastClick = now;
  const power = 1 + combo * 0.25;

  // Şok dalgaları
  waves.push({ x, y, r: 4, max: 46 * power, life: 1, w: 3 });
  waves.push({ x, y, r: 2, max: 28 * power, life: 1, w: 1.5, delay: 14 });

  // Buz kristalleri (yerçekimiyle düşen)
  const n = Math.round(10 * power);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (1.2 + Math.random() * 2.6) * power;
    parts.push({ type: "shard", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, g: 0.07, size: 2 + Math.random() * 3.5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.15, life: 1, decay: 0.008 + Math.random() * 0.006, color: COLORS[(Math.random() * COLORS.length) | 0] });
  }
  // Dönen kar taneleri
  for (let i = 0; i < 2 + Math.ceil(combo / 2); i++) {
    const a = Math.random() * Math.PI * 2;
    parts.push({ type: "flake", x, y, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2 - 0.5, g: 0.012, size: 7 + Math.random() * 6, rot: 0, vr: (Math.random() - 0.5) * 0.06, life: 1, decay: 0.007, color: "#e0fbff" });
  }
  // Parıltılar
  for (let i = 0; i < 4 + combo; i++) {
    parts.push({ type: "spark", x: x + (Math.random() - 0.5) * 50 * power, y: y + (Math.random() - 0.5) * 50 * power, vx: 0, vy: -0.2, g: 0, size: 2 + Math.random() * 4, rot: 0, vr: 0, life: 1, decay: 0.014 + Math.random() * 0.01, delay: (Math.random() * 24) | 0, color: "#ffffff" });
  }
  // Kombo yazısı
  if (combo >= 2) parts.push({ type: "text", x, y: y - 20, vx: 0, vy: -0.55, g: 0, size: 14 + combo * 2, rot: 0, vr: 0, life: 1, decay: 0.01, text: "x" + (combo + 1) + " ❄", color: "#a5f3fc" });

  if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
}

function drawFlake(p) {
  fx.save(); fx.translate(p.x, p.y); fx.rotate(p.rot);
  fx.strokeStyle = p.color; fx.lineWidth = 1.4;
  fx.beginPath();
  for (let k = 0; k < 6; k++) {
    fx.rotate(Math.PI / 3);
    fx.moveTo(0, 0); fx.lineTo(0, -p.size);
    fx.moveTo(0, -p.size * 0.55); fx.lineTo(p.size * 0.28, -p.size * 0.8);
    fx.moveTo(0, -p.size * 0.55); fx.lineTo(-p.size * 0.28, -p.size * 0.8);
  }
  fx.stroke(); fx.restore();
}
function drawSpark(p) {
  const s = p.size * Math.sin(p.life * Math.PI);
  fx.save(); fx.translate(p.x, p.y); fx.fillStyle = p.color;
  fx.beginPath(); fx.moveTo(0, -s * 2); fx.quadraticCurveTo(0, 0, s * 2, 0); fx.quadraticCurveTo(0, 0, 0, s * 2); fx.quadraticCurveTo(0, 0, -s * 2, 0); fx.quadraticCurveTo(0, 0, 0, -s * 2); fx.fill(); fx.restore();
}

function fxLoop() {
  fx.clearRect(0, 0, innerWidth, innerHeight);
  fx.globalCompositeOperation = "lighter";
  if (parts.length > MAX_PARTS) parts.splice(0, parts.length - MAX_PARTS);
  if (waves.length > 12) waves.splice(0, waves.length - 12);
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    if (w.delay) { w.delay--; continue; }
    w.r += (w.max - w.r) * 0.07; w.life -= 0.02;
    if (w.life <= 0) { waves.splice(i, 1); continue; }
    fx.beginPath(); fx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    fx.strokeStyle = `rgba(34, 211, 238, ${w.life})`; fx.lineWidth = w.w * w.life + 1;
    fx.stroke();
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.delay) { p.delay--; continue; }
    p.vy += p.g; p.vx *= 0.985; p.vy *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    fx.globalAlpha = Math.max(0, p.life);
    if (p.type === "shard") {
      fx.save(); fx.translate(p.x, p.y); fx.rotate(p.rot); fx.fillStyle = p.color;
      fx.beginPath(); fx.moveTo(0, -p.size * 1.6); fx.lineTo(p.size * 0.7, 0); fx.lineTo(0, p.size * 1.6); fx.lineTo(-p.size * 0.7, 0); fx.closePath(); fx.fill(); fx.restore();
    } else if (p.type === "flake") drawFlake(p);
    else if (p.type === "spark") drawSpark(p);
    else if (p.type === "text") {
      fx.font = `700 ${p.size}px "Chakra Petch", sans-serif`; fx.textAlign = "center"; fx.fillStyle = p.color; fx.fillText(p.text, p.x, p.y);
    }
    fx.globalAlpha = 1;
  }
  if (parts.length || waves.length) requestAnimationFrame(fxLoop);
  else { fx.clearRect(0, 0, innerWidth, innerHeight); fxRunning = false; }
}
