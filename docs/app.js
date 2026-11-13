"use strict";

/* ---------- Utilities ---------- */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* Penyimpanan bisa diblokir di mode privat. Progres tetap jalan di sesi ini. */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {}
  }
};

let toastTimer = 0;

function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("is-visible"), 2400);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function formatNumber(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(value);
}

function formatEth(value) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 1e8) / 1e8;
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8
  }).format(rounded);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (fallbackError) {
      return false;
    }
  }
}

function tick() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

/* Tombol salin untuk blok kode. */
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy-target]");
  if (!button) return;
  const target = document.getElementById(button.dataset.copyTarget);
  if (!target) return;

  const original = button.textContent;
  const ok = await copyText(target.innerText || target.textContent || "");
  button.textContent = ok ? "Tersalin" : "Gagal";
  toast(ok ? "Kode disalin." : "Gagal menyalin kode.");
  window.setTimeout(() => { button.textContent = original; }, 1600);
});

/* ---------- SHA-256 ----------
   Implementasi sinkron untuk lab. Diuji dengan vektor "abc".
   Bukan untuk kriptografi produksi. */

const SHA256 = (() => {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  const rotr = (value, amount) => (value >>> amount) | (value << (32 - amount));

  return function sha256(message) {
    const bytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
    const bitLength = bytes.length * 8;
    const paddedLength = (((bytes.length + 9) + 63) >> 6) << 6;
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[bytes.length] = 0x80;

    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
    view.setUint32(paddedLength - 4, bitLength >>> 0, false);

    let h0 = 0x6a09e667;
    let h1 = 0xbb67ae85;
    let h2 = 0x3c6ef372;
    let h3 = 0xa54ff53a;
    let h4 = 0x510e527f;
    let h5 = 0x9b05688c;
    let h6 = 0x1f83d9ab;
    let h7 = 0x5be0cd19;

    const w = new Uint32Array(64);

    for (let offset = 0; offset < paddedLength; offset += 64) {
      for (let i = 0; i < 16; i += 1) {
        w[i] = view.getUint32(offset + i * 4, false);
      }
      for (let i = 16; i < 64; i += 1) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }

      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;
      let f = h5;
      let g = h6;
      let h = h7;

      for (let i = 0; i < 64; i += 1) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
      h5 = (h5 + f) >>> 0;
      h6 = (h6 + g) >>> 0;
      h7 = (h7 + h) >>> 0;
    }

    return [h0, h1, h2, h3, h4, h5, h6, h7].map((word) => word.toString(16).padStart(8, "0")).join("");
  };
})();

/* ---------- Tema ---------- */

(function initTheme() {
  const root = document.documentElement;
  const button = $("#theme-toggle");
  const label = $("#theme-label");
  if (!button || !label) return;

  const apply = (theme, persist) => {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    root.style.colorScheme = theme;
    label.textContent = theme === "dark" ? "Mode terang" : "Mode gelap";
    button.setAttribute("aria-label", theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap");
    if (persist) store.set("bukubesar.theme", theme);
  };

  const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  apply(current, false);

  button.addEventListener("click", () => {
    apply(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
  });
})();

/* ---------- Navigasi mobile ---------- */

(function initMobileNav() {
  const sidebar = $("#sidebar");
  const toggle = $("#menu-toggle");
  const scrim = $("[data-close-nav]");
  if (!sidebar || !toggle || !scrim) return;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "icon-btn sidebar-close";
  closeButton.setAttribute("aria-label", "Tutup daftar bab");
  closeButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.6"></path></svg>';
  sidebar.prepend(closeButton);

  const isOpen = () => document.body.dataset.navOpen === "true";
  const mobileQuery = window.matchMedia("(max-width: 980px)");

  const syncInert = () => {
    sidebar.inert = mobileQuery.matches && !isOpen();
  };

  syncInert();

  const open = () => {
    document.body.dataset.navOpen = "true";
    toggle.setAttribute("aria-expanded", "true");
    sidebar.inert = false;
    closeButton.focus();
  };

  const close = (returnFocus = true) => {
    document.body.dataset.navOpen = "false";
    toggle.setAttribute("aria-expanded", "false");
    sidebar.inert = mobileQuery.matches;
    if (returnFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => (isOpen() ? close() : open()));
  closeButton.addEventListener("click", () => close());
  scrim.addEventListener("click", () => close());

  sidebar.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !window.matchMedia("(max-width: 980px)").matches) return;
    const id = (link.getAttribute("href") || "").slice(1);
    close(false);
    const target = id ? document.getElementById(id) : null;
    const heading = target ? target.querySelector("h1, h2") : null;
    if (heading) {
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      window.setTimeout(() => heading.focus({ preventScroll: true }), 0);
    }
  });

  sidebar.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = $$("a[href], button:not([disabled])", sidebar).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const onViewportChange = () => {
    if (mobileQuery.matches) {
      sidebar.inert = !isOpen();
    } else {
      if (isOpen()) close(false);
      sidebar.inert = false;
      document.body.dataset.navOpen = "false";
    }
  };

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", onViewportChange);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(onViewportChange);
  }
  window.addEventListener("resize", onViewportChange);
})();

/* ---------- Pencarian ---------- */

(function initSearch() {
  const input = $("#search-input");
  const panel = $("#search-results");
  const wrapper = input ? input.closest(".search") : null;
  if (!input || !panel || !wrapper) return;

  const sections = $$("main section[data-title]");
  const index = sections.map((section) => {
    const mark = $(".chapter-mark", section);
    const title = section.dataset.title || (($("h1, h2", section) || {}).textContent || "Materi");
    return {
      id: section.id,
      title: title.trim(),
      mark: mark ? mark.textContent.trim() : "Orientasi",
      text: section.textContent.replace(/\s+/g, " ").trim()
    };
  });

  const close = () => {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
  };

  const makeSnippet = (text, position, term) => {
    const start = Math.max(0, position - 44);
    const raw = text.slice(start, start + 150).trim();
    const prefix = start > 0 ? "..." : "";
    const suffix = start + 150 < text.length ? "..." : "";
    const safe = escapeHtml(prefix + raw + suffix);
    const escapedTerm = escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safe.replace(new RegExp(escapedTerm, "gi"), (match) => "<mark>" + match + "</mark>");
  };

  const render = () => {
    const term = input.value.trim();
    if (term.length < 2) {
      close();
      return;
    }

    const lower = term.toLowerCase();
    const matches = [];

    for (const entry of index) {
      const position = entry.text.toLowerCase().indexOf(lower);
      if (position === -1) continue;
      matches.push({
        entry,
        position,
        snippet: makeSnippet(entry.text, position, term)
      });
      if (matches.length >= 8) break;
    }

    if (!matches.length) {
      panel.innerHTML = '<p class="search-empty">Tidak ada hasil untuk "' + escapeHtml(term) + '". Coba kata lain seperti "gas", "wallet", atau "konsensus".</p>';
    } else {
      panel.innerHTML = '<ul>' + matches.map((match) => {
        return '<li><a href="#' + match.entry.id + '">' +
          '<span class="result-chapter">' + escapeHtml(match.entry.mark) + "</span>" +
          '<span class="result-title">' + escapeHtml(match.entry.title) + "</span>" +
          '<span class="result-snippet">' + match.snippet + "</span>" +
          "</a></li>";
      }).join("") + "</ul>";
    }

    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  input.addEventListener("input", render);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      const first = $("a", panel);
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  panel.addEventListener("keydown", (event) => {
    const links = $$("a", panel);
    const current = links.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      input.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      (links[current + 1] || links[0]).focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      (links[current - 1] || links[links.length - 1]).focus();
    }
  });

  panel.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    const id = (link.getAttribute("href") || "").slice(1);
    close();
    input.value = "";

    const target = id ? document.getElementById(id) : null;
    const heading = target ? target.querySelector("h1, h2") : null;
    if (heading) {
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      window.setTimeout(() => heading.focus({ preventScroll: true }), 0);
    }
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) close();
  });
})();

/* ---------- Progres dan akhir bab ---------- */

const progressState = {
  key: "bukubesar.progress.v1",
  tracked: $$('main section[data-track="true"]'),
  done: new Set()
};

