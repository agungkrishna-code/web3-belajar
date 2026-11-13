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
      /* Mode privat bisa memblokir penyimpanan. Progres tetap jalan di sesi ini. */
    }
  }
};

let toastTimer = 0;

function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("is-visible"), 2200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
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

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy-target]");
  if (!button) return;
  const target = document.getElementById(button.dataset.copyTarget);
  if (!target) return;

  const original = button.textContent;
  const ok = await copyText(target.innerText || target.textContent || "");
  button.textContent = ok ? "Tersalin" : "Gagal";
  toast(ok ? "Kode disalin." : "Gagal menyalin.");
  window.setTimeout(() => { button.textContent = original; }, 1600);
});

/* ---------- Sorotan kode Solidity ---------- */

const TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(0x[0-9a-fA-F]+|\d[\d_]*)\b|\b(pragma|solidity|contract|interface|library|abstract|is|using|function|modifier|event|error|struct|enum|mapping|constructor|receive|fallback|returns|return|if|else|for|while|do|break|continue|emit|revert|require|assert|try|catch|new|delete|import|from|as|unchecked|assembly|virtual|override|super|constant|immutable|public|private|internal|external|pure|view|payable|memory|storage|calldata|true|false|type|this|msg|block|tx)\b|\b(address|bool|string|bytes(?:[1-9]|[12][0-9]|3[0-2])?|u?int(?:8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?)\b/g;

function highlightCode(code) {
  let out = "";
  let last = 0;

  for (const match of code.matchAll(TOKEN_RE)) {
    out += escapeHtml(code.slice(last, match.index));
    let cls = "tok-t";
    if (match[1]) cls = "tok-c";
    else if (match[2]) cls = "tok-s";
    else if (match[3]) cls = "tok-n";
    else if (match[4]) cls = "tok-k";
    out += '<span class="' + cls + '">' + escapeHtml(match[0]) + "</span>";
    last = match.index + match[0].length;
  }

  return out + escapeHtml(code.slice(last));
}

(function initHighlight() {
  $$(".code-block pre code").forEach((block) => {
    if (block.closest(".console-code")) return;
    const source = block.textContent;
    if (!source.trim()) return;
    block.innerHTML = highlightCode(source);
  });
})();

/* ---------- Tema ---------- */

(function initTheme() {
  const root = document.documentElement;
  const button = $("#theme-toggle");
  const label = $("#theme-label");
  if (!button || !label) return;

  const apply = (theme, persist) => {
    if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    root.style.colorScheme = theme;
    label.textContent = theme === "dark" ? "Mode terang" : "Mode gelap";
    button.setAttribute("aria-label", theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap");
    if (persist) store.set("kontrak.theme", theme);
  };

  apply(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);

  button.addEventListener("click", () => {
    apply(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
  });
})();

/* ---------- Navigasi mobile ---------- */

(function initMobileNav() {
  const menu = $("#menu-toggle");
  const close = $("#sidebar-close");
  const scrim = $("[data-close-nav]");

  const setOpen = (open) => {
    document.body.dataset.navOpen = open ? "true" : "false";
    if (menu) menu.setAttribute("aria-expanded", open ? "true" : "false");
  };

  if (menu) {
    menu.addEventListener("click", () => {
      setOpen(document.body.dataset.navOpen !== "true");
    });
  }

  if (close) close.addEventListener("click", () => setOpen(false));
  if (scrim) scrim.addEventListener("click", () => setOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  $$(".nav-link").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
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
      mark: mark ? mark.textContent.replace(/[A-Z]+$/g, "").trim() : "Orientasi",
      text: section.textContent.replace(/\s+/g, " ").trim()
    };
  });

  const close = () => {
    panel.hidden = true;
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
      matches.push({ entry, snippet: makeSnippet(entry.text, position, term) });
      if (matches.length >= 8) break;
    }

    if (!matches.length) {
      panel.innerHTML = '<p class="search-empty">Tidak ada hasil untuk "' + escapeHtml(term) + '". Coba "mapping", "payable", "ERC-20", atau "modifier".</p>';
    } else {
      panel.innerHTML = "<ul>" + matches.map((match) => {
        return '<li><a href="#' + match.entry.id + '">' +
          '<span class="result-chapter">' + escapeHtml(match.entry.mark) + "</span>" +
          '<span class="result-title">' + escapeHtml(match.entry.title) + "</span>" +
          '<span class="result-snippet">' + match.snippet + "</span>" +
          "</a></li>";
      }).join("") + "</ul>";
    }

    panel.hidden = false;
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
    close();
    input.value = "";
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) close();
  });
})();

/* ---------- Progres dan akhir bab ---------- */

const progressState = {
  key: "kontrak.progress.v1",
  quizKey: "kontrak.quiz.v1",
  tracked: $$('main section[data-track="true"]'),
  done: new Set()
};

