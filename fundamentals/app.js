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
      /* Penyimpanan bisa diblokir di mode privat. Lab tetap berjalan di sesi ini. */
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
  toastTimer = window.setTimeout(() => el.classList.remove("is-visible"), 2400);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function groupDigits(text) {
  return String(text).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatNumber(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(value);
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

const pow10 = (decimals) => 10n ** BigInt(decimals);

function parseUnits(value, decimals) {
  const text = String(value).trim().replace(",", ".");
  if (text === "" || !/^\d+(\.\d*)?$/.test(text)) {
    throw new Error("Pakai angka desimal positif, misalnya 1.5 atau 0.0001.");
  }
  const parts = text.split(".");
  const whole = parts[0];
  const fraction = parts[1] || "";
  if (fraction.length > decimals) {
    throw new Error("Jumlah desimal melebihi " + decimals + " digit untuk satuan ini.");
  }
  const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * pow10(decimals) + BigInt(padded || "0");
}

function formatUnits(value, decimals, maxFraction = decimals) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const base = pow10(decimals);
  const whole = absolute / base;
  let fraction = (absolute % base).toString().padStart(decimals, "0");
  fraction = fraction.slice(0, maxFraction).replace(/0+$/, "");
  return (negative ? "-" : "") + whole.toString() + (fraction ? "." + fraction : "");
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
  toast(ok ? "Isi disalin." : "Gagal menyalin.");
  window.setTimeout(() => { button.textContent = original; }, 1600);
});

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
    if (persist) store.set("pondasi.theme", theme);
  };

  apply(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);
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
  const syncInert = () => { sidebar.inert = mobileQuery.matches && !isOpen(); };
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
    input.removeAttribute("aria-expanded");
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
      matches.push({ entry, position, snippet: makeSnippet(entry.text, position, term) });
      if (matches.length >= 8) break;
    }

    if (!matches.length) {
      panel.innerHTML = '<p class="search-empty">Tidak ada hasil untuk "' + escapeHtml(term) + '". Coba "promise", "BigInt", "generics", atau "commit".</p>';
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
  key: "pondasi.progress.v1",
  tracked: $$('main section[data-track="true"]'),
  done: new Set()
};