(function initProgress() {
  const saved = store.get(progressState.key, []);
  if (Array.isArray(saved)) {
    saved.forEach((id) => progressState.done.add(String(id)));
  }

  const bestQuiz = Number(store.get("bukubesar.quiz.v1", 0)) || 0;
  if (bestQuiz >= 12) progressState.done.add("uji");

  const navItems = $$(".nav-link").map((link) => ({
    id: link.dataset.nav,
    link,
    el: document.getElementById(link.dataset.nav)
  })).filter((item) => item.el);

  const order = navItems.map((item) => ({
    id: item.el.id,
    title: item.el.dataset.title || item.link.textContent.trim()
  }));

  const render = () => {
    const total = progressState.tracked.length;
    const count = progressState.tracked.filter((section) => progressState.done.has(section.dataset.chapter)).length;
    const percent = total ? Math.round((count / total) * 100) : 0;

    const text = $("#progress-text");
    const fill = $("#progress-fill");
    const track = $("#progress-track");
    if (text) text.textContent = count + " dari " + total;
    if (fill) fill.style.width = percent + "%";
    if (track) {
      track.setAttribute("aria-valuemax", String(total));
      track.setAttribute("aria-valuenow", String(count));
      track.setAttribute("aria-valuetext", count + " dari " + total + " bab selesai");
    }

    $$(".nav-link").forEach((link) => {
      link.classList.toggle("is-done", progressState.done.has(link.dataset.nav));
    });

    $$("[data-complete]").forEach((button) => {
      const done = progressState.done.has(button.dataset.complete);
      button.setAttribute("aria-pressed", done ? "true" : "false");
      const label = $(".complete-text", button);
      if (label) label.textContent = done ? "Selesai, klik untuk batalkan" : "Tandai bab selesai";
    });
  };

  const setDone = (id, done, announce) => {
    if (done) progressState.done.add(id);
    else progressState.done.delete(id);
    store.set(progressState.key, Array.from(progressState.done));
    render();
    if (announce) toast(done ? "Bab ditandai selesai." : "Tanda selesai dibatalkan.");
  };

  for (const section of progressState.tracked) {
    const host = $("[data-chapter-end]", section);
    if (!host) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "complete-btn";
    button.dataset.complete = section.dataset.chapter;
    button.innerHTML = '<span class="box" aria-hidden="true"></span><span class="complete-text">Tandai bab selesai</span>';
    button.addEventListener("click", () => {
      const done = !progressState.done.has(section.dataset.chapter);
      setDone(section.dataset.chapter, done, true);
    });
    host.appendChild(button);

    const position = order.findIndex((item) => item.id === section.id);
    const previous = position > 0 ? order[position - 1] : null;
    const next = position >= 0 && position < order.length - 1 ? order[position + 1] : null;

    const links = document.createElement("div");
    links.className = "chapter-links";

    if (previous) {
      const a = document.createElement("a");
      a.className = "prev";
      a.href = "#" + previous.id;
      a.innerHTML = '<span class="dir">Sebelumnya</span><span class="name">' + escapeHtml(previous.title) + "</span>";
      links.appendChild(a);
    } else {
      links.appendChild(document.createElement("span"));
    }

    if (next) {
      const a = document.createElement("a");
      a.className = "next";
      a.href = "#" + next.id;
      a.innerHTML = '<span class="dir">Berikutnya</span><span class="name">' + escapeHtml(next.title) + "</span>";
      links.appendChild(a);
    } else {
      links.appendChild(document.createElement("span"));
    }

    host.appendChild(links);
  }

  render();
  window.setProgressDone = setDone;
  window.getProgressDone = () => progressState.done;
})();

/* ---------- TOC dan navigasi aktif ---------- */

(function initNavigation() {
  const navLinks = $$(".nav-link");
  const navItems = navLinks.map((link) => ({
    link,
    el: document.getElementById(link.dataset.nav)
  })).filter((item) => item.el);

  const tocNav = $("#toc-nav");
  let activeSection = null;
  let tocLinks = [];

  const slug = (text, fallback) => {
    const value = String(text).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return value || fallback;
  };

  const renderToc = (section) => {
    if (!tocNav) return;
    tocNav.innerHTML = "";
    tocLinks = [];

    const headings = $$("h3", section).length ? $$("h3", section) : $$("h2", section);
    if (!headings.length) {
      tocNav.innerHTML = '<span class="toc-empty">Tidak ada subbagian di sini.</span>';
      return;
    }

    headings.forEach((heading, index) => {
      if (!heading.id) {
        heading.id = slug(heading.textContent, section.id + "-bagian-" + (index + 1));
      }
      const link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent.replace(/\s+/g, " ").trim();
      link.dataset.target = heading.id;
      tocNav.appendChild(link);
      tocLinks.push({ link, heading });
    });
  };

  const updateTocActive = () => {
    if (!tocLinks.length) return;
    const headerHeight = ($(".site-header") || {}).offsetHeight || 0;
    const limit = headerHeight + 80;
    let current = null;

    for (const item of tocLinks) {
      if (item.heading.getBoundingClientRect().top <= limit) current = item.link;
    }

    tocLinks.forEach((item) => item.link.classList.toggle("is-active", item.link === current));
  };

  const update = () => {
    if (!navItems.length) return;
    const headerHeight = ($(".site-header") || {}).offsetHeight || 0;
    const limit = headerHeight + 92;
    let current = navItems[0];

    for (const item of navItems) {
      if (item.el.getBoundingClientRect().top <= limit) current = item;
    }

    navLinks.forEach((link) => {
      if (link === current.link) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });

    if (activeSection !== current.el) {
      activeSection = current.el;
      renderToc(activeSection);
    }

    updateTocActive();
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("hashchange", schedule);
  update();
})();

(function initHashLanding() {
  if (!window.location.hash) return;

  const jump = () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (!target) return;

    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    const padding = parseFloat(window.getComputedStyle(root).scrollPaddingTop) || 92;
    const top = target.getBoundingClientRect().top + window.scrollY - padding;
    window.scrollTo(0, Math.max(0, top));
    root.style.scrollBehavior = previous;
  };

  window.addEventListener("load", () => {
    jump();
    window.setTimeout(jump, 120);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => window.setTimeout(jump, 0));
  }
})();

/* ---------- Lab hash ---------- */

(function initHashLabs() {
  const heroInput = $("#hero-hash-input");
  const heroOutput = $("#hero-hash-output");
  const heroMutate = $("#hero-hash-mutate");
  const heroCopy = $("#hero-hash-copy");

  const renderHero = () => {
    if (!heroInput || !heroOutput) return;
    const hash = SHA256(heroInput.value);
    heroOutput.innerHTML = '<span class="hash-label">Hasil hash</span>' + hash;
  };

  if (heroInput) {
    heroInput.addEventListener("input", renderHero);
    renderHero();
  }

  if (heroMutate && heroInput) {
    heroMutate.addEventListener("click", () => {
      heroInput.value = heroInput.value.endsWith("!") ? heroInput.value.slice(0, -1) : heroInput.value + "!";
      renderHero();
    });
  }

  if (heroCopy && heroInput) {
    heroCopy.addEventListener("click", async () => {
      const ok = await copyText(SHA256(heroInput.value));
      toast(ok ? "Hash disalin." : "Gagal menyalin hash.");
    });
  }

  const input = $("#hash-input");
  const output = $("#hash-output");
  const mutate = $("#hash-mutate");
  const reset = $("#hash-reset");
  const compare = $("#hash-compare");
  const beforeEl = $("#hash-before");
  const afterEl = $("#hash-after");
  const diffEl = $("#hash-diff");
  if (!input || !output) return;

  const EXAMPLE = "Blockchain adalah buku besar bersama";

  const render = () => {
    const hash = SHA256(input.value);
    output.textContent = "SHA-256:\n" + hash + "\n\n64 karakter heksadesimal, 256 bit.";
    return hash;
  };

  input.addEventListener("input", () => {
    render();
    if (compare) compare.hidden = true;
  });

  if (mutate) {
    mutate.addEventListener("click", () => {
      const original = input.value || EXAMPLE;
      const before = SHA256(original);
      const changed = original.endsWith("!") ? original.slice(0, -1) : original + "!";
      input.value = changed;
      const after = SHA256(changed);
      const different = before.split("").filter((char, index) => char !== after[index]).length;

      render();
      if (compare && beforeEl && afterEl && diffEl) {
        compare.hidden = false;
        beforeEl.textContent = "Sebelum:\n" + before;
        afterEl.textContent = "Sesudah:\n" + after;
        diffEl.textContent = different + " dari 64 karakter heksadesimal berubah. Satu karakter input, hampir separuh sidik jari berubah.";
      }
    });
  }

  if (reset) {
    reset.addEventListener("click", () => {
      input.value = EXAMPLE;
      render();
      if (compare) compare.hidden = true;
    });
  }

  render();
})();