(function initProgress() {
  const saved = store.get(progressState.key, []);
  if (Array.isArray(saved)) saved.forEach((id) => progressState.done.add(String(id)));

  const bestQuiz = Number(store.get(progressState.quizKey, 0)) || 0;
  if (bestQuiz >= 16) progressState.done.add("uji");

  const navItems = $$(".nav-link").map((link) => ({
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

    const links = document.createElement("div");
    links.className = "chapter-links";

    const position = order.findIndex((item) => item.id === section.id);
    const previous = position > 0 ? order[position - 1] : null;
    const next = position >= 0 && position < order.length - 1 ? order[position + 1] : null;

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

    const foot = document.createElement("div");
    foot.className = "chapter-foot";
    foot.appendChild(button);
    foot.appendChild(links);
    host.appendChild(foot);
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

    const headings = $$("h3", section).filter((heading) => !heading.closest(".lab"));
    if (!headings.length) {
      tocNav.innerHTML = '<span class="toc-empty">Tidak ada subbagian di sini.</span>';
      return;
    }

    headings.forEach((heading, index) => {
      if (!heading.id) heading.id = slug(heading.textContent, section.id + "-bagian-" + (index + 1));
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

/* ---------- Helper lab ---------- */

function prependLog(list, kind, text) {
  if (!list) return;
  const empty = list.querySelector(".event-log-empty");
  if (empty) empty.remove();

  const li = document.createElement("li");
  const number = Number(list.dataset.count || 0) + 1;
  list.dataset.count = String(number);
  const cls = kind === "ok" ? "log-ok" : kind === "bad" ? "log-bad" : "log-event";
  li.innerHTML = '<span class="log-no">#' + String(number).padStart(2, "0") + '</span>' +
    '<span class="' + cls + '">' + escapeHtml(text) + "</span>";
  list.prepend(li);

  while (list.children.length > 8) list.lastElementChild.remove();
}

function emptyLog(list, text) {
  if (!list) return;
  list.innerHTML = '<li class="event-log-empty">' + escapeHtml(text) + "</li>";
}

/* ---------- Hero counter ---------- */

(function initHeroCounter() {
  const countEl = $("#hero-count");
  const slotEl = $("#hero-slot");
  const increment = $("#hero-increment");
  const reset = $("#hero-reset");
  if (!countEl || !slotEl) return;

  let count = 0;

  const render = () => {
    countEl.textContent = String(count);
    slotEl.textContent = "slot 0: 0x" + BigInt(count).toString(16).padStart(64, "0");
  };

  if (increment) increment.addEventListener("click", () => { count += 1; render(); });
  if (reset) reset.addEventListener("click", () => { count = 0; render(); });

  render();
})();

/* ---------- Lab 01: satuan ---------- */

(function initUnitLab() {
  const input = $("#unit-eth");
  const type = $("#unit-type");
  if (!input || !type) return;

  const weiEl = $("#unit-wei");
  const gweiEl = $("#unit-gwei");
  const hexEl = $("#unit-hex");
  const rangeEl = $("#unit-range");
  const status = $("#unit-status");

  const group = (big) => big.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const parseWei = (raw) => {
    const text = raw.trim().replace(",", ".");
    if (!/^\d*(\.\d*)?$/.test(text) || text === "" || text === ".") return null;
    const [whole, fraction = ""] = text.split(".");
    if (fraction.length > 18) return null;
    const padded = (fraction + "0".repeat(18)).slice(0, 18);
    return BigInt(whole || "0") * 10n ** 18n + BigInt(padded || "0");
  };

  const render = () => {
    const bits = Number(type.value);
    const max = (1n << BigInt(bits)) - 1n;
    rangeEl.textContent = "0 sampai " + group(max) + " (2^" + bits + " - 1)";

    const wei = parseWei(input.value);
    if (wei === null) {
      weiEl.textContent = "-";
      gweiEl.textContent = "-";
      hexEl.textContent = "-";
      status.textContent = "Masukkan angka desimal dengan maksimal 18 angka di belakang koma.";
      status.className = "is-bad";
      return;
    }

    const gweiWhole = wei / 10n ** 9n;
    const gweiFraction = (wei % 10n ** 9n).toString().padStart(9, "0").replace(/0+$/, "");
    weiEl.textContent = group(wei);
    gweiEl.textContent = group(gweiWhole) + (gweiFraction ? "." + gweiFraction : "");
    hexEl.textContent = "0x" + wei.toString(16);

    if (wei <= max) {
      status.textContent = "Muat di uint" + bits + ". Nilai ini bisa disimpan tanpa terpotong.";
      status.className = "is-good";
    } else {
      status.textContent = "Tidak muat di uint" + bits + ". Konversi ke tipe ini akan memotong bit atas, bukan revert.";
      status.className = "is-bad";
    }
  };

  input.addEventListener("input", render);
  type.addEventListener("change", render);
  render();
})();

/* ---------- Lab 02: visibility ---------- */

(function initVisibilityLab() {
  const wrap = $("#lab-visibility");
  if (!wrap) return;

  const status = $("#vis-status");
  const readout = $("#vis-readout");
  const callers = $$("[data-caller]", wrap);
  const calls = $$("[data-vis]", wrap);
  let caller = "eoa";

  const matrix = {
    public: { eoa: true, kontrak: true, turunan: true, diri: true },
    external: { eoa: true, kontrak: true, turunan: false, diri: "this" },
    internal: { eoa: false, kontrak: false, turunan: true, diri: true },
    private: { eoa: false, kontrak: false, turunan: false, diri: true }
  };

  const callerName = {
    eoa: "EOA lain",
    kontrak: "kontrak lain",
    turunan: "kontrak turunan",
    diri: "kontrak ini sendiri"
  };

  const reasons = {
    public: "public bisa dipanggil dari mana saja, termasuk dari dalam kontrak dan kontrak turunan.",
    external: "external hanya bisa dipanggil dari luar. Dari dalam kontrak, harus lewat this.fungsi(), yang membuat panggilan eksternal baru.",
    internal: "internal hanya terlihat oleh kontrak ini dan kontrak turunan. Tidak ada di ABI publik.",
    private: "private hanya terlihat oleh kontrak ini. Bahkan kontrak turunan tidak bisa memanggilnya."
  };

  callers.forEach((button) => {
    button.addEventListener("click", () => {
      caller = button.dataset.caller;
      callers.forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
      status.textContent = "Pemanggil: " + callerName[caller] + ". Pilih fungsi.";
      status.className = "status";
      readout.textContent = "";
    });
  });

  calls.forEach((button) => {
    button.addEventListener("click", () => {
      const fn = button.dataset.vis;
      const allowed = matrix[fn][caller];
      const yes = allowed === true || allowed === "this";

      status.textContent = (yes ? "Bisa dipanggil" : "Tidak bisa dipanggil") + ": " + fn + "() oleh " + callerName[caller] + ".";
      status.className = "status " + (yes ? "is-good" : "is-bad");

      let note = reasons[fn];
      if (allowed === "this") {
        note = "Bisa, tetapi hanya lewat this." + fn + "(). Itu panggilan eksternal baru, memakai gas tambahan, dan bukan cara normal memanggil logika internal.";
      } else if (!yes && fn === "external" && caller === "turunan") {
        note = "Kontrak turunan tidak bisa memanggil external secara langsung. Ia bisa memakai this." + fn + "() jika alamat kontraknya tersedia, tetapi itu panggilan eksternal.";
      } else if (!yes && fn === "internal" && caller === "kontrak") {
        note = "Kontrak lain tidak bisa memanggil internal. Kamu perlu fungsi external atau public sebagai pintu masuk.";
      }

      readout.textContent = note;
    });
  });
})();

/* ---------- Lab 03: revert ---------- */

(function initRevertLab() {
  const run = $("#revert-run");
  if (!run) return;

  const amountInput = $("#revert-amount");
  const who = $("#revert-who");
  const status = $("#revert-status");
  const log = $("#revert-log");
  let ownerBalance = 100;

  emptyLog(log, "Belum ada panggilan. Saldo kontrak: 100.");

  run.addEventListener("click", () => {
    const amount = Number(amountInput.value);
    const isOwner = who.value === "owner";
    const available = isOwner ? ownerBalance : 0;

    if (!Number.isFinite(amount) || amount <= 0) {
      status.textContent = "revert(\"jumlah nol\"). State tidak berubah.";
      status.className = "status is-bad";
      prependLog(log, "bad", "revert: jumlah nol");
      return;
    }

    if (amount > available) {
      status.textContent = "revert SaldoKurang(" + amount + ", " + available + "). State kembali, gas tetap dibayar.";
      status.className = "status is-bad";
      prependLog(log, "bad", "revert SaldoKurang(" + amount + ", " + available + ")");
      return;
    }

    ownerBalance -= amount;
    status.textContent = "Berhasil menarik " + amount + ". Sisa saldo pemilik: " + ownerBalance + ". Event Withdrawn tercatat.";
    status.className = "status is-good";
    prependLog(log, "ok", "Withdrawn(" + amount + ") · sisa " + ownerBalance);
  });
})();

/* ---------- Lab 04: todo ---------- */

(function initTodoLab() {
  const input = $("#todo-input");
  const add = $("#todo-add");
  if (!input || !add) return;

  const list = $("#todo-list");
  const log = $("#todo-log");
  const count = $("#todo-count");
  let nextId = 1;
  let todos = [];

  emptyLog(log, "Belum ada event.");

  const render = () => {
    count.textContent = "nextId: " + nextId;

    if (!todos.length) {
      list.innerHTML = '<li><span class="row-main">Belum ada todo.</span><span class="row-meta">mapping kosong</span></li>';
      return;
    }

    list.innerHTML = todos.map((todo) => {
      return "<li>" +
        '<span class="row-main">' + (todo.done ? "<s>" + escapeHtml(todo.text) + "</s>" : escapeHtml(todo.text)) +
        '<span class="row-meta">id ' + todo.id + (todo.done ? " · selesai" : " · aktif") + "</span></span>" +
        '<span class="row-actions">' +
        '<button class="btn btn-quiet btn-small" type="button" data-todo-toggle="' + todo.id + '">toggle</button> ' +
        '<button class="btn btn-quiet btn-small" type="button" data-todo-remove="' + todo.id + '">hapus</button>' +
        "</span></li>";
    }).join("");
  };

  add.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) {
      toast("Teks todo tidak boleh kosong.");
      input.focus();
      return;
    }
    if (text.length > 80) {
      toast("Maksimal 80 karakter di lab ini.");
      return;
    }

    const id = nextId++;
    todos.unshift({ id, text, done: false });
    input.value = "";
    render();
    prependLog(log, "ok", "TodoCreated(" + id + ", \"" + text + "\")");
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") add.click();
  });

  list.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-todo-toggle]");
    const remove = event.target.closest("[data-todo-remove]");

    if (toggle) {
      const id = Number(toggle.dataset.todoToggle);
      const todo = todos.find((item) => item.id === id);
      if (!todo) return;
      todo.done = !todo.done;
      render();
      prependLog(log, "ok", "TodoToggled(" + id + ", " + todo.done + ")");
    }

    if (remove) {
      const id = Number(remove.dataset.todoRemove);
      todos = todos.filter((item) => item.id !== id);
      render();
      prependLog(log, "ok", "TodoRemoved(" + id + ") · delete todos[id]");
    }
  });

  render();
})();

/* ---------- Lab lanjutan: alur todo ---------- */

(function initTodoFlowLab() {
  const input = $("#todo2-input");
  const add = $("#todo2-add");
  if (!input || !add) return;

  const list = $("#todo2-list");
  const status = $("#todo2-status");
  let nextId = 1;
  let todos = [];

  const render = () => {
    status.textContent = todos.length
      ? todos.length + " item · nextId " + nextId + " · " + todos.filter((item) => item.done).length + " selesai"
      : "Daftar kosong. Kontrak mengembalikan array kosong.";

    list.innerHTML = todos.length
      ? todos.map((todo) => {
        return "<li><span class=\"row-main\">" + (todo.done ? "<s>" + escapeHtml(todo.text) + "</s>" : escapeHtml(todo.text)) +
          '<span class="row-meta">id ' + todo.id + " · " + (todo.done ? "done" : "aktif") + " · dibuat " + todo.at + "</span></span>" +
          '<span class="row-actions">' +
          '<button class="btn btn-quiet btn-small" type="button" data-t2-toggle="' + todo.id + '">toggle</button> ' +
          '<button class="btn btn-quiet btn-small" type="button" data-t2-remove="' + todo.id + '">hapus</button>' +
          "</span></li>";
      }).join("")
      : '<li><span class="row-main">Belum ada todo.</span><span class="row-meta">Todo[] memory kosong</span></li>';
  };

  add.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) {
      toast("Teks todo tidak boleh kosong.");
      input.focus();
      return;
    }
    if (text.length > 140) {
      toast("Kontrak menolak teks lebih dari 140 byte.");
      return;
    }
    todos.unshift({ id: nextId++, text, done: false, at: "block " + (10_000 + nextId) });
    input.value = "";
    render();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") add.click();
  });

  list.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-t2-toggle]");
    const remove = event.target.closest("[data-t2-remove]");

    if (toggle) {
      const todo = todos.find((item) => item.id === Number(toggle.dataset.t2Toggle));
      if (todo) todo.done = !todo.done;
      render();
    }

    if (remove) {
      todos = todos.filter((item) => item.id !== Number(remove.dataset.t2Remove));
      render();
    }
  });

  render();
})();