(function initProgress() {
  const saved = store.get(progressState.key, []);
  if (Array.isArray(saved)) saved.forEach((id) => progressState.done.add(String(id)));

  const bestQuiz = Number(store.get("pondasi.quiz.v1", 0)) || 0;
  if (bestQuiz >= 16) progressState.done.add("uji");

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
      setDone(section.dataset.chapter, !progressState.done.has(section.dataset.chapter), true);
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

/* ---------- Lab hero: presisi Number versus BigInt ---------- */

(function initPrecisionHero() {
  const a = $("#prec-a");
  const b = $("#prec-b");
  const numberOut = $("#prec-number");
  const bigOut = $("#prec-bigint");
  const verdict = $("#prec-verdict");
  if (!a || !b || !numberOut || !bigOut || !verdict) return;

  const render = () => {
    try {
      const left = parseUnits(a.value || "0", 18);
      const right = parseUnits(b.value || "0", 18);
      const exact = left + right;
      const numberSum = Number(a.value || "0") + Number(b.value || "0");
      const exactText = formatUnits(exact, 18);

      numberOut.textContent = String(numberSum);
      bigOut.textContent = exact.toString() + " wei";
      const same = String(numberSum) === exactText;
      verdict.textContent = same
        ? "Untuk nilai ini hasil Number tampak sama. Itu kebetulan representasi, bukan jaminan. Nilai token tetap dihitung dengan BigInt."
        : "Hasil Number dan BigInt tidak sama. Number membulatkan, sedangkan BigInt menjaga nilai exact sampai digit terakhir.";
      verdict.className = "precision-verdict" + (same ? "" : " precision-gap");
      bigOut.innerHTML = exact.toString() + " wei" + '<span class="precision-gap"> = ' + exactText + " ETH</span>";
    } catch (error) {
      numberOut.textContent = "input tidak valid";
      bigOut.textContent = "-";
      verdict.textContent = error.message;
      verdict.className = "precision-verdict";
    }
  };

  a.addEventListener("input", render);
  b.addEventListener("input", render);
  render();
})();

/* ---------- Lab tipe dan kesamaan ---------- */

(function initTypeCheckLab() {
  const rows = $$("#type-check-list .check-row");
  const button = $("#type-check");
  const reset = $("#type-reset");
  const status = $("#type-status");
  if (!rows.length || !button || !status) return;

  const check = () => {
    let correct = 0;
    rows.forEach((row) => {
      const select = $("select", row);
      const why = $(".why", row);
      const answer = row.dataset.answer;
      const value = select ? select.value : "";
      const ok = value === answer;
      row.classList.toggle("is-good", ok);
      row.classList.toggle("is-bad", !ok && value !== "");
      if (why) why.hidden = value === "";
      if (ok) correct += 1;
    });
    status.textContent = correct + " dari " + rows.length + " tepat. Baca alasan di bawah baris yang belum tepat.";
    status.className = "status " + (correct === rows.length ? "is-good" : "is-bad");
  };

  button.addEventListener("click", check);
  if (reset) {
    reset.addEventListener("click", () => {
      rows.forEach((row) => {
        row.classList.remove("is-good", "is-bad");
        const select = $("select", row);
        if (select) select.value = "";
        const why = $(".why", row);
        if (why) why.hidden = true;
      });
      status.textContent = "Belum ada jawaban yang diperiksa.";
      status.className = "status";
    });
  }
})();

/* ---------- Lab closure ---------- */

(function initClosureLab() {
  const add = $("#counter-add");
  const list = $("#counter-list");
  const empty = $("#counter-empty");
  if (!add || !list) return;

  let sequence = 0;

  const createCounter = (start) => {
    let value = start;
    return {
      increment() { value += 1; return value; },
      reset() { value = start; return value; },
      read() { return value; }
    };
  };

  const addCard = () => {
    sequence += 1;
    const start = 0;
    const counter = createCounter(start);
    const card = document.createElement("div");
    card.className = "counter-card";
    card.innerHTML =
      '<h4>createCounter(' + start + ')</h4>' +
      '<span class="counter-value">0</span>' +
      '<div class="counter-actions">' +
        '<button class="btn btn-quiet btn-small" type="button" data-act="inc">+1</button>' +
        '<button class="btn btn-quiet btn-small" type="button" data-act="reset">Reset</button>' +
      "</div>";
    const valueEl = $(".counter-value", card);
    card.addEventListener("click", (event) => {
      const button = event.target.closest("[data-act]");
      if (!button) return;
      const value = button.dataset.act === "inc" ? counter.increment() : counter.reset();
      valueEl.textContent = String(value);
    });
    list.appendChild(card);
    if (empty) empty.hidden = true;
  };

  add.addEventListener("click", addCard);
  addCard();
  addCard();
})();

/* ---------- Lab pipeline data ---------- */

(function initPipelineLab() {
  const statusFilter = $("#pipe-status");
  const typeFilter = $("#pipe-type");
  const sortSelect = $("#pipe-sort");
  const addButton = $("#pipe-add");
  const resetButton = $("#pipe-reset");
  const list = $("#pipe-list");
  const output = $("#pipe-output");
  const code = $("#pipe-code");
  if (!statusFilter || !typeFilter || !list || !output) return;

  const base = [
    { id: 1, type: "deposit", status: "ok", amount: "1500000000000000000" },
    { id: 2, type: "withdraw", status: "ok", amount: "400000000000000000" },
    { id: 3, type: "deposit", status: "failed", amount: "900000000000000000" },
    { id: 4, type: "deposit", status: "ok", amount: "250000000000000000" }
  ];

  let transactions = base.slice();
  let nextId = 5;

  const render = () => {
    const status = statusFilter.value;
    const type = typeFilter.value;
    const sortMode = sortSelect ? sortSelect.value : "newest";

    let filtered = transactions.filter((tx) => status === "all" || tx.status === status);
    if (type !== "all") filtered = filtered.filter((tx) => tx.type === type);
    if (sortMode === "largest") {
      filtered = filtered.slice().sort((left, right) => (BigInt(right.amount) > BigInt(left.amount) ? 1 : -1));
    } else {
      filtered = filtered.slice().sort((left, right) => right.id - left.id);
    }

    const total = filtered.reduce(
      (sum, tx) => (tx.status === "ok" ? sum + BigInt(tx.amount) : sum),
      0n
    );

    list.innerHTML = filtered.length ? filtered.map((tx) => {
      return "<li><span>" + escapeHtml(tx.type) +
        '<span class="tx-tag">' + escapeHtml(tx.status) + "</span></span>" +
        '<span class="tx-amount">' + formatUnits(BigInt(tx.amount), 18, 6) + " ETH</span></li>";
    }).join("") : '<li><span>Tidak ada transaksi yang lolos filter.</span><span></span></li>';

    output.innerHTML =
      "filtered.length = " + filtered.length + "\n" +
      "reduce(BigInt)    = " + total.toString() + " wei\n" +
      '<span class="pipeline-total">total sukses = ' + formatUnits(total, 18, 6) + " ETH</span>";

    if (code) {
      const statusLine = status === "all"
        ? "  // semua status ditampilkan\n"
        : '  .filter((tx) => tx.status === "' + status + '")\n';
      const typeLine = type === "all"
        ? ""
        : '  .filter((tx) => tx.type === "' + type + '")\n';

      const comparator = sortMode === "largest"
        ? "(a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : -1)"
        : "(a, b) => b.id - a.id";

      code.textContent =
        "const visible = transactions\n" +
        statusLine +
        typeLine +
        "  .sort(" + comparator + ");\n\n" +
        "const total = visible\n" +
        '  .filter((tx) => tx.status === "ok")\n' +
        "  .reduce((sum, tx) => sum + BigInt(tx.amount), 0n);\n\n" +
        "// total: " + total.toString() + "n";
    }
  };

  statusFilter.addEventListener("change", render);
  typeFilter.addEventListener("change", render);
  if (sortSelect) sortSelect.addEventListener("change", render);

  if (addButton) {
    addButton.addEventListener("click", () => {
      const isDeposit = Math.random() > 0.4;
      const ok = Math.random() > 0.2;
      const amount = BigInt(Math.floor(1 + Math.random() * 8)) * 10n ** 17n;
      transactions.push({
        id: nextId,
        type: isDeposit ? "deposit" : "withdraw",
        status: ok ? "ok" : "failed",
        amount: amount.toString()
      });
      nextId += 1;
      render();
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      transactions = base.slice();
      nextId = 5;
      statusFilter.value = "all";
      typeFilter.value = "all";
      if (sortSelect) sortSelect.value = "newest";
      render();
    });
  }

  render();
})();

/* ---------- Lab event loop ---------- */

(function initEventLoopLab() {
  const rows = $$("#event-rows .event-row");
  const check = $("#event-check");
  const run = $("#event-run");
  const reset = $("#event-reset");
  const actual = $("#event-actual");
  const status = $("#event-status");
  if (!rows.length || !check || !run) return;

  const labels = {
    "1": "A. console.log(\"A\")",
    "2": "B. Promise.then",
    "3": "C. setTimeout 0",
    "4": "D. console.log(\"D\")"
  };

  check.addEventListener("click", () => {
    let correct = 0;
    const used = new Set();
    rows.forEach((row) => {
      const select = $("select", row);
      const value = select ? select.value : "";
      if (value) used.add(value);
      const ok = value === row.dataset.answer;
      row.classList.toggle("is-good", ok);
      row.classList.toggle("is-bad", !ok && value !== "");
      if (ok) correct += 1;
    });
    if (status) {
      const duplicate = used.size !== rows.filter((row) => $("select", row).value).length;
      status.textContent = duplicate
        ? "Ada urutan yang dipakai dua kali. Setiap log hanya muncul sekali."
        : correct + " dari " + rows.length + " posisi tepat. Urutan sebenarnya ditentukan call stack, microtask, lalu timer.";
      status.className = "status " + (correct === rows.length && !duplicate ? "is-good" : "is-bad");
    }
  });

  run.addEventListener("click", () => {
    const events = [];
    const start = performance.now();
    const mark = (text) => events.push({ text, time: performance.now() - start });

    mark('console.log("A")');
    Promise.resolve().then(() => {
      mark('Promise.then(() => console.log("B"))');
    });
    window.setTimeout(() => {
      mark('setTimeout(() => console.log("C"), 0)');
    }, 0);
    mark('console.log("D")');

    if (actual) {
      actual.textContent = "Menjalankan...";
      window.setTimeout(() => {
        actual.textContent = events.map((event, index) => {
          return (index + 1) + ". " + event.time.toFixed(2) + " ms  " + event.text;
        }).join("\n");
      }, 60);
    }
    if (status) {
      status.textContent = "Urutan dijalankan di browser ini. Microtask Promise selalu mendahului timer 0 ms.";
      status.className = "status is-good";
    }
  });

  if (reset) {
    reset.addEventListener("click", () => {
      rows.forEach((row) => {
        row.classList.remove("is-good", "is-bad");
        const select = $("select", row);
        if (select) select.value = "";
      });
      if (actual) actual.textContent = "Belum dijalankan.";
      if (status) {
        status.textContent = "Belum ada jawaban yang diperiksa.";
        status.className = "status";
      }
    });
  }
})();

/* ---------- Lab async ---------- */

(function initAsyncLab() {
  const latency = $("#async-latency");
  const latencyOut = $("#async-latency-out");
  const fail = $("#async-fail");
  const mode = $("#async-mode");
  const run = $("#async-run");
  const abort = $("#async-abort");
  const log = $("#async-log");
  const data = $("#async-data");
  const status = $("#async-status");
  const pills = $$(".state-pill");
  if (!latency || !run || !log || !mode) return;

  let controller = null;
  let running = false;

  const setState = (state) => {
    pills.forEach((pill) => pill.classList.toggle("is-active", pill.dataset.state === state));
  };

  const append = (text, kind) => {
    const line = document.createElement("span");
    line.className = "log-line" + (kind ? " log-" + kind : "");
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  };

  const stamp = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const wait = (ms, signal, label) => {
    return new Promise((resolve, reject) => {
      if (signal && signal.aborted) {
        reject(new DOMException("Request dibatalkan.", "AbortError"));
        return;
      }
      const timer = window.setTimeout(() => {
        if (signal) signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        window.clearTimeout(timer);
        reject(new DOMException("Request dibatalkan.", "AbortError"));
      };
      if (signal) signal.addEventListener("abort", onAbort, { once: true });
      if (label) append("  " + label + " menunggu " + ms + " ms...");
    });
  };

  const request = async (name, ms, signal) => {
    append("fetch(" + name + ") dimulai", "");
    await wait(ms, signal, name);
    if (fail && fail.checked) {
      throw new Error("HTTP 503 dari " + name);
    }
    append("fetch(" + name + ") selesai", "good");
    return { name, latencyMs: ms, ok: true };
  };

  const finish = () => {
    running = false;
    run.disabled = false;
    if (abort) abort.disabled = true;
    controller = null;
  };

  const execute = async () => {
    if (running) return;
    running = true;
    run.disabled = true;
    if (abort) abort.disabled = false;
    log.textContent = "";
    data.textContent = "";
    setState("loading");
    if (status) {
      status.textContent = "Menunggu respons. Perhatikan urutan log dan tombol batalkan.";
      status.className = "status is-wait";
    }

    controller = new AbortController();
    const signal = controller.signal;
    const base = Number(latency.value);
    const started = performance.now();
    append("[" + stamp() + "] mulai, mode " + mode.value, "");

    try {
      let result;
      if (mode.value === "parallel") {
        result = await Promise.all([
          request("/api/tokens", base, signal),
          request("/api/prices", Math.round(base * 1.35), signal),
          request("/api/gas", Math.round(base * 0.75), signal)
        ]);
        append("Promise.all selesai. Total mendekati request paling lambat.", "good");
      } else if (mode.value === "serial") {
        result = [];
        result.push(await request("/api/tokens", base, signal));
        result.push(await request("/api/prices", Math.round(base * 1.35), signal));
        result.push(await request("/api/gas", Math.round(base * 0.75), signal));
        append("Tiga await berurutan selesai. Total adalah jumlah semua latency.", "good");
      } else {
        result = [await request("/api/tokens", base, signal)];
      }

      const elapsed = Math.round(performance.now() - started);
      append("[" + stamp() + "] selesai dalam " + elapsed + " ms", "good");
      data.textContent = JSON.stringify(result, null, 2);
      setState("success");
      if (status) {
        status.textContent = "Sukses setelah " + elapsed + " ms. Bandingkan mode berurutan dan paralel untuk melihat bedanya.";
        status.className = "status is-good";
      }
    } catch (error) {
      const aborted = error && error.name === "AbortError";
      append("[" + stamp() + "] " + (aborted ? "dibatalkan oleh AbortController" : "error: " + error.message), "bad");
      data.textContent = aborted ? "Tidak ada data. finally tetap berjalan." : JSON.stringify({ error: error.message }, null, 2);
      setState(aborted ? "idle" : "error");
      if (status) {
        status.textContent = aborted
          ? "Request dibatalkan. finally membersihkan state dan mengaktifkan tombol lagi."
          : "Gagal. try/catch menangkap error, state error ditampilkan, dan percobaan ulang tetap mungkin.";
        status.className = "status " + (aborted ? "is-wait" : "is-bad");
      }
    } finally {
      append("finally: state dibersihkan", "");
      finish();
    }
  };

  latency.addEventListener("input", () => {
    if (latencyOut) latencyOut.textContent = latency.value + " ms";
  });

  run.addEventListener("click", execute);
  if (abort) {
    abort.addEventListener("click", () => {
      if (controller) controller.abort();
    });
  }

  if (latencyOut) latencyOut.textContent = latency.value + " ms";
  setState("idle");
})();

/* ---------- Lab JSON ---------- */

(function initJsonLab() {
  const input = $("#json-input");
  const output = $("#json-output");
  const format = $("#json-format");
  const minify = $("#json-minify");
  const validate = $("#json-validate");
  const broken = $("#json-broken");
  const reset = $("#json-reset");
  const status = $("#json-status");
  const meta = $("#json-meta");
  if (!input || !output) return;

  const sample = {
    token: "MiniVault",
    chainId: 11155111,
    decimals: 18,
    supplyWei: "1000000000000000000000000",
    verified: true,
    tags: ["erc20", "testnet"],
    owner: null
  };

  const describe = (value) => {
    if (Array.isArray(value)) return "array (" + value.length + " item)";
    if (value === null) return "null";
    return typeof value;
  };

  const showError = (error, text) => {
    if (status) {
      status.className = "status is-bad";
      let detail = error.message;
      const positionMatch = detail.match(/position (\d+)/);
      if (positionMatch && !/line \d+ column \d+/i.test(detail)) {
        const position = Number(positionMatch[1]);
        const before = text.slice(0, position);
        const line = before.split("\n").length;
        const column = position - before.lastIndexOf("\n");
        detail += " (baris " + line + ", kolom " + column + ")";
      }
      status.textContent = "JSON tidak valid: " + detail;
    }
    output.textContent = "Tidak ada output. Perbaiki teks JSON lalu periksa lagi.";
    if (meta) meta.textContent = "0 karakter";
  };

  const parse = () => JSON.parse(input.value);

  const renderParsed = (value) => {
    output.textContent = JSON.stringify(value, null, 2);
    const keys = value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];
    if (meta) {
      meta.textContent = describe(value) + " · " + keys.length + " kunci · " +
        new Blob([input.value]).size + " byte";
    }
    if (status) {
      status.className = "status is-good";
      status.textContent = "JSON valid. Nilai sudah di-parse menjadi objek JavaScript di memori.";
    }
  };

  const action = (kind) => {
    const text = input.value.trim();
    if (!text) {
      if (status) {
        status.className = "status is-bad";
        status.textContent = "Editor masih kosong.";
      }
      return;
    }
    try {
      const value = parse();
      if (kind === "minify") {
        output.textContent = JSON.stringify(value);
        if (status) {
          status.className = "status is-good";
          status.textContent = "JSON valid dan diminify. Ukuran lebih kecil, tetapi tidak ramah dibaca manusia.";
        }
        if (meta) meta.textContent = describe(value) + " · " + new Blob([JSON.stringify(value)]).size + " byte";
      } else {
        renderParsed(value);
      }
    } catch (error) {
      showError(error, text);
    }
  };

  if (format) format.addEventListener("click", () => action("format"));
  if (minify) minify.addEventListener("click", () => action("minify"));
  if (validate) validate.addEventListener("click", () => action("format"));

  if (broken) {
    broken.addEventListener("click", () => {
      input.value = '{\n  "token": "MiniVault",\n  "decimals": 18,\n  "supplyWei": 1000000000000000000000000n,\n  "verified": true\n}';
      action("format");
    });
  }

  if (reset) {
    reset.addEventListener("click", () => {
      input.value = JSON.stringify(sample, null, 2);
      action("format");
    });
  }

  input.addEventListener("input", () => {
    if (status) {
      status.className = "status";
      status.textContent = "Belum diperiksa. Tekan Rapikan atau Periksa.";
    }
  });

  input.value = JSON.stringify(sample, null, 2);
  action("format");
})();

/* ---------- Lab inspector API ---------- */

(function initApiLab() {
  const method = $("#api-method");
  const statusSelect = $("#api-status");
  const run = $("#api-run");
  const response = $("#api-response");
  const verdict = $("#api-verdict");
  const badge = $("#api-badge");
  const checklist = $("#api-checklist");
  if (!method || !statusSelect || !run || !response) return;

  const scenarios = {
    "200": {
      body: { data: [{ symbol: "ETH", decimals: 18, supplyWei: "120000000000000000000000000" }] },
      title: "OK. Request berhasil dan body berisi data.",
      actions: ["Periksa bentuk data sebelum dipakai.", "Validasi field di runtime, jangan hanya percaya tipe TypeScript.", "Simpan nilai besar sebagai string atau bigint, bukan number."]
    },
    "201": {
      body: { id: "tok_01", created: true },
      title: "Created. Server membuat resource baru.",
      actions: ["Bacaan berhasil, tetapi status bukan 200.", "Gunakan res.ok untuk menerima seluruh kelas 2xx.", "Baca header Location jika API menyediakannya."]
    },
    "204": {
      body: null,
      title: "No Content. Sukses tanpa body.",
      actions: ["Jangan memanggil response.json() tanpa memeriksa isi.", "res.ok tetap true karena 204 termasuk 2xx.", "Gunakan status untuk membedakan 200 dan 204."]
    },
    "400": {
      body: { error: "invalid_amount", message: "amountWei harus bilangan bulat positif" },
      title: "Bad Request. Input ditolak.",
      actions: ["fetch tidak reject untuk 4xx.", "Periksa res.ok dan body error.", "Perbaiki input, jangan retry otomatis."]
    },
    "401": {
      body: { error: "unauthorized" },
      title: "Unauthorized. Kredensial tidak ada atau kedaluwarsa.",
      actions: ["Jangan retry berulang tanpa login ulang.", "Jangan menaruh token rahasia di kode client.", "Arahkan pengguna ke alur autentikasi."]
    },
    "404": {
      body: { error: "not_found" },
      title: "Not Found. Resource tidak ada.",
      actions: ["Tampilkan empty state, bukan spinner tanpa akhir.", "Jangan retry kecuali resource memang baru dibuat.", "Periksa path dan query."]
    },
    "429": {
      body: { error: "rate_limited", retryAfter: 30 },
      title: "Too Many Requests. Kuota terlampaui.",
      actions: ["Baca header Retry-After.", "Tunggu sebelum mencoba lagi.", "Kurangi frekuensi polling dan tambahkan cache."]
    },
    "500": {
      body: { error: "internal_error" },
      title: "Internal Server Error. Kesalahan di server.",
      actions: ["Jangan tampilkan detail mentah ke pengguna.", "Retry terbatas dengan backoff.", "Catat request id bila tersedia."]
    },
    "503": {
      body: { error: "service_unavailable", retryAfter: 10 },
      title: "Service Unavailable. Server sementara tidak siap.",
      actions: ["Retry dengan backoff dan batas percobaan.", "Tampilkan status yang jujur.", "Jangan membanjiri server dengan percobaan cepat."]
    },
    network: {
      body: null,
      title: "Jaringan gagal. fetch reject, bukan response 4xx atau 5xx.",
      actions: ["Tangkap error di catch.", "Bedakan offline, DNS, timeout, dan pembatalan.", "Gunakan AbortController untuk batas waktu."]
    }
  };

  const render = () => {
    const selected = statusSelect.value;
    const scenario = scenarios[selected];
    const isNetwork = selected === "network";
    const code = isNetwork ? 0 : Number(selected);
    const ok = !isNetwork && code >= 200 && code < 300;
    const methodName = method.value;

    if (isNetwork) {
      response.textContent = "TypeError: fetch failed\n\nTidak ada HTTP status. Permintaan tidak pernah mendapat respons.";
    } else if (scenario.body === null) {
      response.textContent = methodName + " /api/tokens HTTP/" + code + "\ncontent-type: text/plain\ncontent-length: 0\n\n(tidak ada body)";
    } else {
      response.textContent = methodName + " /api/tokens HTTP/" + code + "\ncontent-type: application/json\n\n" + JSON.stringify(scenario.body, null, 2);
    }

    if (badge) {
      badge.textContent = isNetwork ? "network error" : "HTTP " + code;
      badge.className = "api-badge " + (ok ? "is-good" : "is-bad");
    }
    if (verdict) {
      verdict.textContent = scenario.title + (isNetwork ? "" : " res.ok = " + ok + ".");
      verdict.className = "status " + (ok ? "is-good" : "is-bad");
    }
    if (checklist) {
      checklist.innerHTML = scenario.actions.map((item) => "<li>" + escapeHtml(item) + "</li>").join("");
    }
  };

  run.addEventListener("click", render);
  statusSelect.addEventListener("change", render);
  method.addEventListener("change", render);
  render();
})();

/* ---------- Lab BigInt dan wei ---------- */

(function initWeiLab() {
  const input = $("#wei-input");
  const decimals = $("#wei-decimals");
  const direction = $("#wei-dir");
  const weiOut = $("#wei-wei");
  const ethOut = $("#wei-eth");
  const numberOut = $("#wei-number");
  const status = $("#wei-status");
  if (!input || !decimals || !direction || !weiOut || !ethOut || !status) return;

  const samples = $$("[data-wei-sample]");

  const render = () => {
    const dec = Number(decimals.value);
    const raw = input.value.trim();
    weiOut.textContent = "-";
    ethOut.textContent = "-";
    if (numberOut) numberOut.textContent = "-";
    try {
      let wei;
      if (direction.value === "wei2eth") {
        if (!/^\d+$/.test(raw)) throw new Error("Mode wei ke ETH membutuhkan bilangan bulat tanpa titik atau tanda minus.");
        wei = BigInt(raw);
        ethOut.textContent = formatUnits(wei, dec, dec) + " ETH";
      } else {
        wei = parseUnits(raw, dec);
        ethOut.textContent = formatUnits(wei, dec, dec) + " ETH";
      }
      weiOut.textContent = wei.toString() + " wei";
      if (numberOut) {
        const asNumber = Number(wei);
        const exactAsNumber = BigInt(asNumber) === wei;
        numberOut.textContent = Number.isSafeInteger(asNumber)
          ? String(asNumber) + " (masih aman)"
          : String(asNumber) + (exactAsNumber
            ? " (di luar safe range, jangan dipakai)"
            : " (dibulatkan, jangan dipakai)");
      }
      status.className = "status is-good";
      status.textContent = "Konversi exact. " + groupDigits(wei.toString()) + " wei sama dengan " +
        formatUnits(wei, dec, dec) + " ETH pada " + dec + " desimal.";
    } catch (error) {
      status.className = "status is-bad";
      status.textContent = error.message;
    }
  };

  input.addEventListener("input", render);
  decimals.addEventListener("change", render);
  direction.addEventListener("change", render);

  samples.forEach((button) => {
    button.addEventListener("click", () => {
      direction.value = "eth2wei";
      decimals.value = "18";
      input.value = button.dataset.weiSample;
      render();
    });
  });

  render();
})();

/* ---------- Lab batas integer aman ---------- */

(function initSafeIntegerLab() {
  const input = $("#safe-input");
  const numberOut = $("#safe-number");
  const bigOut = $("#safe-bigint");
  const checkOut = $("#safe-check");
  const diffOut = $("#safe-diff");
  const status = $("#safe-status");
  if (!input || !numberOut || !bigOut) return;

  const render = () => {
    const text = input.value.trim();
    try {
      if (!/^-?\d+$/.test(text)) throw new Error("Masukkan bilangan bulat, tanpa titik desimal.");
      const big = BigInt(text);
      const asNumber = Number(big);
      const exactText = big.toString();
      const numberText = String(asNumber);
      const safe = Number.isSafeInteger(asNumber) && numberText === exactText;
      const diff = BigInt(asNumber) - big;
      const absoluteDiff = diff < 0n ? -diff : diff;
      const direction = diff < 0n ? "lebih kecil" : "lebih besar";

      numberOut.textContent = numberText;
      bigOut.textContent = (big + 1n).toString();
      if (checkOut) {
        checkOut.textContent = safe ? "aman" : "tidak aman";
        const cell = checkOut.closest(".safe-cell");
        if (cell) cell.classList.toggle("is-bad", !safe);
      }
      if (diffOut) {
        diffOut.textContent = diff === 0n ? "0" : absoluteDiff.toString() + " (" + direction + ")";
      }
      if (status) {
        status.className = "status " + (safe ? "is-good" : "is-bad");
        status.textContent = safe
          ? "Masih di bawah 2^53 - 1. Number dan BigInt menunjuk nilai yang sama."
          : "Number membulatkan nilai ini " + direction + " " + absoluteDiff.toString() + ". BigInt tetap exact. Jangan memakai Number untuk wei.";
      }
    } catch (error) {
      if (status) {
        status.className = "status is-bad";
        status.textContent = error.message;
      }
    }
  };

  input.addEventListener("input", render);
  render();
})();

/* ---------- Lab TypeScript narrowing ---------- */

(function initNarrowingLab() {
  const rows = $$("#narrow-list .check-row");
  const check = $("#narrow-check");
  const reset = $("#narrow-reset");
  const status = $("#narrow-status");
  if (!rows.length || !check || !status) return;

  check.addEventListener("click", () => {
    let correct = 0;
    rows.forEach((row) => {
      const select = $("select", row);
      const why = $(".why", row);
      const ok = select && select.value === row.dataset.answer;
      row.classList.toggle("is-good", ok);
      row.classList.toggle("is-bad", !ok && select && select.value !== "");
      if (why) why.hidden = !select || select.value === "";
      if (ok) correct += 1;
    });
    status.textContent = correct + " dari " + rows.length + " tepat. Discriminant harus sempit, bukan string bebas.";
    status.className = "status " + (correct === rows.length ? "is-good" : "is-bad");
  });

  if (reset) {
    reset.addEventListener("click", () => {
      rows.forEach((row) => {
        row.classList.remove("is-good", "is-bad");
        const select = $("select", row);
        if (select) select.value = "";
        const why = $(".why", row);
        if (why) why.hidden = true;
      });
      status.textContent = "Belum ada jawaban yang diperiksa.";
      status.className = "status";
    });
  }
})();

/* ---------- Lab utility types ---------- */

(function initUtilityLab() {
  const mode = $("#util-mode");
  const partial = $("#util-partial");
  const readonly = $("#util-readonly");
  const record = $("#util-record");
  const output = $("#util-output");
  const fields = $$("#util-fields input[type=checkbox]");
  if (!mode || !output) return;

  const baseFields = [
    ["id", "string"],
    ["name", "string"],
    ["symbol", "string"],
    ["decimals", "number"],
    ["supplyWei", "bigint"]
  ];

  const render = () => {
    const selected = fields.filter((field) => field.checked).map((field) => field.value);
    const chosen = baseFields.filter((field) => selected.includes(field[0]));
    const selectedList = chosen.map((field) => '"' + field[0] + '"').join(" | ");

    let inner;
    if (mode.value === "none") {
      inner = "Token";
    } else if (mode.value === "pick") {
      inner = selectedList ? "Pick<Token, " + selectedList + ">" : "{}";
    } else {
      inner = selectedList ? "Omit<Token, " + selectedList + ">" : "Token";
    }

    if (partial && partial.checked) inner = "Partial<" + inner + ">";
    if (readonly && readonly.checked) inner = "Readonly<" + inner + ">";

    const lines = [
      "interface Token {",
      '  id: string;',
      '  name: string;',
      '  symbol: string;',
      '  decimals: number;',
      '  supplyWei: bigint;',
      "}",
      "",
      "type TokenView = " + inner + ";"
    ];

    if (record && record.checked) {
      lines.push("");
      lines.push('type TokenMap = Record<"ethereum" | "sepolia", TokenView>;');
      lines.push("");
      lines.push("// TokenMap.ethereum dan TokenMap.sepolia bertipe sama,");
      lines.push("// sehingga chain yang lupa ditambahkan langsung ditolak compiler.");
    }

    output.textContent = lines.join("\n");
  };

  mode.addEventListener("change", render);
  if (partial) partial.addEventListener("change", render);
  if (readonly) readonly.addEventListener("change", render);
  if (record) record.addEventListener("change", render);
  fields.forEach((field) => field.addEventListener("change", render));
  render();
})();

/* ---------- Lab Git staging ---------- */

(function initGitLab() {
  const board = $("#git-board");
  const consoleEl = $("#git-console");
  const message = $("#git-message");
  const addAll = $("#git-add-all");
  const commit = $("#git-commit");
  const statusButton = $("#git-status");
  const logButton = $("#git-log");
  const resetButton = $("#git-reset");
  if (!board || !consoleEl) return;

  const initial = [
    { path: "app/page.tsx", state: "modified", staged: false, committed: false, ignored: false, tracked: true },
    { path: "lib/format.ts", state: "untracked", staged: false, committed: false, ignored: false, tracked: false },
    { path: "README.md", state: "modified", staged: false, committed: false, ignored: false, tracked: true },
    { path: ".env.local", state: "untracked", staged: false, committed: false, ignored: true, tracked: false },
    { path: ".gitignore", state: "clean", staged: false, committed: true, ignored: false, tracked: true }
  ];

  let files = initial.map((file) => ({ ...file }));
  let commits = [{ hash: "a1b2c3d", message: "chore: mulai proyek" }];
  let hashCounter = 1;

  const log = (text) => {
    consoleEl.textContent += (consoleEl.textContent ? "\n" : "") + text;
    consoleEl.scrollTop = consoleEl.scrollHeight;
  };

  const render = () => {
    const working = files.filter((file) => !file.staged && !file.committed && !file.ignored);
    const staged = files.filter((file) => file.staged && !file.committed);
    const ignored = files.filter((file) => file.ignored);
    const last = commits[commits.length - 1];

    const item = (file, column) => {
      let actions = "";
      if (column === "working") {
        actions = '<div class="git-file-actions">' +
          '<button type="button" data-git="add" data-path="' + escapeHtml(file.path) + '">add</button>' +
          (file.tracked ? '<button type="button" data-git="restore" data-path="' + escapeHtml(file.path) + '">restore</button>' : "") +
          "</div>";
      } else if (column === "staged") {
        actions = '<div class="git-file-actions"><button type="button" data-git="unstage" data-path="' + escapeHtml(file.path) + '">unstage</button></div>';
      }
      return "<li>" + escapeHtml(file.path) + '<span class="git-state">' + escapeHtml(file.state) + "</span>" + actions + "</li>";
    };

    board.innerHTML =
      '<div class="git-col"><h4>Working tree</h4><ul>' +
        (working.length ? working.map((file) => item(file, "working")).join("") : '<li>bersih</li>') +
        ignored.map((file) => '<li class="is-ignored">' + escapeHtml(file.path) + '<span class="git-state">ignored</span></li>').join("") +
      "</ul></div>" +
      '<div class="git-col"><h4>Staging / index</h4><ul>' +
        (staged.length ? staged.map((file) => item(file, "staged")).join("") : "<li>kosong</li>") +
      "</ul></div>" +
      '<div class="git-col"><h4>Commit terakhir</h4><ul>' +
        '<li>' + escapeHtml(last.hash) + " " + escapeHtml(last.message) + '<span class="git-state">' +
        commits.length + " commit</span></li>" +
        files.filter((file) => file.committed).map((file) => "<li>" + escapeHtml(file.path) + '<span class="git-state">committed</span></li>').join("") +
      "</ul></div>";
  };

  const find = (path) => files.find((file) => file.path === path);

  board.addEventListener("click", (event) => {
    const button = event.target.closest("[data-git]");
    if (!button) return;
    const file = find(button.dataset.path);
    if (!file) return;
    const action = button.dataset.git;

    if (action === "add") {
      file.staged = true;
      file.state = "staged";
      log("$ git add " + file.path);
    } else if (action === "restore") {
      file.state = "clean";
      file.staged = false;
      log("$ git restore " + file.path);
      log("Perubahan di working tree dibuang. Tidak ada yang berubah di commit.");
    } else if (action === "unstage") {
      file.staged = false;
      file.state = file.tracked ? "modified" : "untracked";
      log("$ git restore --staged " + file.path);
    }
    render();
  });

  if (addAll) {
    addAll.addEventListener("click", () => {
      log("$ git add .");
      files.forEach((file) => {
        if (file.ignored) {
          log("skip " + file.path + " (cocok dengan .gitignore)");
          return;
        }
        if (!file.committed) {
          file.staged = true;
          file.state = "staged";
        }
      });
      render();
    });
  }

  if (commit) {
    commit.addEventListener("click", () => {
      const staged = files.filter((file) => file.staged && !file.committed);
      const text = message ? message.value.trim() : "";
      if (!staged.length) {
        log("$ git commit -m \"" + (text || "...") + "\"");
        log("nothing to commit, working tree clean (tidak ada di staging)");
        return;
      }
      if (!text) {
        log("$ git commit");
        log("Aborting commit due to empty commit message.");
        if (message) message.focus();
        return;
      }

      hashCounter += 1;
      const hash = (1600000 + hashCounter * 7919).toString(16).slice(0, 7);
      commits.push({ hash, message: text });
      staged.forEach((file) => {
        file.staged = false;
        file.committed = true;
        file.state = "clean";
      });
      log("$ git commit -m \"" + text + "\"");
      log("[" + hash + "] " + staged.length + " file berubah");
      if (message) message.value = "";
      render();
    });
  }

  if (statusButton) {
    statusButton.addEventListener("click", () => {
      log("$ git status");
      const working = files.filter((file) => !file.staged && !file.committed && !file.ignored);
      const staged = files.filter((file) => file.staged && !file.committed);
      log(working.length ? "Changes not staged for commit:" : "nothing to commit, working tree clean");
      working.forEach((file) => log("  " + file.state + ": " + file.path));
      staged.forEach((file) => log("  staged: " + file.path));
    });
  }

  if (logButton) {
    logButton.addEventListener("click", () => {
      log("$ git log --oneline");
      commits.slice().reverse().forEach((entry) => log(entry.hash + " " + entry.message));
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      files = initial.map((file) => ({ ...file }));
      commits = [{ hash: "a1b2c3d", message: "chore: mulai proyek" }];
      hashCounter = 1;
      consoleEl.textContent = "";
      log("Lab direset. Belum ada perintah dijalankan.");
      render();
    });
  }

  log("$ git status");
  log("Working tree bersih? Belum. Ada file yang belum di-stage.");
  render();
})();

/* ---------- Checklist proyek ---------- */

(function initProjectGate() {
  const checks = $$("#gate-list input[type=checkbox]");
  const text = $("#gate-text");
  const fill = $("#gate-fill");
  const status = $("#gate-status");
  if (!checks.length) return;

  const key = "pondasi.project.v1";
  const saved = store.get(key, []);
  const done = new Set(Array.isArray(saved) ? saved.map(String) : []);

  const render = () => {
    const count = checks.filter((check) => check.checked).length;
    if (text) text.textContent = count + " dari " + checks.length + " kriteria";
    if (fill) fill.style.width = Math.round((count / checks.length) * 100) + "%";
    const bar = $(".gate-bar");
    if (bar) {
      bar.setAttribute("aria-valuenow", String(count));
      bar.setAttribute("aria-valuetext", count + " dari " + checks.length + " kriteria selesai");
    }
    if (status) {
      status.className = "status " + (count === checks.length ? "is-good" : "");
      status.textContent = count === checks.length
        ? "Gate lengkap. Proyek siap dijalankan dan dijelaskan ulang tanpa membuka catatan."
        : "Centang hanya kriteria yang benar-benar sudah kamu buktikan di proyekmu.";
    }
  };

  checks.forEach((check) => {
    check.checked = done.has(check.value);
    check.addEventListener("change", () => {
      if (check.checked) done.add(check.value);
      else done.delete(check.value);
      store.set(key, Array.from(done));
      render();
    });
  });

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

  const bestKey = "pondasi.quiz.v1";
  const total = 20;
  const passing = 16;
  const currentBest = () => Number(store.get(bestKey, 0)) || 0;

  const questions = [
    {
      q: "Mengapa 0.1 + 0.2 === 0.3 bernilai false di JavaScript?",
      options: [
        "Karena operator + mengubah angka menjadi string",
        "Karena 0.1 dan 0.2 tidak bisa disimpan tepat dalam floating point biner",
        "Karena JavaScript membatasi semua angka menjadi bilangan bulat",
        "Karena 0.3 bukan angka yang valid"
      ],
      correct: 1,
      why: "IEEE 754 menyimpan pecahan dalam basis 2. 0.1 dan 0.2 tidak punya representasi biner yang berakhir, sehingga hasil penjumlahannya 0.30000000000000004."
    },
    {
      q: "Kapan BigInt sebaiknya dipakai?",
      options: [
        "Untuk semua perhitungan, termasuk harga tampilan",
        "Untuk nilai integer besar seperti wei, saldo token, dan uint256",
        "Hanya untuk angka negatif",
        "Hanya di TypeScript, bukan JavaScript"
      ],
      correct: 1,
      why: "BigInt menyimpan integer dengan presisi arbitrer. Ia tepat untuk wei dan uint256, tetapi tidak untuk pecahan desimal. Nilai uang tetap ditampilkan sebagai string yang diformat."
    },
    {
      q: "Apa hasil typeof null?",
      options: ["null", "object", "undefined", "number"],
      correct: 1,
      why: "typeof null mengembalikan \"object\" karena bug historis JavaScript yang dipertahankan untuk kompatibilitas. Untuk memeriksa null, gunakan value === null."
    },
    {
      q: "Apa yang terjadi saat menjalankan 10n + 5?",
      options: [
        "Menghasilkan 15n",
        "Menghasilkan 15",
        "TypeError: tidak boleh mencampur BigInt dan Number",
        "Menghasilkan NaN"
      ],
      correct: 2,
      why: "JavaScript menolak mencampur BigInt dan Number dalam operasi aritmetika karena berisiko kehilangan presisi. Ubah salah satunya secara eksplisit, misalnya 10n + 5n."
    },
    {
      q: "Apa yang terjadi saat JSON.stringify({ supply: 10n })?",
      options: [
        "Menghasilkan {\"supply\":\"10\"}",
        "Menghasilkan {\"supply\":10}",
        "Melempar TypeError karena BigInt tidak bisa diserialisasi",
        "Menghasilkan null"
      ],
      correct: 2,
      why: "JSON tidak punya tipe BigInt. Serialisasi BigInt melempar TypeError. Kirim sebagai string, misalnya supplyWei: value.toString(), lalu parse kembali dengan BigInt di penerima."
    },
    {
      q: "fetch menerima respons HTTP 404. Apa yang dilakukan promise fetch?",
      options: [
        "Reject dengan error 404",
        "Resolve dengan response yang res.ok bernilai false",
        "Mengembalikan null",
        "Mengulang request otomatis"
      ],
      correct: 1,
      why: "fetch hanya reject saat kegagalan jaringan atau pembatalan. Status 4xx dan 5xx tetap berupa response. Periksa res.ok atau res.status sebelum memanggil res.json()."
    },
    {
      q: "Bagaimana cara menjalankan tiga request secara paralel?",
      options: [
        "Tiga await berurutan di dalam loop",
        "Promise.all([a(), b(), c()])",
        "setTimeout untuk setiap request",
        "Memanggil fetch tanpa await"
      ],
      correct: 1,
      why: "Promise.all memulai semua promise lalu menunggu semuanya. Tiga await berurutan menjalankan request satu per satu sehingga total waktunya dijumlahkan."
    },
    {
      q: "Urutan eksekusi yang benar untuk console.log sync, Promise.then, dan setTimeout 0 adalah?",
      options: [
        "sync, setTimeout, Promise.then",
        "sync, Promise.then, setTimeout",
        "Promise.then, sync, setTimeout",
        "setTimeout, sync, Promise.then"
      ],
      correct: 1,
      why: "Kode sinkron selesai lebih dulu. Microtask Promise dikuras sebelum event loop mengambil macrotask berikutnya, sehingga Promise.then berjalan sebelum setTimeout 0."
    },
    {
      q: "Apa yang dilakukan const pada objek?",
      options: [
        "Membekukan seluruh properti objek",
        "Mencegah binding variabel diarahkan ulang, tetapi properti masih bisa diubah",
        "Membuat objek otomatis readonly di TypeScript",
        "Menghapus metode objek"
      ],
      correct: 1,
      why: "const mengikat nama ke satu nilai. Isi objek tetap bisa dimutasi. Untuk membekukan properti, gunakan Object.freeze atau Readonly di TypeScript."
    },
    {
      q: "Apa yang dikembalikan Array.prototype.map?",
      options: [
        "Array baru tanpa mengubah array asal",
        "Array asal yang sudah diubah",
        "Nilai tunggal hasil agregasi",
        "Promise berisi array"
      ],
      correct: 0,
      why: "map membuat array baru dengan panjang sama. filter menyaring, reduce menggabungkan menjadi satu nilai, dan sort memutasi array asal."
    },
    {
      q: "Apa perbedaan utama unknown dan any di TypeScript?",
      options: [
        "Keduanya sama, hanya berbeda penulisan",
        "unknown harus dipersempit sebelum dipakai, any mematikan pemeriksaan tipe",
        "any hanya untuk angka, unknown untuk string",
        "unknown hanya ada di runtime"
      ],
      correct: 1,
      why: "unknown adalah tipe aman untuk nilai yang belum diperiksa. Kamu harus melakukan narrowing. any melewati pemeriksaan dan menyebarkan ketidakpastian ke seluruh kode."
    },
    {
      q: "Bagaimana cara TypeScript mempersempit union berdasarkan properti kind?",
      options: [
        "Dengan memakai as any",
        "Dengan membandingkan kind sebagai literal discriminant di dalam if atau switch",
        "Dengan mengganti semua tipe menjadi string",
        "Dengan menghapus properti kind"
      ],
      correct: 1,
      why: "Discriminated union memakai properti literal seperti kind: \"native\" | \"token\". Setelah if (payment.kind === \"token\"), TypeScript tahu field mana yang tersedia."
    },
    {
      q: "Tipe apa yang menghapus field supplyWei dari Token?",
      options: [
        "Pick<Token, \"supplyWei\">",
        "Omit<Token, \"supplyWei\">",
        "Partial<Token>",
        "Record<Token, \"supplyWei\">"
      ],
      correct: 1,
      why: "Omit<T, K> membentuk tipe baru tanpa kunci K. Pick justru memilih kunci yang disebut. Partial membuat semua properti opsional."
    },
    {
      q: "Pernyataan mana yang benar tentang interface dan type?",
      options: [
        "interface hanya bisa untuk objek, type bisa untuk union dan tipe lain",
        "type tidak bisa mendeskripsikan objek",
        "interface tidak bisa di-extends",
        "Keduanya tidak bisa dipakai bersama"
      ],
      correct: 0,
      why: "interface sangat cocok untuk bentuk objek dan bisa declaration merging. type alias lebih fleksibel untuk union, tuple, dan tipe turunan. Keduanya bisa dipakai bersama."
    },
    {
      q: "Komponen Next.js App Router memakai useState. Apa yang dibutuhkan?",
      options: [
        "Direktif \"use client\" di bagian atas file",
        "Menambahkan \"use server\"",
        "Menghapus TypeScript",
        "Menaruh file di folder public"
      ],
      correct: 0,
      why: "Hook React membutuhkan client component. Tambahkan \"use client\" di file yang memakai useState, useEffect, atau event handler browser."
    },
    {
      q: "Environment variable mana yang aman untuk API key rahasia di Next.js?",
      options: [
        "NEXT_PUBLIC_API_KEY",
        "API_KEY tanpa prefix NEXT_PUBLIC_ dan hanya dibaca di server",
        "PUBLIC_KEY",
        "NEXT_API_SECRET_PUBLIC"
      ],
      correct: 1,
      why: "Hanya variable berprefix NEXT_PUBLIC_ yang dikirim ke browser. Secret harus tetap di server dan dipakai lewat route handler atau server component. Prefix NEXT_PUBLIC_ berarti nilai itu publik."
    },
    {
      q: "Apa fungsi git add?",
      options: [
        "Menyimpan snapshot permanen ke riwayat",
        "Memindahkan perubahan ke staging area untuk commit berikutnya",
        "Mengunggah commit ke GitHub",
        "Membuat branch baru"
      ],
      correct: 1,
      why: "git add memasukkan perubahan ke index atau staging area. git commit baru membuat snapshot permanen dari isi staging. git push mengunggah commit ke remote."
    },
    {
      q: "Kamu ingin membuang perubahan yang belum di-stage pada satu file. Perintah paling langsung adalah?",
      options: [
        "git commit --amend",
        "git restore nama-file",
        "git push --force",
        "git branch -D"
      ],
      correct: 1,
      why: "git restore mengembalikan file di working tree ke versi HEAD. Ini membuang perubahan yang belum di-stage. Git tidak bisa memulihkannya setelah itu."
    },
    {
      q: "1 ETH sama dengan berapa wei?",
      options: [
        "10 pangkat 9 wei",
        "10 pangkat 18 wei",
        "10 pangkat 6 wei",
        "100 wei"
      ],
      correct: 1,
      why: "1 ETH = 10^18 wei. Di kode: 1n * 10n ** 18n. Untuk token dengan 6 desimal, satu unit = 10^6 unit terkecil."
    },
    {
      q: "Nilai Number.MAX_SAFE_INTEGER adalah?",
      options: [
        "9007199254740991",
        "18446744073709551615",
        "1e18",
        "2147483647"
      ],
      correct: 0,
      why: "Number.MAX_SAFE_INTEGER = 2^53 - 1 = 9007199254740991. Di atas itu, penambahan 1 bisa menghasilkan angka yang sama karena presisi floating point. BigInt tetap exact."
    }
  ];

  const setStatus = (textValue, kind) => {
    status.textContent = textValue;
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
    setStatus(currentBest() > 0 ? "Skor terbaik tersimpan: " + currentBest() + " dari " + total + ". Pilih jawaban lalu periksa." : "Belum ada jawaban yang diperiksa.", "");
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

    const passed = score >= passing;
    result.innerHTML = '<div class="quiz-summary' + (passed ? "" : " is-fail") + '">' +
      "<h3>Skor " + score + " dari " + total + "</h3>" +
      "<p>" + (passed
        ? "Kamu lulus. Pastikan kamu bisa menjelaskan alasan setiap jawaban, bukan hanya mengingat hurufnya."
        : "Ulangi bab yang penjelasannya belum klik, lalu coba lagi. Tidak ada batas percobaan.") +
      "</p><p>Skor terbaik tersimpan: " + newBest + " dari " + total + ".</p>" +
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