/* ---------- Lab kunci dan signature ---------- */

const demoCrypto = {
  pair: null,
  publicJwk: null,
  privateJwk: null,
  signature: null,
  signedMessage: "",
  onKeyChange: null
};

(function initKeyLab() {
  const generate = $("#key-generate");
  const clear = $("#key-clear");
  const status = $("#key-status");
  const output = $("#key-output");
  const publicEl = $("#key-public");
  const fingerprintEl = $("#key-fingerprint");
  const privateToggle = $("#key-private-toggle");
  const privateEl = $("#key-private");
  if (!generate || !status || !output) return;

  const setStatus = (message, kind) => {
    status.textContent = message;
    status.className = "status" + (kind ? " " + kind : "");
  };

  generate.addEventListener("click", async () => {
    if (!window.crypto || !window.crypto.subtle) {
      setStatus("Web Crypto API tidak tersedia di browser ini. Coba browser modern lain atau akses lewat https.", "is-bad");
      return;
    }

    generate.disabled = true;
    setStatus("Membuat pasangan kunci di memori tab ini...", "is-wait");

    try {
      const pair = await window.crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
      );
      const publicJwk = await window.crypto.subtle.exportKey("jwk", pair.publicKey);
      const privateJwk = await window.crypto.subtle.exportKey("jwk", pair.privateKey);

      demoCrypto.pair = pair;
      demoCrypto.publicJwk = publicJwk;
      demoCrypto.privateJwk = privateJwk;
      demoCrypto.signature = null;
      demoCrypto.signedMessage = "";

      if (publicEl) {
        publicEl.textContent = "Public key (P-256):\ncurve: " + publicJwk.crv + "\nx: " + publicJwk.x + "\ny: " + publicJwk.y;
      }

      if (fingerprintEl) {
        const digest = SHA256(JSON.stringify(publicJwk));
        const grouped = digest.match(/.{1,4}/g).join(" ");
        fingerprintEl.textContent = "Fingerprint SHA-256(public key):\n" + grouped;
      }

      if (privateEl) {
        privateEl.textContent = "d (private key demo, base64url):\n" + privateJwk.d + "\n\nHanya untuk latihan. Jangan pernah memakai kunci ini untuk dana.";
        privateEl.hidden = true;
      }

      if (privateToggle) {
        privateToggle.setAttribute("aria-expanded", "false");
        privateToggle.textContent = "Tampilkan private key demo";
      }

      output.hidden = false;

      if (typeof demoCrypto.onKeyChange === "function") demoCrypto.onKeyChange();
      setStatus("Pasangan kunci dibuat. Public key aman dibagikan, private key tidak. Kunci ini hanya hidup di memori tab.", "is-good");
    } catch (error) {
      setStatus("Gagal membuat kunci: " + (error.message || error), "is-bad");
    } finally {
      generate.disabled = false;
    }
  });

  if (clear) {
    clear.addEventListener("click", () => {
      demoCrypto.pair = null;
      demoCrypto.publicJwk = null;
      demoCrypto.privateJwk = null;
      demoCrypto.signature = null;
      demoCrypto.signedMessage = "";
      output.hidden = true;
      if (publicEl) publicEl.textContent = "";
      if (fingerprintEl) fingerprintEl.textContent = "";
      if (privateEl) {
        privateEl.hidden = true;
        privateEl.textContent = "";
      }
      if (privateToggle) {
        privateToggle.setAttribute("aria-expanded", "false");
        privateToggle.textContent = "Tampilkan private key demo";
      }
      if (typeof demoCrypto.onKeyChange === "function") demoCrypto.onKeyChange();
      setStatus("Kunci dihapus dari memori tab. Signature yang dibuat sebelumnya tidak bisa diverifikasi lagi.", "is-wait");
    });
  }

  if (privateToggle && privateEl) {
    privateToggle.addEventListener("click", () => {
      const show = privateEl.hidden;
      privateEl.hidden = !show;
      privateToggle.setAttribute("aria-expanded", show ? "true" : "false");
      privateToggle.textContent = show ? "Sembunyikan private key demo" : "Tampilkan private key demo";
    });
  }
})();

(function initSignatureLab() {
  const signButton = $("#sig-sign");
  const verifyButton = $("#sig-verify");
  const tamperButton = $("#sig-tamper");
  const message = $("#sig-message");
  const status = $("#sig-status");
  const output = $("#sig-output");
  const verifyOutput = $("#sig-verify-output");
  if (!signButton || !message || !status) return;

  const setStatus = (text, kind) => {
    status.textContent = text;
    status.className = "status" + (kind ? " " + kind : "");
  };

  const bytesToBase64 = (bytes) => {
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  };

  const reset = () => {
    demoCrypto.signature = null;
    demoCrypto.signedMessage = "";
    output.textContent = "";
    verifyOutput.textContent = "";
  };

  demoCrypto.onKeyChange = () => {
    reset();
    if (demoCrypto.pair) {
      setStatus("Kunci demo baru siap. Tandatangani pesan untuk memulai.", "is-wait");
    } else {
      setStatus("Belum ada kunci. Buat kunci di Lab 02.", "is-bad");
    }
  };

  signButton.addEventListener("click", async () => {
    if (!demoCrypto.pair) {
      status.innerHTML = 'Belum ada kunci. Buat dulu di <a href="#lab-kunci">Lab 02</a>.';
      status.className = "status is-bad";
      return;
    }

    try {
      setStatus("Menandatangani pesan...", "is-wait");
      const data = new TextEncoder().encode(message.value);
      const signature = await window.crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        demoCrypto.pair.privateKey,
        data
      );

      demoCrypto.signature = signature;
      demoCrypto.signedMessage = message.value;

      output.textContent = "Signature (base64):\n" + bytesToBase64(new Uint8Array(signature)) + "\n\nDibuat dengan private key demo. Private key tidak ditampilkan di sini.";
      verifyOutput.textContent = "";
      setStatus("Pesan ditandatangani. Sekarang coba verifikasi, lalu ubah pesan dan verifikasi lagi.", "is-good");
    } catch (error) {
      setStatus("Gagal menandatangani: " + (error.message || error), "is-bad");
    }
  });

  verifyButton.addEventListener("click", async () => {
    if (!demoCrypto.pair) {
      status.innerHTML = 'Belum ada kunci. Buat dulu di <a href="#lab-kunci">Lab 02</a>.';
      status.className = "status is-bad";
      return;
    }
    if (!demoCrypto.signature) {
      setStatus("Belum ada signature. Tekan Tandatangani pesan dulu.", "is-bad");
      return;
    }

    try {
      const data = new TextEncoder().encode(message.value);
      const valid = await window.crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        demoCrypto.pair.publicKey,
        demoCrypto.signature,
        data
      );

      if (valid) {
        verifyOutput.textContent = "Verifikasi berhasil: signature cocok dengan pesan saat ini dan public key demo.";
        setStatus("Signature valid.", "is-good");
      } else {
        verifyOutput.textContent = "Verifikasi gagal. Pesan sudah berubah sejak ditandatangani, atau signature dibuat oleh kunci lain.";
        setStatus("Signature tidak valid untuk pesan ini.", "is-bad");
      }
    } catch (error) {
      setStatus("Gagal memverifikasi: " + (error.message || error), "is-bad");
    }
  });

  if (tamperButton) {
    tamperButton.addEventListener("click", () => {
      message.value = message.value + " [diubah]";
      message.focus();
      verifyOutput.textContent = "";
      setStatus("Pesan diubah. Tekan Verifikasi untuk melihat signature gagal.", "is-wait");
    });
  }

  if (!demoCrypto.pair) {
    setStatus("Belum ada kunci. Buat dulu di Lab 02, lalu kembali ke sini.", "is-bad");
  }
})();