/* ---------- Lab 05: packing ---------- */

(function initPackingLab() {
  const list = $("#pack-list");
  if (!list) return;

  const slotsEl = $("#pack-slots");
  const status = $("#pack-status");
  const reset = $("#pack-reset");
  const preset = $("#pack-preset");

  const initial = [
    { key: "saldoA", label: "uint128 saldoA", type: "uint128", size: 16 },
    { key: "total", label: "uint256 total", type: "uint256", size: 32 },
    { key: "saldoB", label: "uint128 saldoB", type: "uint128", size: 16 },
    { key: "pemilik", label: "address pemilik", type: "address", size: 20 },
    { key: "aktif", label: "bool aktif", type: "bool", size: 1 },
    { key: "nonce", label: "uint64 nonce", type: "uint64", size: 8 },
    { key: "level", label: "uint8 level", type: "uint8", size: 1 },
    { key: "nama", label: "string nama", type: "string", size: 32 }
  ];

  const hemat = ["total", "nama", "saldoA", "saldoB", "pemilik", "aktif", "nonce", "level"];

  let fields = initial.map((field) => ({ ...field }));

  const byKey = (key) => initial.find((field) => field.key === key);

  const renderList = () => {
    list.innerHTML = fields.map((field, index) => {
      return "<li>" +
        '<span class="row-main">' + escapeHtml(field.label) +
        '<span class="row-meta">' + field.size + " byte</span></span>" +
        '<span class="row-actions">' +
        '<button class="btn btn-quiet btn-small" type="button" data-pack-up="' + index + '" aria-label="Naikkan ' + escapeHtml(field.label) + '"' + (index === 0 ? " disabled" : "") + ">↑</button> " +
        '<button class="btn btn-quiet btn-small" type="button" data-pack-down="' + index + '" aria-label="Turunkan ' + escapeHtml(field.label) + '"' + (index === fields.length - 1 ? " disabled" : "") + ">↓</button>" +
        "</span></li>";
    }).join("");
  };

  const renderSlots = () => {
    const slots = [];
    let current = null;

    for (const field of fields) {
      if (field.size >= 32) {
        if (current) { slots.push(current); current = null; }
        slots.push({ used: 32, parts: [{ label: field.label.replace(/^(u?int\d*|address|bool|string)\s+/, ""), size: 32, field }] });
        continue;
      }

      if (!current || current.used + field.size > 32) {
        if (current) slots.push(current);
        current = { used: 0, parts: [] };
      }

      current.parts.push({
        label: field.label.replace(/^(u?int\d*|address|bool|string)\s+/, ""),
        size: field.size,
        field
      });
      current.used += field.size;

      if (current.used === 32) {
        slots.push(current);
        current = null;
      }
    }

    if (current) slots.push(current);

    slotsEl.innerHTML = slots.map((slot, index) => {
      const segments = slot.parts.map((part) => {
        const width = (part.size / 32) * 100;
        const text = part.size < 3 ? "" : part.label;
        return '<span class="slot-seg" style="width:' + width.toFixed(3) + '%" title="' + escapeHtml(part.field.label) + ' (' + part.size + ' byte)">' + escapeHtml(text) + "</span>";
      }).join("");
      const detail = slot.parts.map((part) => part.field.label + " " + part.size + " B").join(" · ") +
        (slot.used < 32 ? " · " + (32 - slot.used) + " B kosong" : "");
      return "<li><span class=\"slot-label\">slot " + index + "<br>" + slot.used + "/32 B</span><div class=\"slot-bar-wrap\"><div class=\"slot-bar\" role=\"img\" aria-label=\"slot " + index + ", " + slot.used + " dari 32 byte terpakai\">" + segments + "</div><span class=\"slot-detail\">" + escapeHtml(detail) + "</span></div></li>";
    }).join("");

    const totalBytes = fields.reduce((sum, field) => sum + field.size, 0);
    status.textContent = fields.length + " field memakai " + slots.length + " slot (" + totalBytes + " byte deklarasi). " +
      "Field 32 byte selalu memulai slot baru. Urutan mengubah jumlah slot.";
    status.className = "status is-good";
  };

  const render = () => {
    renderList();
    renderSlots();
  };

  list.addEventListener("click", (event) => {
    const up = event.target.closest("[data-pack-up]");
    const down = event.target.closest("[data-pack-down]");

    if (up) {
      const index = Number(up.dataset.packUp);
      if (index > 0) {
        [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
        render();
      }
    }

    if (down) {
      const index = Number(down.dataset.packDown);
      if (index < fields.length - 1) {
        [fields[index + 1], fields[index]] = [fields[index], fields[index + 1]];
        render();
      }
    }
  });

  if (reset) {
    reset.addEventListener("click", () => {
      fields = initial.map((field) => ({ ...field }));
      render();
    });
  }

  if (preset) {
    preset.addEventListener("click", () => {
      fields = hemat.map((key) => ({ ...byKey(key) }));
      render();
    });
  }

  render();
})();

/* ---------- Lab 06: akses dan event ---------- */

(function initAccessLab() {
  const wrap = $("#lab-access");
  if (!wrap) return;

  const status = $("#mod-status");
  const log = $("#mod-log");
  const input = $("#mod-message");
  const setButton = $("#mod-set");
  const pauseButton = $("#mod-pause");
  const callers = $$("[data-mod-caller]", wrap);

  let caller = "owner";
  let paused = false;

  emptyLog(log, "Belum ada event.");

  const render = () => {
    status.textContent = "Kontrak " + (paused ? "pause" : "aktif") + ". Pemanggil: " + (caller === "owner" ? "owner" : "akun lain") + ".";
    status.className = "status " + (paused ? "is-bad" : "is-good");
    if (pauseButton) pauseButton.textContent = paused ? "unpause()" : "pause()";
  };

  callers.forEach((button) => {
    button.addEventListener("click", () => {
      caller = button.dataset.modCaller;
      callers.forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
      render();
    });
  });

  if (setButton && input) {
    setButton.addEventListener("click", () => {
      if (caller !== "owner") {
        status.textContent = "revert NotOwner(akun lain). State tidak berubah, tidak ada event.";
        status.className = "status is-bad";
        prependLog(log, "bad", "revert NotOwner(akun lain)");
        return;
      }
      if (paused) {
        status.textContent = "revert ContractPaused(). Owner tetap tidak bisa mengubah pesan saat pause.";
        status.className = "status is-bad";
        prependLog(log, "bad", "revert ContractPaused()");
        return;
      }
      status.textContent = "Berhasil. Pesan baru: \"" + input.value + "\". Event PesanBaru tercatat.";
      status.className = "status is-good";
      prependLog(log, "ok", "PesanBaru(\"" + input.value + "\", owner)");
    });
  }

  if (pauseButton) {
    pauseButton.addEventListener("click", () => {
      if (caller !== "owner") {
        status.textContent = "revert NotOwner(akun lain). Hanya owner yang bisa pause.";
        status.className = "status is-bad";
        prependLog(log, "bad", "revert NotOwner(akun lain)");
        return;
      }
      paused = !paused;
      render();
      prependLog(log, "ok", (paused ? "Paused()" : "Unpaused()") + " oleh owner");
    });
  }

  render();
})();

/* ---------- Lab 07: vault dan reentrancy ---------- */

(function initVaultLab() {
  const wrap = $("#lab-vault");
  if (!wrap) return;

  const amountInput = $("#vault-amount");
  const depositButton = $("#vault-deposit");
  const withdrawButton = $("#vault-withdraw");
  const attackButton = $("#vault-attack");
  const mode = $("#vault-mode");
  const status = $("#vault-status");
  const balances = $("#vault-balances");
  const log = $("#vault-log");
  const accountButtons = $$("[data-vault-account]", wrap);

  const names = { alice: "Alice", bob: "Bob", attacker: "Attacker" };
  let account = "alice";
  let accounts = { alice: 10, bob: 10, attacker: 10 };
  let deposits = { alice: 0, bob: 0, attacker: 0 };
  let vault = 0;

  emptyLog(log, "Vault kosong. Setor ETH untuk memulai.");

  const money = (value) => {
    const rounded = Math.round(value * 1e6) / 1e6;
    return rounded.toLocaleString("id-ID", { maximumFractionDigits: 6 });
  };

  const render = () => {
    balances.innerHTML = Object.keys(accounts).map((key) => {
      return '<li><span class="row-main">' + names[key] + '</span>' +
        '<span class="row-meta">wallet ' + money(accounts[key]) + ' ETH · deposit ' + money(deposits[key]) + " ETH</span></li>";
    }).join("") +
      '<li><span class="row-main">Vault</span><span class="row-meta">' + money(vault) + " ETH · total deposit " + money(deposits.alice + deposits.bob + deposits.attacker) + " ETH</span></li>";
  };

  accountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      account = button.dataset.vaultAccount;
      accountButtons.forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
      status.textContent = "Akun: " + names[account] + ". Saldo wallet " + money(accounts[account]) + " ETH.";
      status.className = "status";
    });
  });

  if (depositButton && amountInput) {
    depositButton.addEventListener("click", () => {
      const amount = Number(amountInput.value);
      if (!Number.isFinite(amount) || amount <= 0) {
        status.textContent = "Jumlah harus lebih dari nol.";
        status.className = "status is-bad";
        return;
      }
      if (amount > accounts[account]) {
        status.textContent = "Saldo " + names[account] + " tidak cukup (" + money(accounts[account]) + " ETH).";
        status.className = "status is-bad";
        return;
      }
      accounts[account] -= amount;
      deposits[account] += amount;
      vault += amount;
      render();
      status.textContent = names[account] + " menyetor " + money(amount) + " ETH. msg.value = " + money(amount) + " ether.";
      status.className = "status is-good";
      prependLog(log, "ok", "Deposited(" + names[account] + ", " + money(amount) + " ETH)");
    });
  }

  if (withdrawButton && amountInput) {
    withdrawButton.addEventListener("click", () => {
      const amount = Number(amountInput.value);
      if (!Number.isFinite(amount) || amount <= 0) {
        status.textContent = "Jumlah harus lebih dari nol.";
        status.className = "status is-bad";
        return;
      }
      if (amount > deposits[account]) {
        status.textContent = "revert InsufficientBalance(). Deposit " + names[account] + " hanya " + money(deposits[account]) + " ETH.";
        status.className = "status is-bad";
        prependLog(log, "bad", "revert InsufficientBalance()");
        return;
      }
      deposits[account] -= amount;
      vault -= amount;
      accounts[account] += amount;
      render();
      status.textContent = "Withdraw berhasil. State diperbarui sebelum ETH dikirim.";
      status.className = "status is-good";
      prependLog(log, "ok", "Withdrawn(" + names[account] + ", " + money(amount) + " ETH)");
    });
  }

  if (attackButton && mode) {
    attackButton.addEventListener("click", () => {
      const amount = deposits.attacker;
      if (amount <= 0) {
        status.textContent = "Attacker belum punya deposit. Pilih Attacker, setor ETH, lalu jalankan serangan.";
        status.className = "status is-bad";
        return;
      }

      if (mode.value === "safe") {
        status.textContent = "Serangan gagal. Guard nonReentrant dan state-first menolak panggilan balik. Deposit attacker tetap utuh.";
        status.className = "status is-good";
        prependLog(log, "bad", "revert ReentrantCall() · serangan dibatalkan");
        return;
      }

      let rounds = 0;
      prependLog(log, "bad", "Attacker memanggil withdraw() di dalam receive()");

      while (vault >= amount && rounds < 5) {
        vault -= amount;
        accounts.attacker += amount;
        rounds += 1;
        prependLog(log, "bad", "reentrant withdraw #" + rounds + " · vault " + money(vault) + " ETH");
      }

      deposits.attacker = 0;
      render();
      status.textContent = "Serangan berhasil " + rounds + " kali. Attacker menerima " + money(rounds * amount) + " ETH, vault tersisa " + money(vault) + " ETH. Deposit attacker di-reset setelah loop.";
      status.className = "status is-bad";
    });
  }

  render();
})();