/* ---------- Lab jaringan ---------- */

(function initNetworkLab() {
  const list = $("#net-nodes");
  const access = $("#net-access");
  const status = $("#net-status");
  const result = $("#net-result");
  if (!list || !access || !status) return;

  const buttons = $$("[data-node]", list);

  const online = () => buttons.filter((button) => button.getAttribute("aria-pressed") === "true");

  const update = () => {
    const active = online();
    if (active.length) {
      status.textContent = active.length + " dari " + buttons.length + " node online. Salinan buku besar masih tersedia.";
      status.className = "status is-good";
    } else {
      status.textContent = "Tidak ada node online. Tidak ada salinan yang bisa diakses di jaringan kecil ini.";
      status.className = "status is-bad";
    }
    if (result) result.textContent = "";
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const pressed = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", pressed ? "false" : "true");
      update();
    });
  });

  access.addEventListener("click", () => {
    const active = online();
    if (!active.length) {
      result.textContent = "Permintaan gagal: tidak ada node yang bisa menjawab. Data tidak dapat diakses sampai ada node yang hidup kembali.";
      result.className = "readout";
      return;
    }
    const chosen = active[Math.floor(Math.random() * active.length)];
    const label = chosen.textContent.trim();
    result.textContent = "Salinan diterima dari " + label + ". Node ini menyimpan riwayat yang sama dengan " + (active.length - 1) + " node online lainnya.";
    result.className = "readout";
  });

  update();
})();

/* ---------- Lab rantai blok ---------- */

(function initChainLab() {
  const container = $("#chain-blocks");
  const difficultySelect = $("#chain-difficulty");
  const mineButton = $("#chain-mine-all");
  const resetButton = $("#chain-reset");
  const status = $("#chain-status");
  const result = $("#chain-result");
  if (!container || !difficultySelect || !mineButton) return;

  const ZERO = "0".repeat(64);
  const SAMPLE = [
    "Genesis: buku besar dimulai",
    "Kirim 0,5 ETH ke 0x1111...",
    "Kirim 0,1 ETH ke 0x2222..."
  ];

  let chain = [];
  let mining = false;

  const difficulty = () => Number(difficultySelect.value) || 2;

  const payload = (block) => block.index + "|" + block.data + "|" + block.prevHash + "|" + block.nonce;

  const findNonce = (block) => {
    const target = "0".repeat(difficulty());
    let nonce = 0;
    while (nonce < 3000000) {
      const hash = SHA256(block.index + "|" + block.data + "|" + block.prevHash + "|" + nonce);
      if (hash.startsWith(target)) return { nonce, hash };
      nonce += 1;
    }
    throw new Error("Batas percobaan habis. Coba kesulitan yang lebih rendah.");
  };

  const build = () => {
    chain = SAMPLE.map((data, index) => ({
      index: index + 1,
      data,
      prevHash: index === 0 ? ZERO : "",
      nonce: 0,
      hash: ""
    }));
  };

  const validity = (block, position) => {
    const expectedPrev = position === 0 ? ZERO : chain[position - 1].hash;
    const prevOk = block.prevHash === expectedPrev;
    const targetOk = block.hash.startsWith("0".repeat(difficulty()));
    const hashOk = block.hash === SHA256(payload(block));
    return prevOk && targetOk && hashOk;
  };

  const paintValidity = () => {
    let prefixOk = true;
    chain.forEach((block, index) => {
      const ownOk = validity(block, index);
      const ok = ownOk && prefixOk;
      if (!ownOk) prefixOk = false;
      const card = container.querySelector('[data-block="' + index + '"]');
      if (!card) return;
      card.classList.toggle("is-valid", ok);
      card.classList.toggle("is-invalid", !ok);
      const label = $(".block-state", card);
      if (label) label.textContent = ok ? "Sah" : "Tidak sah";
    });
    return prefixOk;
  };

  const render = () => {
    container.innerHTML = chain.map((block, index) => {
      return '<div class="block-card" data-block="' + index + '">' +
        '<div class="block-head"><span>Blok ' + block.index + '</span><span class="block-state">Sah</span></div>' +
        '<div class="block-body">' +
          '<div class="field"><label for="chain-data-' + index + '">Data blok</label>' +
            '<input id="chain-data-' + index + '" type="text" data-block-data="' + index + '" value="' + escapeHtml(block.data) + '" spellcheck="false">' +
          '</div>' +
          '<p class="block-hash"><strong>prev:</strong> ' + escapeHtml(block.prevHash) + '</p>' +
          '<p class="block-hash"><strong>nonce:</strong> ' + block.nonce + ' &nbsp; <strong>hash:</strong> ' + escapeHtml(block.hash) + '</p>' +
        '</div>' +
      '</div>';
    }).join("");
    paintValidity();
  };

  const mineAll = async () => {
    if (mining) return;
    mining = true;
    mineButton.disabled = true;
    resetButton.disabled = true;
    status.className = "status is-wait";
    status.textContent = "Menambang ulang seluruh rantai...";
    result.textContent = "";

    try {
      let attempts = 0;
      for (let index = 0; index < chain.length; index += 1) {
        chain[index].prevHash = index === 0 ? ZERO : chain[index - 1].hash;
        const found = findNonce(chain[index]);
        chain[index].nonce = found.nonce;
        chain[index].hash = found.hash;
        attempts += found.nonce;
        status.textContent = "Menambang blok " + (index + 1) + " dari " + chain.length + "...";
        await tick();
      }

      render();
      status.className = "status is-good";
      status.textContent = "Rantai valid: " + chain.length + " blok dengan " + difficulty() + " nol di depan.";
      result.textContent = "Total percobaan nonce: " + formatNumber(attempts) + "\nHash blok terakhir: " + chain[chain.length - 1].hash;
    } catch (error) {
      status.className = "status is-bad";
      status.textContent = error.message || "Gagal menambang.";
    } finally {
      mining = false;
      mineButton.disabled = false;
      resetButton.disabled = false;
    }
  };

  container.addEventListener("input", (event) => {
    const input = event.target.closest("[data-block-data]");
    if (!input) return;
    const index = Number(input.dataset.blockData);
    chain[index].data = input.value;
    result.textContent = "";
    const allValid = paintValidity();
    status.className = "status " + (allValid ? "is-good" : "is-bad");
    status.textContent = allValid
      ? "Rantai valid."
      : "Rantai tidak valid. Data berubah, hash tidak cocok lagi. Tambang ulang untuk memperbaiki.";
  });

  mineButton.addEventListener("click", mineAll);

  resetButton.addEventListener("click", () => {
    build();
    mineAll();
  });

  difficultySelect.addEventListener("change", () => {
    mineAll();
  });

  build();
  mineAll();
})();

/* ---------- Lab gas ---------- */

(function initGasLab() {
  const limit = $("#gas-limit");
  const used = $("#gas-used");
  const base = $("#gas-base");
  const priority = $("#gas-priority");
  const output = $("#gas-output");
  const status = $("#gas-status");
  if (!limit || !used || !base || !priority || !output) return;

  const presets = {
    transfer: { limit: 21000, used: 21000, base: 25, priority: 2 },
    token: { limit: 60000, used: 51000, base: 25, priority: 2 },
    swap: { limit: 180000, used: 150000, base: 25, priority: 2 }
  };

  const update = () => {
    const gasLimit = Math.max(0, Number(limit.value) || 0);
    const gasUsed = Math.max(0, Number(used.value) || 0);
    const baseFee = Math.max(0, Number(base.value) || 0);
    const tip = Math.max(0, Number(priority.value) || 0);
    const maxFee = baseFee + tip;
    const effectiveUsed = Math.min(gasUsed, gasLimit);
    const maxCost = (gasLimit * maxFee) / 1e9;
    const actualCost = (effectiveUsed * maxFee) / 1e9;
    const refundGas = Math.max(0, gasLimit - effectiveUsed);
    const refundEth = (refundGas * maxFee) / 1e9;

    output.textContent =
      "Harga maksimum per gas: " + formatNumber(maxFee, 2) + " gwei\n" +
      "Biaya maksimum (gas limit): " + formatEth(maxCost) + " ETH\n" +
      "Gas terpakai: " + formatNumber(effectiveUsed) + "\n" +
      "Biaya nyata: " + formatEth(actualCost) + " ETH\n" +
      "Gas dikembalikan: " + formatNumber(refundGas) + " (" + formatEth(refundEth) + " ETH)";

    if (gasUsed > gasLimit) {
      status.className = "status is-bad";
      status.textContent = "Gas terpakai melebihi gas limit. Transaksi akan kehabisan gas dan gagal, tetapi biaya hingga limit tetap dibayar.";
    } else if (gasLimit < 21000) {
      status.className = "status is-bad";
      status.textContent = "Gas limit di bawah 21.000 tidak cukup untuk transaksi dasar. Transfer ETH paling sederhana pun butuh 21.000 gas.";
    } else if (maxFee <= 0) {
      status.className = "status is-bad";
      status.textContent = "Harga gas 0 tidak akan diproses di mainnet. Naikkan base fee atau priority fee.";
    } else {
      status.className = "status is-good";
      status.textContent = "Dengan angka ini, biaya maksimum " + formatEth(maxCost) + " ETH. Sisa gas dikembalikan setelah eksekusi.";
    }
  };

  [limit, used, base, priority].forEach((input) => {
    input.addEventListener("input", update);
  });

  $$("[data-gas-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = presets[button.dataset.gasPreset];
      if (!preset) return;
      limit.value = preset.limit;
      used.value = preset.used;
      base.value = preset.base;
      priority.value = preset.priority;
      update();
      toast("Contoh gas dimuat. Angka ini bukan tarif live.");
    });
  });

  update();
})();

/* ---------- Lab konsensus ---------- */

(function initConsensusLab() {
  const mineButton = $("#pow-mine");
  const powStatus = $("#pow-status");
  const powResult = $("#pow-result");
  const runPos = $("#pos-run");
  const meters = $("#pos-meters");
  const posStatus = $("#pos-status");
  const stakeInputs = [$("#stake-1"), $("#stake-2"), $("#stake-3")].filter(Boolean);
  if (!mineButton || !powStatus || !powResult) return;

  mineButton.addEventListener("click", async () => {
    mineButton.disabled = true;
    powStatus.className = "status is-wait";
    powStatus.textContent = "Mencari nonce dengan hash yang diawali 000...";
    await tick();

    try {
      const prefix = "blok-demo|transaksi-set|";
      const target = "000";
      const start = performance.now();
      let nonce = 0;
      let hash = "";

      while (nonce < 3000000) {
        hash = SHA256(prefix + nonce);
        if (hash.startsWith(target)) break;
        nonce += 1;
      }

      const elapsed = Math.round(performance.now() - start);

      if (!hash.startsWith(target)) {
        powStatus.className = "status is-bad";
        powStatus.textContent = "Tidak ditemukan dalam batas percobaan. Coba lagi.";
      } else {
        powStatus.className = "status is-good";
        powStatus.textContent = "Blok ditemukan setelah " + formatNumber(nonce + 1) + " percobaan dalam " + elapsed + " ms. Inilah kerja yang membuat penulisan blok mahal.";
        powResult.textContent = "hash: " + hash + "\nnonce: " + nonce + "\nwaktu: " + elapsed + " ms";
      }
    } catch (error) {
      powStatus.className = "status is-bad";
      powStatus.textContent = "Gagal menambang: " + (error.message || error);
    } finally {
      mineButton.disabled = false;
    }
  });

  if (!runPos || !meters || !posStatus) return;

  const labels = ["Validator A", "Validator B", "Validator C"];
  let counts = [0, 0, 0];

  const stakes = () => stakeInputs.map((input) => Math.max(0, Number(input.value) || 0));
  const totalStake = () => stakes().reduce((sum, value) => sum + value, 0);

  const renderMeters = () => {
    const values = stakes();
    const total = totalStake();
    meters.innerHTML = labels.map((label, index) => {
      const percent = total > 0 ? (values[index] / total) * 100 : 0;
      return '<li>' +
        '<div class="meter-head"><span>' + label + '</span><strong>' +
          formatNumber(percent, 1) + "%" + (counts[index] ? " · " + counts[index] + " slot" : "") +
        "</strong></div>" +
        '<div class="meter"><span style="width:' + percent + '%"></span></div>' +
      "</li>";
    }).join("");
  };

  const randomUnit = () => {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    return buffer[0] / 4294967296;
  };

  runPos.addEventListener("click", () => {
    const values = stakes();
    const total = totalStake();
    if (total <= 0) {
      posStatus.className = "status is-bad";
      posStatus.textContent = "Total stake harus lebih dari 0. Tanpa stake, tidak ada bobot untuk memilih validator.";
      return;
    }

    counts = [0, 0, 0];
    for (let slot = 0; slot < 20; slot += 1) {
      let pick = randomUnit() * total;
      let chosen = 0;
      for (let index = 0; index < values.length; index += 1) {
        pick -= values[index];
        if (pick <= 0) {
          chosen = index;
          break;
        }
      }
      counts[chosen] += 1;
    }

    renderMeters();
    posStatus.className = "status is-good";
    posStatus.textContent = "20 slot dipilih: " + labels.map((label, index) => label + " " + counts[index]).join(", ") + ". Hasil 20 slot bisa berbeda dari peluang jangka panjang.";
  });

  stakeInputs.forEach((input) => input.addEventListener("input", () => {
    counts = [0, 0, 0];
    renderMeters();
    posStatus.textContent = "";
    posStatus.className = "status";
  }));

  renderMeters();
})();

/* ---------- Lab RPC ---------- */