/* ---------- Lab 08: ERC-20 ---------- */

(function initTokenLab() {
  const wrap = $("#lab-erc20");
  if (!wrap) return;

  const action = $("#token-action");
  const fromWrap = $("#token-from-wrap");
  const from = $("#token-from");
  const to = $("#token-to");
  const amountInput = $("#token-amount");
  const run = $("#token-run");
  const status = $("#token-status");
  const log = $("#token-log");
  const toLabel = $("#token-to-label");
  const accountButtons = $$("[data-token-account]", wrap);

  const names = { alice: "Alice", bob: "Bob", carol: "Carol" };
  let account = "alice";
  let balances = { alice: 700, bob: 300, carol: 0 };
  let allowances = {};

  Object.keys(names).forEach((owner) => {
    allowances[owner] = { alice: 0, bob: 0, carol: 0 };
  });

  emptyLog(log, "Belum ada event.");

  const renderBalances = () => {
    Object.keys(names).forEach((key) => {
      const el = $("#token-bal-" + key);
      if (el) el.textContent = String(balances[key]);
    });
    const supply = $("#token-supply");
    if (supply) supply.textContent = String(balances.alice + balances.bob + balances.carol);

    const others = Object.keys(names).filter((key) => key !== account);
    others.forEach((key, index) => {
      const label = $("#token-allow-label-" + index);
      const value = $("#token-allow-" + index);
      if (label) {
        label.textContent = "allowance(" + names[account] + " → " + names[key] + ")";
        label.hidden = false;
      }
      if (value) {
        value.textContent = String(allowances[account][key] || 0);
        value.hidden = false;
      }
    });

    const labelExtra = $("#token-allow-label-" + others.length);
    const valueExtra = $("#token-allow-" + others.length);
    if (labelExtra) {
      labelExtra.hidden = true;
      labelExtra.textContent = "";
    }
    if (valueExtra) {
      valueExtra.hidden = true;
      valueExtra.textContent = "";
    }
  };

  accountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      account = button.dataset.tokenAccount;
      accountButtons.forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
      renderBalances();
      status.textContent = "Akun aktif: " + names[account] + ". Saldo " + balances[account] + " BLJ.";
      status.className = "status";
    });
  });

  const setActionUi = () => {
    const isFrom = action.value === "transferFrom";
    if (fromWrap) fromWrap.hidden = !isFrom;
    if (toLabel) toLabel.textContent = action.value === "approve" ? "Spender" : isFrom ? "Penerima" : "Penerima";
  };

  action.addEventListener("change", setActionUi);

  const fail = (message) => {
    status.textContent = "revert: " + message + ". State tidak berubah.";
    status.className = "status is-bad";
    prependLog(log, "bad", "revert: " + message);
  };

  run.addEventListener("click", () => {
    const amount = Number(amountInput.value);
    const target = to.value;

    if (!Number.isFinite(amount) || amount <= 0) return fail("jumlah harus lebih dari nol");

    if (action.value === "transfer") {
      if (target === account) return fail("tidak bisa transfer ke diri sendiri di lab ini");
      if (balances[account] < amount) return fail("InsufficientBalance()");
      balances[account] -= amount;
      balances[target] += amount;
      renderBalances();
      status.textContent = "Transfer berhasil. " + amount + " BLJ berpindah dari " + names[account] + " ke " + names[target] + ".";
      status.className = "status is-good";
      prependLog(log, "ok", "Transfer(" + names[account] + " → " + names[target] + ", " + amount + ")");
      return;
    }

    if (action.value === "approve") {
      if (target === account) return fail("spender tidak boleh pemilik");
      allowances[account][target] = amount;
      renderBalances();
      status.textContent = "Approve berhasil. " + names[target] + " boleh menarik " + amount + " BLJ dari " + names[account] + ".";
      status.className = "status is-good";
      prependLog(log, "ok", "Approval(" + names[account] + " → " + names[target] + ", " + amount + ")");
      return;
    }

    const owner = from.value;
    if (!owner || !names[owner]) return fail("from tidak valid");
    if (owner === target) return fail("from dan to sama");
    if (allowances[owner][account] < amount) return fail("InsufficientAllowance()");
    if (balances[owner] < amount) return fail("InsufficientBalance()");

    allowances[owner][account] -= amount;
    balances[owner] -= amount;
    balances[target] += amount;
    renderBalances();
    status.textContent = "transferFrom berhasil. " + names[account] + " menarik " + amount + " BLJ milik " + names[owner] + " ke " + names[target] + ".";
    status.className = "status is-good";
    prependLog(log, "ok", "Transfer(" + names[owner] + " → " + names[target] + ", " + amount + ") · allowance " + allowances[owner][account]);
  });

  setActionUi();
  renderBalances();
})();