(function initRpcLab() {
  const method = $("#rpc-method");
  const params = $("#rpc-params");
  const request = $("#rpc-request");
  const response = $("#rpc-response");
  const run = $("#rpc-run");
  const copy = $("#rpc-copy");
  const status = $("#rpc-status");
  if (!method || !params || !request || !response || !run) return;

  const EXAMPLE_ADDRESS = "0x1111111111111111111111111111111111111111";
  const EXAMPLE_FROM = "0x2222222222222222222222222222222222222222";

  const ethToHex = (value) => {
    const amount = Math.max(0, Number(value) || 0);
    try {
      return "0x" + BigInt(Math.round(amount * 1e18)).toString(16);
    } catch (error) {
      return "0x0";
    }
  };

  const buildRequest = () => {
    const selected = method.value;
    const body = { jsonrpc: "2.0", id: 1, method: "", params: [] };

    if (selected === "chainId") {
      body.method = "eth_chainId";
    } else if (selected === "blockNumber") {
      body.method = "eth_blockNumber";
    } else if (selected === "getBalance") {
      const address = ($("#rpc-address") || {}).value || EXAMPLE_ADDRESS;
      body.method = "eth_getBalance";
      body.params = [address, "latest"];
    } else if (selected === "sendTransaction") {
      const to = ($("#rpc-to") || {}).value || EXAMPLE_ADDRESS;
      const value = ($("#rpc-value") || {}).value || "0.1";
      body.method = "eth_sendTransaction";
      body.params = [{
        from: EXAMPLE_FROM,
        to,
        value: ethToHex(value)
      }];
    }

    return body;
  };

  const updateRequest = () => {
    request.textContent = JSON.stringify(buildRequest(), null, 2);
    response.textContent = "";
    status.className = "status";
    status.textContent = "Request siap. Jalankan simulasi untuk melihat respons contoh.";
  };

  const renderParams = () => {
    const selected = method.value;
    if (selected === "getBalance") {
      params.innerHTML = '<div class="field"><label for="rpc-address">Alamat</label>' +
        '<input id="rpc-address" type="text" value="' + EXAMPLE_ADDRESS + '" spellcheck="false">' +
        '<span class="hint">Alamat contoh. Saldo yang ditampilkan juga contoh.</span></div>';
    } else if (selected === "sendTransaction") {
      params.innerHTML = '<div class="field"><label for="rpc-to">Alamat tujuan</label>' +
        '<input id="rpc-to" type="text" value="' + EXAMPLE_ADDRESS + '" spellcheck="false"></div>' +
        '<div class="field"><label for="rpc-value">Nilai (ETH)</label>' +
        '<input id="rpc-value" type="number" value="0.1" min="0" step="0.01"></div>' +
        '<p class="inst-note">eth_sendTransaction meminta penandatanganan. Node publik tidak memegang kunci privat, jadi permintaan ini biasanya ditolak.</p>';
    } else {
      params.innerHTML = "";
    }
    updateRequest();
  };

  method.addEventListener("change", renderParams);
  params.addEventListener("input", updateRequest);

  run.addEventListener("click", () => {
    const selected = method.value;
    let payload;

    if (selected === "chainId") {
      payload = { jsonrpc: "2.0", id: 1, result: "0xaa36a7" };
    } else if (selected === "blockNumber") {
      payload = { jsonrpc: "2.0", id: 1, result: "0x12a4b3" };
    } else if (selected === "getBalance") {
      payload = { jsonrpc: "2.0", id: 1, result: "0x1bc16d674ec80000" };
    } else {
      payload = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32601,
          message: "eth_sendTransaction tidak tersedia di node publik ini. Tanda tangani transaksi di wallet lalu kirim eth_sendRawTransaction."
        }
      };
    }

    response.textContent = JSON.stringify(payload, null, 2);

    if (selected === "sendTransaction") {
      status.className = "status is-wait";
      status.textContent = "Simulasi selesai. Node contoh menolak menandatangani. Itu perilaku yang umum untuk node publik.";
    } else {
      status.className = "status is-good";
      status.textContent = "Respons simulasi. Angka ini bukan data live dari jaringan.";
    }
  });

  if (copy) {
    copy.addEventListener("click", async () => {
      const ok = await copyText(request.textContent);
      toast(ok ? "Request JSON disalin." : "Gagal menyalin request.");
    });
  }

  renderParams();
})();

/* ---------- Lab L2 ---------- */

(function initL2Lab() {
  const range = $("#l2-count");
  const countOut = $("#l2-count-out");
  const visual = $("#l2-visual");
  const output = $("#l2-output");
  const status = $("#l2-status");
  if (!range || !visual || !output) return;

  const update = () => {
    const count = Number(range.value) || 0;
    const batchSize = 1000;
    const batches = Math.max(1, Math.ceil(count / batchSize));
    const dots = Math.min(60, Math.max(1, Math.round(count / 100)));

    if (countOut) countOut.textContent = formatNumber(count);
    visual.innerHTML = Array.from({ length: dots }, () => '<span class="l2-dot"></span>').join("") +
      '<div class="l2-batches">' +
      Array.from({ length: batches }, (_, index) => '<span class="l2-batch">batch ' + (index + 1) + "</span>").join("") +
      "</div>";

    output.textContent =
      formatNumber(count) + " transaksi di L2\n" +
      batches + " batch dikirim ke L1\n" +
      "Rata-rata " + formatNumber(count / batches) + " transaksi per batch.";

    if (status) {
      status.textContent = "Satu batch membayar biaya L1 sekali. Porsi biaya L1 per transaksi mengecil saat batch makin penuh, sampai batas ukuran batch.";
    }
  };

  range.addEventListener("input", update);
  update();
})();

/* ---------- Lab klasifikasi on-chain ---------- */

(function initClassifyLab() {
  const list = $("#classify-list");
  const score = $("#classify-score");
  if (!list || !score) return;

  const items = [
    {
      text: "Kepemilikan NFT",
      answer: "on",
      why: "Kepemilikan harus bisa diverifikasi dan dipindahkan tanpa izin platform."
    },
    {
      text: "Foto profil pengguna",
      answer: "off",
      why: "Ukuran besar, sering berubah, dan tidak perlu dipercaya bersama oleh jaringan."
    },
    {
      text: "Saldo token",
      answer: "on",
      why: "Saldo adalah state yang harus konsisten di seluruh jaringan dan bisa dipakai kontrak lain."
    },
    {
      text: "Riwayat suka pada postingan",
      answer: "off",
      why: "Volume tinggi, sering berubah, dan lebih murah disimpan di database. On-chain hanya jika ada alasan kuat."
    },
    {
      text: "Pembayaran antar pengguna",
      answer: "on",
      why: "Butuh penyelesaian dan auditabilitas tanpa satu perantara yang harus dipercaya."
    },
    {
      text: "Isi artikel blog",
      answer: "off",
      why: "Teks panjang dan bisa diperbarui. Kalau butuh bukti integritas, simpan hash-nya on-chain."
    }
  ];

  let answered = 0;
  let correct = 0;

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "btn btn-quiet btn-small classify-reset";
  resetButton.textContent = "Ulangi lab";
  resetButton.hidden = true;

  const render = () => {
    list.innerHTML = items.map((item, index) => {
      return '<div class="classify-item" data-item="' + index + '">' +
        '<p class="classify-q">' + escapeHtml(item.text) + "</p>" +
        '<div class="classify-actions">' +
          '<button class="btn btn-quiet btn-small" type="button" data-classify="' + index + '" data-choice="on">On-chain</button>' +
          '<button class="btn btn-quiet btn-small" type="button" data-classify="' + index + '" data-choice="off">Off-chain</button>' +
        "</div>" +
        '<p class="classify-feedback" hidden></p>' +
      "</div>";
    }).join("");
  };

  const updateScore = () => {
    score.textContent = answered + " dari " + items.length + " dijawab, " + correct + " tepat.";
    score.className = "status " + (answered === items.length ? "is-good" : "");
    resetButton.hidden = answered === 0;
  };

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-classify]");
    if (!button) return;

    const itemIndex = Number(button.dataset.classify);
    const wrapper = button.closest(".classify-item");
    if (!wrapper || wrapper.dataset.answered === "true") return;

    const choice = button.dataset.choice;
    const item = items[itemIndex];
    const isCorrect = choice === item.answer;
    const feedback = $(".classify-feedback", wrapper);

    wrapper.dataset.answered = "true";
    $$("button", wrapper).forEach((btn) => {
      btn.disabled = true;
      if (btn === button) btn.setAttribute("aria-pressed", "true");
    });

    if (feedback) {
      feedback.hidden = false;
      feedback.className = "classify-feedback " + (isCorrect ? "is-good" : "is-bad");
      const correctLabel = item.answer === "on" ? "On-chain" : "Off-chain";
      feedback.textContent = (isCorrect ? "Tepat. " : "Belum tepat. Jawaban yang lebih umum: " + correctLabel + ". ") + item.why;
    }

    answered += 1;
    if (isCorrect) correct += 1;
    updateScore();
  });

  resetButton.addEventListener("click", () => {
    answered = 0;
    correct = 0;
    render();
    updateScore();
  });

  render();
  updateScore();
  score.insertAdjacentElement("afterend", resetButton);
})();

/* ---------- Uji kompetensi ---------- */