/* ---------- Lab 09: ERC-721 ---------- */

(function initNftLab() {
  const wrap = $("#lab-erc721");
  if (!wrap) return;

  const mint = $("#nft-mint");
  const status = $("#nft-status");
  const list = $("#nft-list");
  const transferWrap = $("#nft-transfer-wrap");
  const idInput = $("#nft-id");
  const action = $("#nft-action");
  const target = $("#nft-target");
  const run = $("#nft-run");
  const accountButtons = $$("[data-nft-account]", wrap);

  const names = { alice: "Alice", bob: "Bob", carol: "Carol" };
  let account = "alice";
  let nextId = 1;
  let tokens = [];

  const render = () => {
    if (!tokens.length) {
      list.innerHTML = '<li><span class="row-main">Belum ada token.</span><span class="row-meta">totalSupply 0</span></li>';
      if (transferWrap) transferWrap.hidden = true;
      return;
    }

    list.innerHTML = tokens.map((token) => {
      const approved = token.approved ? " · approved " + names[token.approved] : "";
      return "<li><span class=\"row-main\">#" + token.id + " · " + names[token.owner] + "</span>" +
        '<span class="row-meta">' + escapeHtml(token.uri) + approved + "</span></li>";
    }).join("");

    if (transferWrap) transferWrap.hidden = false;
    if (idInput && !tokens.some((token) => token.id === Number(idInput.value))) {
      idInput.value = String(tokens[tokens.length - 1].id);
    }
  };

  accountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      account = button.dataset.nftAccount;
      accountButtons.forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
      status.textContent = "Akun aktif: " + names[account] + ". Mint akan mengirim token ke akun ini.";
      status.className = "status";
    });
  });

  if (mint) {
    mint.addEventListener("click", () => {
      if (nextId > 5) {
        status.textContent = "Lab dibatasi 5 token agar tetap terbaca. Di kontrak nyata, batas ditentukan MAX_SUPPLY.";
        status.className = "status is-bad";
        return;
      }
      const token = {
        id: nextId++,
        owner: account,
        uri: "ipfs://koleksi-belajar/" + (nextId - 1) + ".json",
        approved: null
      };
      tokens.push(token);
      render();
      status.textContent = "_safeMint(" + names[account] + ", " + token.id + ") dan _setTokenURI berhasil. tokenURI: " + token.uri;
      status.className = "status is-good";
    });
  }

  if (run && idInput && action && target) {
    run.addEventListener("click", () => {
      const id = Number(idInput.value);
      const token = tokens.find((item) => item.id === id);
      const to = target.value;

      if (!token) {
        status.textContent = "tokenURI(" + id + ") revert: token tidak ada.";
        status.className = "status is-bad";
        return;
      }

      if (action.value === "approve") {
        if (token.owner !== account) {
          status.textContent = "revert: hanya owner yang bisa approve.";
          status.className = "status is-bad";
          return;
        }
        if (to === token.owner) {
          status.textContent = "revert: tidak bisa approve ke owner sendiri.";
          status.className = "status is-bad";
          return;
        }
        token.approved = to;
        render();
        status.textContent = "approve(" + names[to] + ", " + id + "). " + names[to] + " sekarang boleh memindahkan token ini.";
        status.className = "status is-good";
        return;
      }

      if (token.owner !== account && token.approved !== account) {
        status.textContent = "revert: pemanggil bukan owner atau approved operator.";
        status.className = "status is-bad";
        return;
      }
      if (to === token.owner) {
        status.textContent = "revert: penerima sudah owner.";
        status.className = "status is-bad";
        return;
      }

      const before = token.owner;
      token.owner = to;
      token.approved = null;
      render();
      status.textContent = "transferFrom(" + names[before] + " → " + names[to] + ", " + id + "). Approval dibersihkan.";
      status.className = "status is-good";
    });
  }

  render();
})();