(function initQuiz() {
  const form = $("#quiz-form");
  const submit = $("#quiz-submit");
  const retry = $("#quiz-retry");
  const status = $("#quiz-status");
  const result = $("#quiz-result");
  if (!form || !submit || !status || !result) return;

  const bestKey = "bukubesar.quiz.v1";
  const currentBest = () => Number(store.get(bestKey, 0)) || 0;
  const questions = [
    {
      q: "Apa yang membuat riwayat blok sulit diubah?",
      options: [
        "Setiap blok menyimpan hash blok sebelumnya",
        "Blok disimpan di satu server pusat",
        "Semua transaksi dienkripsi dengan password",
        "Wallet meminta konfirmasi dua kali"
      ],
      correct: 0,
      why: "Hash blok sebelumnya mengikat blok menjadi rantai. Mengubah satu blok mengubah hash-nya dan mematahkan tautan ke blok berikutnya. Penyerang harus menambang ulang semua blok setelah titik perubahan."
    },
    {
      q: "Apa fungsi utama public key?",
      options: [
        "Menandatangani transaksi atas nama pemilik",
        "Memverifikasi signature dan menurunkan address",
        "Menyimpan saldo ETH di dalamnya",
        "Menentukan harga gas"
      ],
      correct: 1,
      why: "Public key dipakai untuk memverifikasi signature. Address diturunkan dari public key. Yang menandatangani adalah private key, sedangkan saldo disimpan di state blockchain."
    },
    {
      q: "Siapa yang boleh mengetahui private key walletmu?",
      options: [
        "Admin wallet resmi",
        "Tim dukungan MetaMask",
        "Hanya kamu",
        "Block explorer"
      ],
      correct: 2,
      why: "Private key adalah kendali penuh atas akun. Tidak ada admin, dukungan, atau layanan resmi yang perlu mengetahui private key atau seed phrase. Siapa pun yang memintanya sedang mencoba menipu."
    },
    {
      q: "Saat situs meminta connect wallet, apa yang biasanya diberikan?",
      options: [
        "Private key wallet",
        "Alamat wallet",
        "Seed phrase dua belas kata",
        "Izin menarik semua token"
      ],
      correct: 1,
      why: "Connect wallet biasanya hanya membagikan alamat. Situs bisa membaca data publik, tetapi transaksi atau izin token tetap membutuhkan tanda tangan terpisah yang harus kamu setujui."
    },
    {
      q: "Sifat hash yang benar adalah?",
      options: [
        "Hash bisa dibalik dengan kunci rahasia",
        "Perubahan kecil pada input mengubah output secara total",
        "Panjang output mengikuti panjang input",
        "Dua input berbeda selalu mustahil memiliki hash sama"
      ],
      correct: 1,
      why: "Ini disebut avalanche effect. Panjang output hash tetap, dan fungsi hash bersifat satu arah. Tabrakan secara teori mungkin, tetapi sangat sulit ditemukan pada fungsi hash yang kuat."
    },
    {
      q: "Fungsi hash yang dipakai Ethereum untuk address dan hash transaksi adalah?",
      options: ["SHA-256", "MD5", "Keccak-256", "bcrypt"],
      correct: 2,
      why: "Ethereum memakai Keccak-256. SHA-256 dipakai Bitcoin. Keduanya berbeda, meskipun Keccak menjadi dasar SHA-3. MD5 dan bcrypt bukan fungsi hash yang dipakai untuk address Ethereum."
    },
    {
      q: "Nonce pada transaksi Ethereum berfungsi untuk?",
      options: [
        "Menentukan harga gas",
        "Mencegah replay dan mengatur urutan transaksi akun",
        "Menyimpan alamat tujuan",
        "Membuat signature menjadi lebih pendek"
      ],
      correct: 1,
      why: "Nonce adalah penghitung transaksi per akun. Transaksi dengan nonce yang sama tidak bisa dipakai dua kali, dan transaksi berikutnya menunggu nonce sebelumnya selesai."
    },
    {
      q: "Transaksi gagal karena kehabisan gas. Apakah biayanya tetap dibayar?",
      options: [
        "Tidak, semua gas dikembalikan",
        "Ya, gas yang sudah terpakai tetap dibayar",
        "Hanya jika transaksi berhasil",
        "Hanya jika terjadi di Layer 2"
      ],
      correct: 1,
      why: "Validator sudah menjalankan komputasi dan memakai ruang blok. State dikembalikan saat revert, tetapi gas yang terpakai tetap dibayar. Karena itu gas limit harus cukup."
    },
    {
      q: "Pada EIP-1559, base fee diperlakukan bagaimana?",
      options: [
        "Diberikan seluruhnya kepada validator",
        "Dibakar",
        "Dibayar oleh kontrak, bukan pengguna",
        "Tidak pernah berubah"
      ],
      correct: 1,
      why: "Base fee dibakar. Validator menerima priority fee atau tip. Base fee menyesuaikan tingkat kepenuhan blok, sehingga bisa naik atau turun."
    },
    {
      q: "Apa yang membuat validator proof of stake terdorong untuk jujur?",
      options: [
        "Biaya listrik yang tinggi",
        "Stake yang bisa dipotong melalui slashing",
        "Nama validator yang publik",
        "Jumlah transaksi yang diproses"
      ],
      correct: 1,
      why: "Validator menaruh modal sebagai jaminan. Kalau melanggar aturan, sebagian stake bisa dipotong. Ini menggantikan biaya energi sebagai sumber keamanan ekonomi."
    },
    {
      q: "Apakah node RPC publik bisa menandatangani transaksi untukmu?",
      options: [
        "Ya, asalkan diberi alamat wallet",
        "Ya, asalkan diberi seed phrase",
        "Tidak, node tidak memegang private key",
        "Hanya di testnet"
      ],
      correct: 2,
      why: "Node bisa membaca, memvalidasi, dan menyiarkan transaksi, tetapi tidak memegang private key. Wallet yang menandatangani. Justru jangan pernah memberikan seed phrase atau private key kepada layanan RPC."
    },
    {
      q: "Kenapa rollup bisa lebih murah daripada transaksi langsung di L1?",
      options: [
        "Karena rollup menghapus semua transaksi",
        "Karena banyak transaksi dikompres dan dibagi dalam satu biaya L1",
        "Karena rollup tidak memakai kriptografi",
        "Karena rollup selalu gratis"
      ],
      correct: 1,
      why: "Rollup mengeksekusi transaksi di luar L1, lalu mengirim batch, data, atau bukti ke L1. Satu biaya L1 dibagi ke banyak transaksi, sehingga porsi per transaksi mengecil."
    },
    {
      q: "Apakah aplikasi Web3 masih boleh memakai database biasa?",
      options: [
        "Tidak, semua data wajib on-chain",
        "Ya, untuk data yang tidak perlu dipercaya bersama",
        "Hanya untuk menyimpan private key",
        "Hanya di testnet"
      ],
      correct: 1,
      why: "Aplikasi Web3 modern biasanya hybrid. Database dipakai untuk konten, pencarian, sesi, dan data pribadi. Blockchain dipakai untuk state yang harus dibagi, diaudit, atau dipercaya bersama."
    },
    {
      q: "Data mana yang paling masuk akal disimpan on-chain?",
      options: [
        "Foto profil beresolusi tinggi",
        "Kepemilikan aset dan pembayaran",
        "Riwayat pencarian pribadi",
        "Cache halaman"
      ],
      correct: 1,
      why: "Kepemilikan aset dan pembayaran butuh state bersama yang bisa diverifikasi tanpa satu admin. Foto, riwayat pencarian, dan cache lebih murah serta lebih pantas disimpan off-chain."
    },
    {
      q: "Address Ethereum diturunkan dari?",
      options: [
        "Private key secara langsung, 20 byte pertama",
        "Public key melalui Keccak-256, 20 byte terakhir",
        "Seed phrase melalui SHA-256",
        "Chain ID jaringan"
      ],
      correct: 1,
      why: "Address adalah 20 byte terakhir dari hash Keccak-256 public key, ditulis dengan awalan 0x. Private key tidak pernah diturunkan menjadi address secara langsung dan tidak boleh dibagikan."
    }
  ];

  const setStatus = (text, kind) => {
    status.textContent = text;
    status.className = "status" + (kind ? " " + kind : "");
  };

  const render = () => {
    form.innerHTML = questions.map((question, index) => {
      const options = question.options.map((option, optionIndex) => {
        return '<label class="option" data-option="' + optionIndex + '">' +
          '<input type="radio" name="q' + (index + 1) + '" value="' + optionIndex + '">' +
          '<span class="option-text">' + escapeHtml(option) + "</span>" +
          '<span class="mark" hidden></span>' +
        "</label>";
      }).join("");

      return '<fieldset class="quiz-q" data-q="' + index + '" tabindex="-1">' +
        "<legend><span class=\"q-num\">" + String(index + 1).padStart(2, "0") + "</span>" + escapeHtml(question.q) + "</legend>" +
        options +
        '<p class="quiz-explain" hidden>' + escapeHtml(question.why) + "</p>" +
      "</fieldset>";
    }).join("");
  };

  const reset = () => {
    form.reset();
    result.innerHTML = "";
    $$(".quiz-q", form).forEach((fieldset) => {
      fieldset.classList.remove("is-correct", "is-wrong");
      $$(".option", fieldset).forEach((option) => {
        option.classList.remove("is-correct", "is-wrong");
        const mark = $(".mark", option);
        if (mark) {
          mark.textContent = "";
          mark.hidden = true;
        }
      });
      const explain = $(".quiz-explain", fieldset);
      if (explain) explain.hidden = true;
      $$("input", fieldset).forEach((input) => { input.disabled = false; });
    });
    setStatus(currentBest() > 0 ? "Skor terbaik tersimpan: " + currentBest() + " dari 15. Pilih jawaban lalu periksa." : "Belum ada jawaban yang diperiksa.", "");
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const answers = questions.map((question, index) => {
      const checked = form.querySelector('input[name="q' + (index + 1) + '"]:checked');
      return checked ? Number(checked.value) : -1;
    });

    const unanswered = answers.filter((answer) => answer === -1).length;
    if (unanswered > 0) {
      setStatus("Masih ada " + unanswered + " pertanyaan yang belum dijawab. Lengkapi dulu, lalu periksa lagi.", "is-bad");
      const firstUnanswered = answers.findIndex((answer) => answer === -1);
      const fieldset = form.querySelector('[data-q="' + firstUnanswered + '"]');
      if (fieldset) {
        fieldset.focus();
        fieldset.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return;
    }

    let score = 0;

    questions.forEach((question, index) => {
      const fieldset = form.querySelector('[data-q="' + index + '"]');
      if (!fieldset) return;
      const selected = answers[index];
      if (selected === question.correct) score += 1;

      $$(".option", fieldset).forEach((option, optionIndex) => {
        const mark = $(".mark", option);
        const isCorrect = optionIndex === question.correct;
        const isSelected = optionIndex === selected;

        option.classList.toggle("is-correct", isCorrect);
        option.classList.toggle("is-wrong", isSelected && !isCorrect);

        if (mark) {
          if (isCorrect) {
            mark.textContent = isSelected ? "Benar" : "Jawaban benar";
            mark.hidden = false;
          } else if (isSelected) {
            mark.textContent = "Salah";
            mark.hidden = false;
          } else {
            mark.textContent = "";
            mark.hidden = true;
          }
        }
      });

      const explain = $(".quiz-explain", fieldset);
      if (explain) explain.hidden = false;
      $$("input", fieldset).forEach((input) => { input.disabled = true; });
    });

    const previousBest = Number(store.get(bestKey, 0)) || 0;
    const newBest = Math.max(previousBest, score);
    store.set(bestKey, newBest);

    const passed = score >= 12;
    result.innerHTML = '<div class="quiz-summary' + (passed ? "" : " is-fail") + '">' +
      "<h3>Skor " + score + " dari 15</h3>" +
      "<p>" + (passed
        ? "Kamu siap lanjut. Pastikan kamu bisa menjelaskan alasan setiap jawaban, bukan hanya mengingat pilihan hurufnya."
        : "Ulangi bab yang penjelasannya belum klik, lalu coba lagi. Tidak ada batas percobaan.") +
      "</p><p>Skor terbaik tersimpan: " + newBest + " dari 15.</p>" +
    "</div>";

    if (passed && typeof window.setProgressDone === "function") {
      window.setProgressDone("uji", true, false);
    }

    setStatus(
      passed ? "Uji kompetensi lulus dan ditandai selesai." : "Jawaban diperiksa. Baca penjelasan di setiap soal.",
      passed ? "is-good" : "is-wait"
    );
    result.focus();
  });

  if (retry) retry.addEventListener("click", () => {
    reset();
    const first = $("input", form);
    if (first) first.focus();
  });

  render();
  reset();
})();



/* ---------- Toolbar mengambang ---------- */

(function initQuickBar() {
  if (document.querySelector(".quickbar")) return;

  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  if (!navLinks.length) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = reduce ? "auto" : "smooth";

  const bar = document.createElement("div");
  bar.className = "quickbar";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Aksi cepat belajar");

  const panel = document.createElement("div");
  panel.className = "quickbar-panel";
  panel.id = "quickbar-panel";
  panel.hidden = true;

  const title = document.createElement("p");
  title.className = "quickbar-title";
  title.textContent = "Daftar isi";
  panel.appendChild(title);

  const list = document.createElement("nav");
  list.className = "quickbar-list";
  list.setAttribute("aria-label", "Daftar isi halaman");

  const entries = [];

  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href.charAt(0) !== "#" || href.length < 2) return;

    const target = document.getElementById(href.slice(1));
    if (!target) return;

    const label = link.querySelector(".nav-label");
    const number = link.querySelector(".nav-num");
    const name = (label ? label.textContent : link.textContent).replace(/\s+/g, " ").trim();
    if (!name) return;

    const item = document.createElement("a");
    item.href = href;

    const num = document.createElement("span");
    num.className = "quickbar-num";
    num.textContent = number ? number.textContent.trim() : "";

    const text = document.createElement("span");
    text.className = "quickbar-name";
    text.textContent = name;

    item.appendChild(num);
    item.appendChild(text);
    item.addEventListener("click", () => setOpen(false));

    list.appendChild(item);
    entries.push({ link: link, item: item });
  });

  if (!entries.length) return;

  panel.appendChild(list);

  const actions = document.createElement("div");
  actions.className = "quickbar-actions";

  const makeButton = (key, label, icon, primary) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quickbar-btn" + (primary ? " is-primary" : "");
    button.dataset.quick = key;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = icon + '<span class="quickbar-label">' + label + "</span>";
    actions.appendChild(button);
    return button;
  };

  const icons = {
    list: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>',
    next: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 2v11M3.5 8.5L8 13l4.5-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    up: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 14V3M3.5 7.5L8 3l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
  };

  const tocButton = makeButton("toc", "Daftar isi", icons.list, false);
  tocButton.setAttribute("aria-expanded", "false");
  tocButton.setAttribute("aria-controls", "quickbar-panel");

  const nextButton = makeButton("next", "Lanjut", icons.next, true);
  const topButton = makeButton("top", "Ke atas", icons.up, false);

  const setOpen = (open) => {
    panel.hidden = !open;
    tocButton.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) return;

    entries.forEach((entry) => {
      entry.item.classList.toggle("is-current", entry.link.getAttribute("aria-current") === "true");
    });
  };

  tocButton.addEventListener("click", () => {
    setOpen(panel.hidden);
  });

  const findCurrentIndex = () => {
    let index = navLinks.findIndex((link) => link.getAttribute("aria-current") === "true");
    if (index >= 0) return index;

    const header = document.querySelector(".site-header");
    const limit = (header ? header.offsetHeight : 0) + 120;

    navLinks.forEach((link, i) => {
      const href = link.getAttribute("href") || "";
      const target = href.charAt(0) === "#" ? document.getElementById(href.slice(1)) : null;
      if (target && target.getBoundingClientRect().top <= limit) index = i;
    });

    return index;
  };

  nextButton.addEventListener("click", () => {
    setOpen(false);

    const index = findCurrentIndex();
    const next = navLinks[index + 1];

    if (next) {
      const href = next.getAttribute("href") || "";
      const target = href.charAt(0) === "#" ? document.getElementById(href.slice(1)) : null;
      if (target) {
        target.scrollIntoView({ behavior: behavior, block: "start" });
        return;
      }
    }

    window.scrollTo({ top: 0, behavior: behavior });
    if (typeof toast === "function") toast("Kamu sudah di akhir materi. Kembali ke awal.");
  });

  topButton.addEventListener("click", () => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: behavior });
  });

  document.addEventListener("click", (event) => {
    if (panel.hidden) return;
    if (bar.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || panel.hidden) return;
    setOpen(false);
    tocButton.focus();
  });

  bar.appendChild(panel);
  bar.appendChild(actions);
  document.body.appendChild(bar);
})();