/* ---------- Lab 10: ERC-1155 ---------- */

(function initMultiTokenLab() {
  const wrap = $("#lab-erc1155");
  if (!wrap) return;

  const mint = $("#b1155-mint");
  const send = $("#b1155-send");
  const status = $("#b1155-status");
  const log = $("#b1155-log");
  const otherLabel = $("#b1155-other-label");
  const accountButtons = $$("[data-1155-account]", wrap);

  const inputs = {
    1: $("#b1155-gold-in"),
    2: $("#b1155-silver-in"),
    3: $("#b1155-pass-in")
  };

  let account = "alice";
  let balances = {
    alice: { 1: 0, 2: 0, 3: 0 },
    bob: { 1: 0, 2: 0, 3: 0 }
  };

  emptyLog(log, "Belum ada TransferBatch.");

  const other = () => (account === "alice" ? "bob" : "alice");

  const render = () => {
    for (const id of [1, 2, 3]) {
      const el = $("#b1155-" + (id === 1 ? "gold" : id === 2 ? "silver" : "pass"));
      if (el) el.textContent = String(balances[account][id]);
    }
    const otherTotal = balances[other()][1] + balances[other()][2] + balances[other()][3];
    const el = $("#b1155-bob");
    if (el) el.textContent = String(otherTotal);
    if (otherLabel) otherLabel.textContent = other() === "alice" ? "Alice" : "Bob";
  };

  accountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      account = button.getAttribute("data-1155-account") || "alice";
      accountButtons.forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
      render();
      status.textContent = "Pengirim: " + (account === "alice" ? "Alice" : "Bob") + ". Penerima: " + (other() === "alice" ? "Alice" : "Bob") + ".";
      status.className = "status";
    });
  });

  if (mint) {
    mint.addEventListener("click", () => {
      balances[account][1] += 100;
      balances[account][2] += 250;
      balances[account][3] += 10;
      render();
      status.textContent = "Mint 100 Gold, 250 Silver, dan 10 Pass ke " + (account === "alice" ? "Alice" : "Bob") + ".";
      status.className = "status is-good";
      prependLog(log, "ok", "_mintBatch(" + account + ", [1,2,3], [100,250,10])");
    });
  }

  if (send) {
    send.addEventListener("click", () => {
      const ids = [1, 2, 3];
      const values = ids.map((id) => Number(inputs[id].value) || 0);
      const total = values.reduce((sum, value) => sum + value, 0);

      if (total <= 0) {
        status.textContent = "Jumlah batch kosong. Isi setidaknya satu nilai.";
        status.className = "status is-bad";
        return;
      }

      for (const id of ids) {
        if (values[id - 1] > balances[account][id]) {
          status.textContent = "revert: saldo id " + id + " hanya " + balances[account][id] + ".";
          status.className = "status is-bad";
          return;
        }
      }

      ids.forEach((id, index) => {
        balances[account][id] -= values[index];
        balances[other()][id] += values[index];
      });

      render();
      status.textContent = "safeBatchTransferFrom berhasil. Satu event TransferBatch untuk " + total + " item.";
      status.className = "status is-good";
      prependLog(log, "ok", "TransferBatch(" + (account === "alice" ? "Alice" : "Bob") + " → " + (other() === "alice" ? "Alice" : "Bob") + ", ids [1,2,3], values [" + values.join(",") + "])");
    });
  }

  render();
})();

/* ---------- Uji kompetensi ---------- */

(function initQuiz() {
  const form = $("#quiz-form");
  const submit = $("#quiz-submit");
  const retry = $("#quiz-retry");
  const status = $("#quiz-status");
  const result = $("#quiz-result");
  if (!form || !submit || !status || !result) return;

  const bestKey = "kontrak.quiz.v1";
  const total = 20;
  const currentBest = () => Number(store.get(bestKey, 0)) || 0;

  const questions = [
    {
      q: "Data apa yang bertahan setelah transaksi selesai?",
      options: ["memory", "storage", "calldata", "stack"],
      correct: 1,
      why: "Storage adalah penyimpanan persisten kontrak. Memory dan stack hilang setelah eksekusi, calldata hanya ada selama panggilan."
    },
    {
      q: "Apa yang tidak bisa dilakukan pada mapping?",
      options: ["Menyimpan struct", "Memakai address sebagai key", "Mengiterasi semua key", "Membuat mapping bersarang"],
      correct: 2,
      why: "Mapping tidak menyimpan daftar key, sehingga tidak bisa diiterasi atau dihitung length-nya. Simpan array key terpisah jika butuh enumerasi."
    },
    {
      q: "Simbol _ di dalam modifier menandai?",
      options: ["Akhir fungsi", "Tempat badan fungsi disisipkan", "Error handler", "Return value"],
      correct: 1,
      why: "Kode sebelum _ berjalan sebelum fungsi, kode setelah _ berjalan setelah fungsi. _ adalah titik sisip badan fungsi."
    },
    {
      q: "Apa yang terjadi jika ETH dikirim ke fungsi nonpayable?",
      options: ["ETH disimpan otomatis", "Transaksi revert", "ETH dikembalikan sebagian", "Fungsi tetap jalan tanpa ETH"],
      correct: 1,
      why: "Fungsi tanpa payable menolak msg.value lebih dari nol dan transaksi revert. Gunakan payable, receive, atau fallback payable untuk menerima ETH."
    },
    {
      q: "receive() dipanggil ketika?",
      options: ["Ada calldata apa pun", "Calldata kosong, biasanya dengan ETH", "Hanya saat fungsi tidak ditemukan", "Setiap kali kontrak dipanggil"],
      correct: 1,
      why: "receive khusus untuk panggilan tanpa calldata, biasanya transfer ETH. Fallback menangani calldata tak dikenal."
    },
    {
      q: "transferFrom pada ERC-20 membutuhkan apa selain saldo?",
      options: ["Signature pemilik setiap kali", "Allowance dari pemilik ke spender", "NFT sebagai jaminan", "Gas dua kali lipat"],
      correct: 1,
      why: "Spender harus punya allowance dari pemilik. Jika bukan max, allowance dikurangi sebesar nilai transfer."
    },
    {
      q: "Fungsi mana yang memberi tahu pemilik sebuah NFT?",
      options: ["balanceOf", "ownerOf", "tokenURI", "getApproved"],
      correct: 1,
      why: "ownerOf(tokenId) mengembalikan pemilik token tertentu. balanceOf menghitung jumlah token yang dimiliki satu alamat."
    },
    {
      q: "Keunggulan utama ERC-1155 dibanding ERC-721 untuk banyak jenis item adalah?",
      options: ["Tidak butuh gas", "Transfer dan mint batch", "Tidak butuh metadata", "Otomatis kompatibel dengan semua marketplace"],
      correct: 1,
      why: "ERC-1155 mendukung banyak id dalam satu kontrak dan operasi batch, sehingga menghemat gas. Dukungan marketplace tidak otomatis lebih luas."
    },
    {
      q: "Pada OpenZeppelin v5, constructor Ownable membutuhkan?",
      options: ["Tidak ada argumen", "Alamat owner awal", "Nama token", "Alamat implementation"],
      correct: 1,
      why: "Ownable(address initialOwner) mewajibkan alamat awal. Ini berbeda dari v4 dan sering membuat kode lama gagal compile."
    },
    {
      q: "Keuntungan custom error dibanding string revert adalah?",
      options: ["Bisa dibaca manusia tanpa decoder", "Lebih murah dan bisa membawa data terstruktur", "Otomatis tersimpan di storage", "Tidak membatalkan state"],
      correct: 1,
      why: "Custom error menghemat data dan gas serta bisa membawa argumen. Ia tetap membatalkan state seperti revert lainnya."
    },
    {
      q: "Urutan yang benar untuk mencegah reentrancy adalah?",
      options: ["Interaction, checks, effects", "Effects, checks, interaction", "Checks, effects, interaction", "Checks, interaction, effects"],
      correct: 2,
      why: "Validasi dulu, perbarui state, baru panggil eksternal atau kirim ETH. Ini pola checks-effects-interactions."
    },
    {
      q: "uint8(300) menghasilkan?",
      options: ["300", "44", "255", "Revert"],
      correct: 1,
      why: "Konversi ke uint8 memotong bit atas: 300 modulo 256 = 44. Ini tidak otomatis revert, karena itu berbahaya."
    },
    {
      q: "Kenapa calldata lebih murah daripada memory untuk parameter external?",
      options: ["Karena calldata tidak disalin ke memory", "Karena calldata tidak bisa dibaca", "Karena calldata disimpan permanen", "Karena calldata memakai storage"],
      correct: 0,
      why: "Parameter calldata dibaca langsung dari data panggilan. Memory memerlukan salinan, yang menambah biaya."
    },
    {
      q: "Berapa maksimum parameter indexed pada event biasa?",
      options: ["1", "2", "3", "Tak terbatas"],
      correct: 2,
      why: "Maksimal tiga parameter indexed pada event biasa. Parameter indexed membantu filter, tetapi nilai string atau array disimpan sebagai hash."
    },
    {
      q: "Interface Solidity memiliki ciri?",
      options: ["Boleh punya state variable", "Semua fungsi external dan tanpa implementasi", "Harus punya constructor", "Tidak bisa diwarisi"],
      correct: 1,
      why: "Interface tidak punya state, constructor, atau implementasi. Fungsinya dideklarasikan external dan dipakai untuk berkomunikasi dengan kontrak lain."
    },
    {
      q: "Untuk mengirim ETH dari kontrak, mengapa call lebih disarankan daripada transfer?",
      options: ["Karena call meneruskan gas dan mengembalikan status", "Karena call tidak bisa gagal", "Karena transfer sudah dihapus", "Karena call otomatis menghitung gas"],
      correct: 0,
      why: "call meneruskan sisa gas sehingga penerima kontrak yang butuh lebih dari 2300 gas tetap bisa menerima. call mengembalikan status keberhasilan yang harus kamu periksa. transfer membatasi gas dan bisa membuat dana tidak bisa ditarik oleh kontrak penerima."
    },
    {
      q: "Mengapa tx.origin tidak aman untuk otorisasi?",
      options: ["Karena nilainya selalu nol", "Karena bisa dieksploitasi lewat kontrak perantara", "Karena hanya berlaku di testnet", "Karena tidak bisa dibaca"],
      correct: 1,
      why: "tx.origin adalah EOA pemula transaksi. Kontrak penyerang yang dipanggil pengguna bisa meneruskan panggilan dan tetap lolos pengecekan. Gunakan msg.sender."
    },
    {
      q: "delegatecall menjalankan kode kontrak lain dengan?",
      options: ["Storage kontrak lain", "Storage kontrak pemanggil", "Memory baru tanpa storage", "Salinan kode di memory"],
      correct: 1,
      why: "Delegatecall menjalankan kode target di konteks pemanggil: msg.sender dan storage tetap milik pemanggil. Ini dasar proxy, tetapi berisiko jika layout storage tidak cocok."
    },
    {
      q: "uint128 a dan uint128 b dideklarasikan berurutan. Berapa slot storage minimum?",
      options: ["0", "1", "2", "4"],
      correct: 1,
      why: "Dua uint128 masing-masing 16 byte, total 32 byte, sehingga muat dalam satu slot. Packing hanya berlaku jika ukurannya cukup."
    },
    {
      q: "Function selector adalah?",
      options: ["Nama fungsi lengkap", "Empat byte pertama hash signature fungsi", "Alamat kontrak", "Gas limit fungsi"],
      correct: 1,
      why: "Selector adalah empat byte pertama keccak256 dari signature seperti transfer(address,uint256). Ia dikirim di awal calldata."
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
        '<legend><span class="q-num">' + String(index + 1).padStart(2, "0") + "</span>" + escapeHtml(question.q) + "</legend>" +
        options +
        '<p class="quiz-explain" hidden>' + escapeHtml(question.why) + "</p>" +
        "</fieldset>";
    }).join("");
  };

  const reset = () => {
    form.reset();
    result.innerHTML = "";
    $$(".quiz-q", form).forEach((fieldset) => {
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

    setStatus(
      currentBest() > 0
        ? "Skor terbaik tersimpan: " + currentBest() + " dari " + total + ". Pilih jawaban lalu periksa."
        : "Belum ada jawaban yang diperiksa.",
      ""
    );
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const answers = questions.map((question, index) => {
      const checked = form.querySelector('input[name="q' + (index + 1) + '"]:checked');
      return checked ? Number(checked.value) : -1;
    });

    const unanswered = answers.filter((answer) => answer === -1).length;
    if (unanswered > 0) {
      setStatus("Masih ada " + unanswered + " pertanyaan yang belum dijawab. Lengkapi dulu.", "is-bad");
      const first = answers.findIndex((answer) => answer === -1);
      const fieldset = form.querySelector('[data-q="' + first + '"]');
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

    const previousBest = currentBest();
    const newBest = Math.max(previousBest, score);
    store.set(bestKey, newBest);

    const passed = score >= 16;
    result.innerHTML = '<div class="quiz-summary' + (passed ? "" : " is-fail") + '">' +
      "<h3>Skor " + score + " dari " + total + "</h3>" +
      "<p>" + (passed
        ? "Lulus. Kamu siap membangun dan menguji kontrak, bukan hanya membacanya."
        : "Belum lulus. Baca ulang penjelasan soal yang salah, lalu coba lagi. Tidak ada batas percobaan.") +
      "</p><p>Skor terbaik tersimpan: " + newBest + " dari " + total + ".</p>" +
      "</div>";

    if (passed && typeof window.setProgressDone === "function") {
      window.setProgressDone("uji", true, false);
    }

    setStatus(
      passed ? "Uji kompetensi lulus dan ditandai selesai." : "Jawaban diperiksa. Baca penjelasan setiap soal.",
      passed ? "is-good" : "is-wait"
    );

    result.focus();
  });

  if (retry) {
    retry.addEventListener("click", () => {
      reset();
      const first = $("input", form);
      if (first) first.focus();
    });
  }

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

