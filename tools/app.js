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
      /* Penyimpanan bisa diblokir. Progres tetap jalan di sesi ini. */
    }
  }
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : ms));

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

/* ---------- Sorotan kode ---------- */

const SOL_TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(0x[0-9a-fA-F]+|\d[\d_]*)\b|\b(pragma|solidity|contract|interface|library|abstract|is|using|function|modifier|event|error|struct|enum|mapping|constructor|receive|fallback|returns|return|if|else|for|while|do|break|continue|emit|revert|require|assert|try|catch|new|delete|import|from|as|unchecked|assembly|virtual|override|super|constant|immutable|public|private|internal|external|pure|view|payable|memory|storage|calldata|true|false|type|this|msg|block|tx)\b|\b(address|bool|string|bytes(?:[1-9]|[12][0-9]|3[0-2])?|u?int(?:8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?)\b/g;

function tokenize(code, regex, classify) {
  let out = "";
  let last = 0;

  for (const match of code.matchAll(regex)) {
    out += escapeHtml(code.slice(last, match.index));
    out += '<span class="' + classify(match) + '">' + escapeHtml(match[0]) + "</span>";
    last = match.index + match[0].length;
  }

  return out + escapeHtml(code.slice(last));
}

function highlightSolidity(code) {
  return tokenize(code, SOL_TOKEN_RE, (match) => {
    if (match[1]) return "tok-c";
    if (match[2]) return "tok-s";
    if (match[3]) return "tok-n";
    return "tok-k";
  });
}

const BASH_TOKEN_RE = /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(^|\s)(\$)(?=\s)|\b(forge|cast|anvil|chisel|foundryup|curl|git|cd|mkdir|ls|echo|source|npm|npx)(?=\s)/gm;

function highlightBash(code) {
  return tokenize(code, BASH_TOKEN_RE, (match) => {
    if (match[1]) return "tok-c";
    if (match[2]) return "tok-s";
    if (match[4]) return "tok-t";
    return "tok-k";
  });
}

const TOML_TOKEN_RE = /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(^|\n)(\s*\[[^\]\n]+\])|(^|\n)(\s*[A-Za-z0-9_.-]+\s*=)/gm;

function highlightToml(code) {
  return tokenize(code, TOML_TOKEN_RE, (match) => {
    if (match[1]) return "tok-c";
    if (match[2]) return "tok-s";
    if (match[4]) return "tok-k";
    if (match[6]) return "tok-t";
    return "tok-k";
  });
}

const YAML_TOKEN_RE = /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(^|\n)(\s*-?\s*[A-Za-z0-9_.-]+:)/gm;

function highlightYaml(code) {
  return tokenize(code, YAML_TOKEN_RE, (match) => {
    if (match[1]) return "tok-c";
    if (match[2]) return "tok-s";
    return "tok-t";
  });
}

function highlightCode(code, lang) {
  if (lang === "bash" || lang === "sh" || lang === "shell") return highlightBash(code);
  if (lang === "toml") return highlightToml(code);
  if (lang === "yaml" || lang === "yml") return highlightYaml(code);
  return highlightSolidity(code);
}

function initHighlight() {
  $$(".code-block pre code").forEach((block) => {
    const source = block.textContent;
    if (!source.trim()) return;
    if (block.querySelector("span")) return;
    const lang = (block.dataset.lang || "solidity").toLowerCase();
    block.innerHTML = highlightCode(source, lang);
  });
}

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
    if (persist) store.set("alat.theme", theme);
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
    let label = "Orientasi";
    if (mark) {
      const clone = mark.cloneNode(true);
      const type = clone.querySelector(".chapter-type");
      if (type) type.remove();
      label = clone.textContent.replace(/\s+/g, " ").trim();
    }
    return {
      id: section.id,
      title: title.trim(),
      mark: label,
      text: section.textContent.replace(/\s+/g, " ").trim()
    };
  });

  const close = () => { panel.hidden = true; };

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
      panel.innerHTML = '<p class="search-empty">Tidak ada hasil untuk "' + escapeHtml(term) + '". Coba "fuzz", "invariant", "anvil", atau "cast".</p>';
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
  key: "alat.progress.v1",
  quizKey: "alat.quiz.v1",
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
  li.innerHTML = '<span class="log-no">#' + String(number).padStart(2, "0") + "</span>" +
    '<span class="' + cls + '">' + escapeHtml(text) + "</span>";
  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
}

function emptyLog(list, text) {
  if (!list) return;
  list.dataset.count = "0";
  list.innerHTML = '<li class="event-log-empty"><span class="log-no">--</span><span>' + escapeHtml(text) + "</span></li>";
}

function setStatus(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("is-good", "is-bad", "is-wait");
  if (kind) el.classList.add(kind);
}

/* ---------- Hero: laporan test ---------- */

(function initHeroReport() {
  const run = $("#hero-run");
  const fix = $("#hero-fix");
  const row = $("#hero-fail-row");
  const seq = $("#hero-seq");
  const summary = $("#hero-summary");
  const note = $("#hero-note");
  if (!run || !fix || !row || !seq || !summary) return;

  const failSequence = '<span class="seq-dim">run 1, depth 50</span>\n' +
    'deposit(4.0) <span class="seq-dim">-&gt;</span> total 4.0\n' +
    'withdraw(4.0) <span class="seq-dim">-&gt;</span> total 0.0\n' +
    'deposit(1.0) <span class="seq-dim">-&gt;</span> total 1.0\n' +
    'withdraw(1.0) <span class="seq-bad">-&gt; saldo 0, total 1.0</span>\n' +
    '<span class="seq-bad">invariant gagal: totalDeposits != saldo</span>';

  const passSequence = '<span class="seq-dim">run 1, depth 50</span>\n' +
    'deposit(4.0) <span class="seq-dim">-&gt;</span> total 4.0\n' +
    'withdraw(4.0) <span class="seq-dim">-&gt;</span> total 0.0\n' +
    'deposit(1.0) <span class="seq-dim">-&gt;</span> total 1.0\n' +
    'withdraw(1.0) <span class="seq-ok">-&gt; total 0.0</span>\n' +
    '<span class="seq-ok">invariant lulus: saldo == total</span>';

  const setFail = () => {
    row.className = "report-row is-bad";
    $(".r-mark", row).textContent = "x";
    $(".r-mark", row).setAttribute("aria-label", "gagal");
    $(".r-time", row).textContent = "128 runs";
    seq.innerHTML = failSequence;
    summary.innerHTML = "<strong>3 lulus, 1 gagal</strong> dari 4 test";
    if (note) note.textContent = "Urutan panggilan dibuat oleh skrip, bukan EVM. Perhatikan bahwa saldo pengguna dan total kontrak bisa berbeda walau test unit semuanya lulus.";
    toast("Kampanye dijalankan ulang. Invariant kembali gagal.");
  };

  const setPass = () => {
    row.className = "report-row is-ok";
    $(".r-mark", row).textContent = "ok";
    $(".r-mark", row).setAttribute("aria-label", "lulus");
    $(".r-time", row).textContent = "128 runs";
    seq.innerHTML = passSequence;
    summary.innerHTML = "<strong>4 lulus, 0 gagal</strong> dari 4 test";
    if (note) note.textContent = "Perbaikan mengurangi totalDeposits saat withdraw. Invariant solvensi bertahan setelah urutan yang sama.";
    toast("Perbaikan diterapkan. Invariant lulus.");
  };

  run.addEventListener("click", setFail);
  fix.addEventListener("click", setPass);
})();

/* ---------- Lab 01: pipeline ---------- */

(function initPipeline() {
  const pipeline = $("#pipeline");
  if (!pipeline) return;

  const steps = $$(".pipe-step", pipeline);
  const runBtn = $("#pipeline-run");
  const resetBtn = $("#pipeline-reset");
  const breakInput = $("#pipeline-break");
  const status = $("#pipeline-status");
  const log = $("#pipeline-log");
  let running = false;

  const setStep = (key, state, label) => {
    const step = steps.find((item) => item.dataset.pipe === key);
    if (!step) return;
    step.classList.remove("is-idle", "is-active", "is-ok", "is-bad");
    step.classList.add("is-" + state);
    const stateEl = $(".pipe-state", step);
    if (stateEl) stateEl.textContent = label;
  };

  const reset = () => {
    running = false;
    steps.forEach((step) => {
      step.classList.remove("is-idle", "is-active", "is-ok", "is-bad");
      step.classList.add("is-idle");
      const stateEl = $(".pipe-state", step);
      if (stateEl) stateEl.textContent = "menunggu";
    });
    if (log) log.textContent = "$ menunggu perintah";
    setStatus(status, "Belum dijalankan.", "");
    if (runBtn) runBtn.disabled = false;
  };

  const run = async () => {
    if (running) return;
    running = true;
    if (runBtn) runBtn.disabled = true;
    const shouldFail = Boolean(breakInput && breakInput.checked);
    let logText = "";

    const sequence = [
      { key: "build", ok: "selesai", bad: "gagal", text: "$ forge build\nCompiled 4 files successfully." },
      { key: "test", ok: "lulus", bad: "gagal", text: "$ forge test\n[PASS] test_Increment()\n[PASS] test_Deposit()" },
      { key: "deploy", ok: "sukses", bad: "gagal", text: "$ forge script --broadcast\nDeployed MiniVault at 0x5FbD...0Aa3" },
      { key: "call", ok: "sukses", bad: "gagal", text: "$ cast send MiniVault deposit()\nTransaction mined in block 2" },
      { key: "read", ok: "selesai", bad: "gagal", text: "$ cast call MiniVault totalDeposits()\n1000000000000000000" }
    ];

    for (let i = 0; i < sequence.length; i++) {
      const item = sequence[i];
      setStep(item.key, "active", "jalan");
      setStatus(status, "Menjalankan " + item.key + "...", "is-wait");
      logText += (logText ? "\n\n" : "") + item.text;
      if (log) log.textContent = logText;
      await wait(520);

      const failsHere = shouldFail && item.key === "test";
      if (failsHere) {
        setStep(item.key, "bad", "gagal");
        logText += "\n\n[FAIL] test_Increment()\n  assertEq(2, 1) gagal.\n\nPipeline berhenti. Deploy tidak dijalankan.";
        if (log) log.textContent = logText;
        setStatus(status, "Pipeline berhenti di test. Deploy diblokir.", "is-bad");
        running = false;
        if (runBtn) runBtn.disabled = false;
        return;
      }

      setStep(item.key, "ok", item.ok);
    }

    setStatus(status, "Pipeline selesai: build, test, deploy, panggil, dan baca state berhasil.", "is-good");
    running = false;
    if (runBtn) runBtn.disabled = false;
  };

  if (runBtn) runBtn.addEventListener("click", run);
  if (resetBtn) resetBtn.addEventListener("click", reset);
  reset();
})();

/* ---------- Lab 02: config builder ---------- */

(function initConfig() {
  const output = $("#cfg-out");
  if (!output) return;

  const solc = $("#cfg-solc");
  const runs = $("#cfg-runs");
  const depth = $("#cfg-depth");
  const opt = $("#cfg-opt");
  const viair = $("#cfg-viair");
  const runsVal = $("#cfg-runs-val");
  const depthVal = $("#cfg-depth-val");
  const status = $("#cfg-status");

  const render = () => {
    const lines = [
      "[profile.default]",
      'src = "src"',
      'test = "test"',
      'libs = ["lib"]',
      'solc = "' + solc.value + '"',
      "optimizer = " + (opt.checked ? "true" : "false")
    ];

    if (opt.checked) lines.push("optimizer_runs = 200");
    if (viair.checked) lines.push("via_ir = true");

    lines.push("", "[fuzz]", "runs = " + runs.value);
    lines.push("", "[invariant]", "runs = 256", "depth = " + depth.value, "fail_on_revert = false");

    output.textContent = lines.join("\n");
    runsVal.textContent = runs.value;
    depthVal.textContent = depth.value;

    const notes = [];
    notes.push("Fuzz " + runs.value + " run");
    notes.push("depth " + depth.value);
    if (viair.checked) notes.push("via_ir aktif: build lebih lambat, cek biaya dan ukuran ulang");
    if (Number(runs.value) >= 4000) notes.push("cocok untuk profil CI, terlalu berat untuk setiap simpan");
    setStatus(status, notes.join(". ") + ".", "");
  };

  [solc, runs, depth, opt, viair].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  render();
})();

/* ---------- Lab 03: error triage ---------- */

(function initErrorLab() {
  const cases = $$("#error-cases .error-case");
  const check = $("#error-check");
  const reset = $("#error-reset");
  const status = $("#error-status");
  if (!cases.length || !check) return;

  const run = () => {
    let correct = 0;
    let answered = 0;

    cases.forEach((card) => {
      const select = $("select", card);
      card.classList.remove("answer-ok", "answer-bad");
      if (!select || !select.value) return;
      answered++;
      if (select.value === card.dataset.answer) {
        correct++;
        card.classList.add("answer-ok");
      } else {
        card.classList.add("answer-bad");
      }
    });

    if (!answered) {
      setStatus(status, "Pilih minimal satu jawaban.", "is-wait");
      return;
    }

    if (correct === cases.length) {
      setStatus(status, "Semua benar. Kamu memisahkan versi, import, stack, dan ukuran.", "is-good");
    } else {
      setStatus(status, correct + " dari " + cases.length + " benar. Baca ulang jenis error dan file yang ditunjuk.", "is-bad");
    }
  };

  check.addEventListener("click", run);
  if (reset) {
    reset.addEventListener("click", () => {
      cases.forEach((card) => {
        card.classList.remove("answer-ok", "answer-bad");
        const select = $("select", card);
        if (select) select.value = "";
      });
      setStatus(status, "Belum ada jawaban.", "");
    });
  }
})();

/* ---------- Lab 04: Remix ---------- */

(function initRemix() {
  const env = $("#remix-env");
  if (!env) return;

  const account = $("#remix-account");
  const deploy = $("#remix-deploy");
  const reset = $("#remix-reset");
  const inc = $("#remix-inc");
  const contract = $("#remix-contract");
  const count = $("#remix-count");
  const ownerLabel = $("#remix-owner");
  const chainLabel = $("#remix-chain");
  const status = $("#remix-status");
  const log = $("#remix-log");

  let deployed = false;
  let countValue = 0;
  let ownerAccount = "";

  const accountName = () => account.options[account.selectedIndex].text;

  const render = () => {
    if (contract) contract.hidden = !deployed;
    if (count) count.textContent = String(countValue);
    if (ownerLabel) ownerLabel.textContent = deployed ? "owner: " + ownerAccount : "owner";
  };

  const resetVm = (message) => {
    deployed = false;
    countValue = 0;
    ownerAccount = "";
    render();
    emptyLog(log, "Belum ada transaksi.");
    setStatus(status, message || "VM direset. Deploy ulang untuk mulai.", "");
  };

  env.addEventListener("change", () => {
    const isBrowser = env.value === "browser";
    if (deploy) deploy.disabled = isBrowser;
    if (chainLabel) {
      chainLabel.textContent = isBrowser
        ? "browser extension / wallet tidak tersedia di lab"
        : "chain 31337 / akun uji";
    }
    resetVm(isBrowser
      ? "Environment Browser Extension butuh wallet. Lab ini tidak memilikinya, jadi deploy ditahan."
      : "Remix VM siap. Pilih akun lalu deploy.");
  });

  if (deploy) {
    deploy.addEventListener("click", () => {
      if (env.value === "browser") {
        setStatus(status, "Tidak ada wallet di lab ini. Ganti ke Remix VM atau hubungkan wallet sungguhan di Remix.", "is-bad");
        return;
      }
      deployed = true;
      countValue = 0;
      ownerAccount = accountName();
      render();
      prependLog(log, "ok", "Deploy Counter dari " + ownerAccount + " (0x5FbD...0Aa3)");
      setStatus(status, "Counter ter-deploy di Remix VM. Panggil increment() dari akun yang sama.", "is-good");
    });
  }

  if (inc) {
    inc.addEventListener("click", () => {
      if (!deployed) {
        setStatus(status, "Deploy kontrak dulu.", "is-bad");
        return;
      }
      if (accountName() !== ownerAccount) {
        prependLog(log, "bad", "increment() dari " + accountName() + " revert: BukanOwner");
        setStatus(status, "Akun ini bukan owner. state count tidak berubah, tetapi transaksi tetap membayar gas.", "is-bad");
        return;
      }
      countValue += 1;
      render();
      prependLog(log, "ok", "increment() dari " + ownerAccount + " -> count = " + countValue);
      setStatus(status, "count sekarang " + countValue + ". Setiap klik adalah satu transaksi.", "is-good");
    });
  }

  if (reset) reset.addEventListener("click", () => resetVm("VM direset. count kembali ke 0."));
  resetVm("Pilih akun lalu deploy Counter di Remix VM.");
})();

/* ---------- Lab 05: OpenZeppelin recipe ---------- */

(function initOz() {
  const output = $("#oz-out");
  if (!output) return;

  const standard = $("#oz-standard");
  const access = $("#oz-access");
  const pause = $("#oz-pause");
  const burn = $("#oz-burn");
  const status = $("#oz-status");

  const configs = {
    erc20: {
      name: "TokenKelas",
      base: "ERC20",
      basePath: "token/ERC20/ERC20.sol",
      burnName: "ERC20Burnable",
      burnPath: "token/ERC20/extensions/ERC20Burnable.sol",
      pauseName: "ERC20Pausable",
      pausePath: "token/ERC20/extensions/ERC20Pausable.sol",
      constructor: 'ERC20("Token Kelas", "KLS")',
      update: "function _update(address from, address to, uint256 value)\n        internal\n        override(ERC20, ERC20Pausable)\n    {\n        super._update(from, to, value);\n    }"
    },
    erc721: {
      name: "NFTKelas",
      base: "ERC721",
      basePath: "token/ERC721/ERC721.sol",
      burnName: "ERC721Burnable",
      burnPath: "token/ERC721/extensions/ERC721Burnable.sol",
      pauseName: "ERC721Pausable",
      pausePath: "token/ERC721/extensions/ERC721Pausable.sol",
      constructor: 'ERC721("NFT Kelas", "NKLS")',
      update: "function _update(address to, uint256 tokenId, address auth)\n        internal\n        override(ERC721, ERC721Pausable)\n        returns (address)\n    {\n        return super._update(to, tokenId, auth);\n    }"
    },
    erc1155: {
      name: "ItemKelas",
      base: "ERC1155",
      basePath: "token/ERC1155/ERC1155.sol",
      burnName: "ERC1155Burnable",
      burnPath: "token/ERC1155/extensions/ERC1155Burnable.sol",
      pauseName: "ERC1155Pausable",
      pausePath: "token/ERC1155/extensions/ERC1155Pausable.sol",
      constructor: 'ERC1155("https://contoh.xyz/{id}.json")',
      update: "function _update(address from, address to, uint256[] memory ids, uint256[] memory values)\n        internal\n        override(ERC1155, ERC1155Pausable)\n    {\n        super._update(from, to, ids, values);\n    }"
    }
  };

  const render = () => {
    const cfg = configs[standard.value];
    const usePause = pause.value === "yes";
    const useBurn = burn.checked;
    const useAccess = access.value === "ownable";

    const imports = [
      'import {' + cfg.base + '} from "@openzeppelin/contracts/' + cfg.basePath + '";'
    ];
    if (useBurn) imports.push('import {' + cfg.burnName + '} from "@openzeppelin/contracts/' + cfg.burnPath + '";');
    if (usePause) imports.push('import {' + cfg.pauseName + '} from "@openzeppelin/contracts/' + cfg.pausePath + '";');
    if (useAccess) imports.push('import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";');

    const bases = [cfg.base];
    if (useBurn) bases.push(cfg.burnName);
    if (usePause) bases.push(cfg.pauseName);
    if (useAccess) bases.push("Ownable");

    const lines = [];
    lines.push("// Kerangka, bukan kontrak lengkap");
    lines.push("");
    lines.push(imports.join("\n"));
    lines.push("");
    lines.push("contract " + cfg.name + " is " + bases.join(", ") + " {");
    if (useAccess) lines.push("    constructor(address awal)");
    else lines.push("    constructor()");
    lines.push("        " + cfg.constructor);
    if (useAccess) lines.push("        Ownable(awal)");
    lines.push("    {}");
    lines.push("");
    if (useAccess) {
      lines.push("    // fungsi mint, pause, atau unpause: onlyOwner");
    } else {
      lines.push("    // tidak ada admin: jangan tambahkan mint atau pause tanpa access control");
    }
    if (usePause) {
      lines.push("    // pause() dan unpause() memanggil _pause() dan _unpause()");
    }
    lines.push("");
    if (usePause) {
      lines.push("    // override wajib karena " + cfg.base + " dan " + cfg.pauseName);
      lines.push(cfg.update);
    } else {
      lines.push("    // tidak ada override wajib dari fitur yang dipilih");
    }
    lines.push("}");

    output.textContent = lines.join("\n");
    setStatus(
      status,
      "Kerangka " + cfg.base + (useBurn ? " + burn" : "") + (usePause ? " + pause" : "") + (useAccess ? " + Ownable" : " tanpa admin") +
      ". Tambahkan fungsi dan test sendiri.",
      ""
    );
  };

  [standard, access, pause, burn].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", render);
  });

  render();
})();

/* ---------- Lab 06: unit test runner ---------- */

(function initUnitLab() {
  const run = $("#unit-run");
  if (!run) return;

  const fix = $("#unit-fix");
  const reset = $("#unit-reset");
  const lines = $("#unit-lines");
  const output = $("#unit-out");
  const status = $("#unit-status");

  const render = (result) => {
    if (!lines) return;
    const ok = result.failures === 0;
    lines.innerHTML = [
      '<li><span class="' + (result.increment ? "t-ok" : "t-bad") + '">' + (result.increment ? "ok" : "x") + '</span><span>test_Increment()</span><span class="t-why">' + (result.increment ? "lulus" : "assert 2 != 1") + "</span></li>",
      '<li><span class="t-ok">ok</span><span>test_SetCount()</span><span class="t-why">lulus</span></li>',
      '<li><span class="t-ok">ok</span><span>test_RevertWhen_NotOwner()</span><span class="t-why">lulus</span></li>'
    ].join("");

    if (ok) {
      if (output) {
        output.textContent = "$ forge test -vvv\n[PASS] test_Increment()\n[PASS] test_SetCount()\n[PASS] test_RevertWhen_NotOwner()\n\n3 passed, 0 failed";
      }
      setStatus(status, "Semua test lulus. Bug increment sudah hilang, tetapi test regresi tetap harus dipertahankan.", "is-good");
    } else {
      if (output) {
        output.textContent = "$ forge test -vvv\n[FAIL: assertion failed: 2 != 1] test_Increment()\n  counter.increment()\n  assertEq(counter.count(), 1)\n\n2 passed, 1 failed";
      }
      setStatus(status, "Satu test gagal. increment menambah 2, padahal test mengharapkan 1. Perbaiki kontrak atau test, tetapi jelaskan mana yang benar.", "is-bad");
    }
  };

  run.addEventListener("click", () => {
    const fixed = Boolean(fix && fix.checked);
    render({ increment: fixed, failures: fixed ? 0 : 1 });
  });

  if (fix) {
    fix.addEventListener("change", () => {
      setStatus(status, fix.checked ? "Perbaikan siap diuji. Jalankan test lagi." : "Bug dikembalikan. Jalankan test untuk melihat kegagalan.", "");
    });
  }

  if (reset) {
    reset.addEventListener("click", () => {
      if (fix) fix.checked = false;
      if (lines) lines.innerHTML = '<li><span class="t-ok">--</span><span>Belum dijalankan</span><span class="t-why">menunggu</span></li>';
      if (output) output.textContent = "$ forge test -vvv";
      setStatus(status, "Jalankan test untuk melihat hasil.", "");
    });
  }
})();

/* ---------- Lab 07: cheatcode sandbox ---------- */

(function initCheatLab() {
  const scenario = $("#cheat-scenario");
  if (!scenario) return;

  const toggle = $("#cheat-on");
  const name = $("#cheat-name");
  const code = $("#cheat-code");
  const run = $("#cheat-run");
  const reset = $("#cheat-reset");
  const status = $("#cheat-status");
  const output = $("#cheat-out");

  const data = {
    akses: {
      cheat: "vm.prank(alice)",
      code: 'function test_OnlyOwner() public {\n  vm.prank(alice);\n  vault.onlyOwner();\n}',
      fail: "revert: OwnableUnauthorizedAccount(test contract)",
      pass: "lulus: msg.sender = alice, alice adalah owner",
      why: "Tanpa prank, pemanggil adalah contract test. Prank hanya mengubah pengirim panggilan berikutnya."
    },
    waktu: {
      cheat: "vm.warp(deadline + 1)",
      code: 'function test_SetelahDeadline() public {\n  vm.warp(deadline + 1);\n  vault.claim();\n}',
      fail: "revert: Terlambat, waktu masih sebelum deadline",
      pass: "lulus: block.timestamp sudah melewati deadline",
      why: "Test ingin menguji klaim setelah deadline, tetapi lupa memajukan waktu. Warp menyiapkan skenario itu."
    },
    saldo: {
      cheat: "vm.deal(alice, 10 ether)",
      code: 'function test_DepositAlice() public {\n  vm.deal(alice, 10 ether);\n  vm.prank(alice);\n  vault.deposit{value: 1 ether}();\n}',
      fail: "revert: saldo alice 0, tidak bisa mengirim 1 ETH",
      pass: "lulus: alice punya 10 ETH dan deposit 1 ETH",
      why: "deal memberi saldo ETH. Ia tidak mengubah aturan kontrak dan tidak memberi token secara otomatis."
    }
  };

  const renderScenario = () => {
    const item = data[scenario.value];
    if (name) name.textContent = item.cheat;
    if (code) code.textContent = item.code;
    if (toggle) toggle.checked = false;
    if (output) output.textContent = "$ pilih cheatcode lalu jalankan";
    setStatus(status, "Bandingkan test tanpa dan dengan cheatcode.", "");
  };

  scenario.addEventListener("change", renderScenario);

  if (run) {
    run.addEventListener("click", () => {
      const item = data[scenario.value];
      const active = Boolean(toggle && toggle.checked);
      if (output) {
        output.textContent = "$ forge test --match-test " + (scenario.value === "akses" ? "test_OnlyOwner" : scenario.value === "waktu" ? "test_SetelahDeadline" : "test_DepositAlice") + " -vv\n" +
          (active ? "[PASS] " + item.pass : "[FAIL] " + item.fail);
      }
      setStatus(status, active ? item.why : item.why + " Karena cheatcode belum aktif, skenario belum siap.", active ? "is-good" : "is-bad");
    });
  }

  if (reset) reset.addEventListener("click", renderScenario);
  renderScenario();
})();

/* ---------- Lab 08: fuzz ---------- */

(function initFuzzLab() {
  const run = $("#fuzz-run");
  if (!run) return;

  const strategy = $("#fuzz-strategy");
  const runs = $("#fuzz-runs");
  const runsVal = $("#fuzz-runs-val");
  const bars = $("#fuzz-bars");
  const output = $("#fuzz-out");
  const status = $("#fuzz-status");
  const reset = $("#fuzz-reset");

  const base = [0, 3, 7, 12, 18, 25, 33, 41, 52, 64, 75, 88, 96, 100];

  const renderBars = (values, hitIndex) => {
    if (!bars) return;
    bars.innerHTML = values.map((value, index) => {
      const width = Math.max(2, Math.round((value / 100) * 100));
      return '<li class="' + (index === hitIndex ? "is-hit" : "") + '">' +
        '<span>#' + String(index + 1).padStart(2, "0") + "</span>" +
        '<span class="fb-track"><span class="fb-fill" style="width:' + width + '%"></span></span>' +
        '<span class="fb-val">' + value + "</span></li>";
    }).join("");
  };

  const clear = () => {
    if (bars) bars.innerHTML = "";
    if (output) output.textContent = "$ menunggu";
    setStatus(status, "Pilih strategi lalu jalankan.", "");
  };

  if (runs) {
    runs.addEventListener("input", () => {
      runsVal.textContent = runs.value;
    });
  }

  if (strategy) {
    strategy.addEventListener("change", () => {
      clear();
      setStatus(status, "Strategi diubah. Jalankan untuk melihat sampel baru.", "");
    });
  }

  run.addEventListener("click", () => {
    const count = Math.max(4, Math.min(14, Math.ceil(Number(runs.value) / 36)));
    const values = base.slice(0, count);
    let hitIndex = -1;

    if (strategy.value === "bound") {
      values.forEach((value, index) => { values[index] = Math.max(1, value); });
    } else if (strategy.value === "assume") {
      // assume membuang nol; nilai lain lolos.
    } else {
      hitIndex = values.indexOf(0);
    }

    renderBars(values, hitIndex);

    if (hitIndex >= 0) {
      if (output) {
        output.textContent = "$ forge test --match-test testFuzz_Withdraw -vvv\n[FAIL: ZeroAmount()] testFuzz_Withdraw(uint256) (runs: " +
          runs.value + ", seed: 0x9f3a)\n  counterexample: amount = 0\n  shrunk: amount = 0\n  vault.withdraw(0)";
      }
      setStatus(status, "Fuzzer menemukan amount = 0. Kontrak menolak nol, tetapi test mengharapkan sukses. Input ini valid secara tipe, tidak valid secara bisnis.", "is-bad");
    } else if (strategy.value === "assume") {
      if (output) {
        output.textContent = "$ forge test --match-test testFuzz_Withdraw -vvv\n[PASS] testFuzz_Withdraw(uint256) (runs: " +
          runs.value + ", rejects: 7)\n\nCatatan: 7 input dibuang karena amount = 0.";
      }
      setStatus(status, "Lulus, tetapi ada input yang dibuang. Reject tinggi membuat fuzzer bekerja lebih keras untuk input valid.", "is-good");
    } else {
      if (output) {
        output.textContent = "$ forge test --match-test testFuzz_Withdraw -vvv\n[PASS] testFuzz_Withdraw(uint256) (runs: " +
          runs.value + ", seed: 0x9f3a)\n\nSemua sampel berada di rentang 1 sampai 100.";
      }
      setStatus(status, "Lulus. bound memetakan semua input ke rentang valid, jadi tidak ada run yang terbuang.", "is-good");
    }
  });

  if (reset) reset.addEventListener("click", clear);
  clear();
})();

/* ---------- Lab 09: invariant ---------- */

(function initInvariantLab() {
  const deposit = $("#inv-deposit");
  if (!deposit) return;

  const withdraw = $("#inv-withdraw");
  const campaign = $("#inv-campaign");
  const reset = $("#inv-reset");
  const fix = $("#inv-fix");
  const balanceEl = $("#inv-balance");
  const totalEl = $("#inv-total");
  const stateEl = $("#inv-state");
  const log = $("#inv-log");
  const status = $("#inv-status");

  let balance = 0;
  let total = 0;
  let running = false;

  const fmt = (value) => (value / 1e18).toFixed(2).replace(/\.00$/, "") + " ETH";

  const check = () => {
    if (balance < total) {
      stateEl.textContent = "gagal";
      stateEl.className = "is-bad";
      return false;
    }
    if (balance === 0 && total === 0) {
      stateEl.textContent = "menunggu";
      stateEl.className = "";
      return true;
    }
    stateEl.textContent = "lulus";
    stateEl.className = "is-ok";
    return true;
  };

  const render = () => {
    balanceEl.textContent = fmt(balance);
    totalEl.textContent = fmt(total);
    check();
  };

  const applyDeposit = (silent) => {
    balance += 1e18;
    total += 1e18;
    render();
    if (!silent) {
      prependLog(log, "ok", "deposit(1 ETH) -> saldo " + fmt(balance) + ", total " + fmt(total));
      setStatus(status, "Deposit menambah saldo kontrak dan kewajiban. Invariant masih aman.", "is-good");
    }
  };

  const applyWithdraw = (silent) => {
    if (balance < 1e18) {
      if (!silent) {
        prependLog(log, "bad", "withdraw(1 ETH) revert: saldo kontrak tidak cukup");
        setStatus(status, "Tidak ada saldo untuk ditarik. Deposit dulu.", "is-bad");
      }
      return false;
    }
    balance -= 1e18;
    if (fix && fix.checked) total -= 1e18;
    render();
    if (!silent) {
      prependLog(log, fix && fix.checked ? "ok" : "event", "withdraw(1 ETH) -> saldo " + fmt(balance) + ", total " + fmt(total));
      if (balance < total) {
        setStatus(status, "Invariant gagal: saldo kontrak lebih kecil dari total kewajiban. Akuntansi totalDeposits tidak dikurangi.", "is-bad");
      } else {
        setStatus(status, "Withdraw selesai. Saldo dan total tetap konsisten.", "is-good");
      }
    }
    return true;
  };

  const resetAll = (message) => {
    balance = 0;
    total = 0;
    render();
    emptyLog(log, "Belum ada panggilan.");
    setStatus(status, message || "Deposit dulu, lalu tarik. Perhatikan kedua angka.", "");
  };

  deposit.addEventListener("click", () => {
    if (running) return;
    applyDeposit(false);
  });

  withdraw.addEventListener("click", () => {
    if (running) return;
    applyWithdraw(false);
  });

  reset.addEventListener("click", () => {
    if (running) return;
    resetAll("Simulasi direset.");
  });

  if (fix) {
    fix.addEventListener("change", () => {
      if (running) return;
      resetAll(fix.checked ? "Perbaikan diterapkan. Simulasi direset; jalankan kampanye untuk membandingkan." : "Perbaikan dimatikan. Simulasi direset.");
    });
  }

  campaign.addEventListener("click", async () => {
    if (running) return;
    running = true;
    deposit.disabled = true;
    withdraw.disabled = true;
    campaign.disabled = true;
    resetAll("Kampanye berjalan...");
    prependLog(log, "event", "kampanye dimulai: 5 panggilan");

    const sequence = ["deposit", "deposit", "withdraw", "deposit", "withdraw"];
    for (const action of sequence) {
      await wait(420);
      if (action === "deposit") applyDeposit(true);
      else applyWithdraw(true);
      prependLog(log, "event", action + "(1 ETH) -> saldo " + fmt(balance) + ", total " + fmt(total));
    }

    const ok = balance >= total;
    setStatus(
      status,
      ok
        ? "Kampanye selesai. Invariant solvensi bertahan setelah urutan panggilan."
        : "Kampanye menemukan pelanggaran: saldo " + fmt(balance) + " lebih kecil dari total " + fmt(total) + ". Perbaiki akuntansi, bukan invariant-nya.",
      ok ? "is-good" : "is-bad"
    );
    running = false;
    deposit.disabled = false;
    withdraw.disabled = false;
    campaign.disabled = false;
  });

  resetAll();
})();

/* ---------- Lab 10: anvil ---------- */

(function initAnvilLab() {
  const table = $("#anvil-accounts");
  if (!table) return;

  const from = $("#anvil-from");
  const to = $("#anvil-to");
  const send = $("#anvil-send");
  const mine = $("#anvil-mine");
  const reset = $("#anvil-reset");
  const blockEl = $("#anvil-block");
  const status = $("#anvil-status");
  const output = $("#anvil-out");

  const initial = [
    { label: "account-0", addr: "0xf39F...2266", balance: 10000, nonce: 0 },
    { label: "account-1", addr: "0x7099...79C8", balance: 10000, nonce: 0 },
    { label: "account-2", addr: "0x3C44...93BC", balance: 10000, nonce: 0 }
  ];

  let accounts = initial.map((item) => ({ ...item }));
  let block = 0;
  let txCount = 0;

  const render = () => {
    table.innerHTML = accounts.map((item) => {
      return "<tr><td>" + item.label + "</td><td><code>" + item.addr + "</code></td><td>" +
        item.balance.toFixed(2) + " ETH</td><td>" + item.nonce + "</td></tr>";
    }).join("");
    if (blockEl) blockEl.textContent = "blok " + block;
  };

  const resetNode = () => {
    accounts = initial.map((item) => ({ ...item }));
    block = 0;
    txCount = 0;
    render();
    if (output) output.textContent = "$ anvil\nListening on 127.0.0.1:8545\nChain ID: 31337";
    setStatus(status, "Node direset. Saldo awal 10.000 ETH per akun.", "");
  };

  if (send) {
    send.addEventListener("click", () => {
      const fromIndex = Number(from.value);
      const toIndex = Number(to.value);
      if (fromIndex === toIndex) {
        setStatus(status, "Pilih akun pengirim dan penerima yang berbeda.", "is-bad");
        return;
      }
      const source = accounts[fromIndex];
      const target = accounts[toIndex];
      if (source.balance < 1) {
        setStatus(status, "Saldo pengirim tidak cukup.", "is-bad");
        return;
      }
      source.balance -= 1;
      target.balance += 1;
      source.nonce += 1;
      block += 1;
      txCount += 1;
      render();
      const hash = "0x" + String(txCount).padStart(64, "a");
      if (output) {
        output.textContent = "$ cast send " + target.addr + " --value 1ether --unlocked\n" +
          "tx hash: " + hash.slice(0, 20) + "...\n" +
          "block: " + block + "\n" +
          "gas used: 21000\n" +
          "status: 1 (success)";
      }
      setStatus(status, "1 ETH berpindah dari " + source.label + " ke " + target.label + ". Nonce pengirim menjadi " + source.nonce + ".", "is-good");
    });
  }

  if (mine) {
    mine.addEventListener("click", () => {
      block += 1;
      render();
      if (output) {
        output.textContent = "$ cast rpc anvil_mine\nblock: " + block + "\n\nTidak ada transaksi, hanya blok baru.";
      }
      setStatus(status, "Blok " + block + " ditambang tanpa transaksi.", "");
    });
  }

  if (reset) reset.addEventListener("click", resetNode);
  resetNode();
})();

/* ---------- Lab 11: deploy ---------- */

(function initDeployLab() {
  const run = $("#deploy-run");
  if (!run) return;

  const mode = $("#deploy-mode");
  const failSelect = $("#deploy-fail");
  const resume = $("#deploy-resume");
  const reset = $("#deploy-reset");
  const list = $("#deploy-txs");
  const status = $("#deploy-status");
  const output = $("#deploy-out");

  const stepNames = ["Deploy MiniVault", "deposit 1 ETH", "transferOwnership(multisig)"];
  let state = [];

  const render = () => {
    if (!list) return;
    if (!state.length) {
      list.innerHTML = '<li><span class="tx-no">--</span><span class="tx-name">Belum ada transaksi</span><span class="tx-state">menunggu</span></li>';
      return;
    }
    list.innerHTML = state.map((item, index) => {
      const cls = item.status === "ok" ? "is-ok" : item.status === "bad" ? "is-bad" : "is-wait";
      return '<li class="' + cls + '"><span class="tx-no">' + String(index + 1).padStart(2, "0") + "</span>" +
        '<span class="tx-name">' + escapeHtml(item.name) + (item.hash ? '<br><span class="mono">' + item.hash + "</span>" : "") + "</span>" +
        '<span class="tx-state">' + item.label + "</span></li>";
    }).join("");
  };

  const resetAll = () => {
    state = [];
    render();
    if (resume) resume.disabled = true;
    if (output) output.textContent = "$ forge script script/DeployMiniVault.s.sol";
    setStatus(status, "Pilih mode lalu jalankan.", "");
  };

  run.addEventListener("click", () => {
    const isDry = mode.value === "dry";
    const shouldFail = failSelect.value === "fail";
    const hash1 = "0x7a3c...91b2";
    const hash3 = "0x2d81...c04e";

    state = stepNames.map((name) => ({ name, status: "wait", label: isDry ? "simulasi" : "menunggu", hash: "" }));

    if (isDry) {
      state[0].status = "ok";
      state[0].label = "simulasi";
      state[0].hash = "0x5FbD...0Aa3";
      if (shouldFail) {
        state[1].status = "bad";
        state[1].label = "akan revert";
        state[2].status = "wait";
        state[2].label = "dilewati";
        setStatus(status, "Simulasi menemukan revert di langkah 2. Tidak ada transaksi dikirim. Perbaiki penyebabnya sebelum broadcast.", "is-bad");
        if (output) output.textContent = "$ forge script script/DeployMiniVault.s.sol\n[siapa] deposit 1 ETH\n  revert: saldo pengirim 0\n\nSimulation failed. Tidak ada transaksi dikirim.";
      } else {
        state[1].status = "ok";
        state[1].label = "simulasi";
        state[2].status = "ok";
        state[2].label = "simulasi";
        setStatus(status, "Simulasi selesai. Tidak ada transaksi dikirim. Mode broadcast akan mengirim tiga transaksi.", "is-good");
        if (output) output.textContent = "$ forge script script/DeployMiniVault.s.sol\n[simulasi] deploy MiniVault\n[simulasi] deposit 1 ETH\n[simulasi] transferOwnership\n\nTidak ada transaksi dikirim.";
      }
      if (resume) resume.disabled = true;
      render();
      return;
    }

    state[0].status = "ok";
    state[0].label = "sukses";
    state[0].hash = hash1;

    if (shouldFail) {
      state[1].status = "bad";
      state[1].label = "revert";
      state[2].status = "wait";
      state[2].label = "dilewati";
      if (resume) resume.disabled = false;
      setStatus(status, "Broadcast berhenti di langkah 2. Langkah 1 sudah tercatat. Isi saldo pengirim, lalu tekan Resume. Jangan jalankan ulang dari awal.", "is-bad");
      if (output) output.textContent = "$ forge script ... --broadcast\n[ok] deploy MiniVault " + hash1 + "\n[gagal] deposit 1 ETH\n  revert: saldo pengirim 0\n\nBroadcast berhenti. Gunakan --resume setelah masalah diperbaiki.";
    } else {
      state[1].status = "ok";
      state[1].label = "sukses";
      state[2].status = "ok";
      state[2].label = "sukses";
      state[2].hash = hash3;
      if (resume) resume.disabled = true;
      setStatus(status, "Broadcast selesai. Tiga transaksi berhasil. Deploy tidak diulang saat resume.", "is-good");
      if (output) output.textContent = "$ forge script ... --broadcast\n[ok] deploy MiniVault " + hash1 + "\n[ok] deposit 1 ETH\n[ok] transferOwnership " + hash3 + "\n\nBroadcast complete.";
    }
    render();
  });

  if (resume) {
    resume.addEventListener("click", () => {
      if (!state.length) return;
      const failedIndex = state.findIndex((item) => item.status === "bad");
      if (failedIndex === -1) return;
      for (let i = failedIndex; i < state.length; i++) {
        state[i].status = "ok";
        state[i].label = "sukses";
        if (i === state.length - 1) state[i].hash = "0x2d81...c04e";
      }
      render();
      if (resume) resume.disabled = true;
      setStatus(status, "Resume berhasil. Langkah 1 tidak diulang; langkah 2 dan 3 diselesaikan.", "is-good");
      if (output) output.textContent = "$ forge script ... --broadcast --resume\n[skip] deploy MiniVault sudah tercatat\n[ok] deposit 1 ETH\n[ok] transferOwnership\n\nBroadcast complete.";
    });
  }

  if (reset) reset.addEventListener("click", resetAll);
  resetAll();
})();

/* ---------- Lab 12: cast ---------- */

(function initCastLab() {
  const buttons = $$("[data-cast]");
  if (!buttons.length) return;

  const output = $("#cast-out");
  const status = $("#cast-status");
  let block = 1;
  let total = 0n;
  let lastTx = "";
  let sendCount = 0;

  const setActive = (button) => {
    buttons.forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
  };

  const actions = {
    block: () => {
      if (output) output.textContent = "$ cast block-number --rpc-url localhost\n" + block;
      setStatus(status, "Nomor blok terbaru di node lokal.", "");
    },
    balance: () => {
      if (output) output.textContent = "$ cast balance 0xf39F...2266 --ether --rpc-url localhost\n10000.000000000000000000";
      setStatus(status, "Saldo akun-0 dalam ETH. Cast menampilkan presisi penuh.", "");
    },
    call: () => {
      if (output) output.textContent = "$ cast call 0x5FbD...0Aa3 \"totalDeposits()(uint256)\" --rpc-url localhost\n" + total.toString();
      setStatus(status, "totalDeposits() dibaca tanpa transaksi. Nilainya dalam wei.", "");
    },
    storage: () => {
      const hex = "0x" + total.toString(16).padStart(64, "0");
      if (output) output.textContent = "$ cast storage 0x5FbD...0Aa3 1 --rpc-url localhost\n" + hex;
      setStatus(status, "Slot 1 berisi totalDeposits di MiniVault. Slot 0 adalah mapping balanceOf. Urutan variabel menentukan nomor slot.", "");
    },
    send: () => {
      total += 1000000000000000000n;
      block += 1;
      sendCount += 1;
      lastTx = "0x" + String(sendCount).padStart(64, "b");
      if (output) {
        output.textContent = "$ cast send 0x5FbD...0Aa3 \"deposit()\" --value 1ether \\\n  --unlocked --from 0xf39F...2266 --rpc-url localhost\n\n" +
          "blockHash: 0x8ec1...77a0\nblockNumber: " + block + "\nstatus: 1 (success)\ngasUsed: 48211\ntransactionHash: " + lastTx.slice(0, 22) + "...";
      }
      setStatus(status, "Deposit 1 ETH terkirim. totalDeposits naik dan blok bertambah.", "is-good");
    },
    receipt: () => {
      if (!lastTx) {
        if (output) output.textContent = "$ cast receipt 0xHash status --rpc-url localhost\nError: transaksi belum ada di lab ini. Jalankan cast send dulu.";
        setStatus(status, "Belum ada transaksi untuk diperiksa.", "is-bad");
        return;
      }
      if (output) output.textContent = "$ cast receipt " + lastTx.slice(0, 22) + "... status --rpc-url localhost\n1";
      setStatus(status, "Status 1 berarti transaksi berhasil. Status 0 berarti revert.", "is-good");
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setActive(button);
      const action = actions[button.dataset.cast];
      if (action) action();
    });
  });
})();

/* ---------- Lab 13: trace ---------- */

(function initTraceLab() {
  const list = $("#trace-list");
  if (!list) return;

  const detail = $("#trace-detail");
  const select = $("#trace-cause");
  const check = $("#trace-check");
  const status = $("#trace-status");

  const details = [
    "Test memanggil withdraw. Gas total 84.231. Ini frame terluar, bukan penyebab kegagalan.",
    "withdraw menurunkan saldo dan total, lalu mengirim ETH ke pemanggil. Sampai di sini state sudah diperbarui.",
    "balanceOf adalah staticcall. Ia membaca state, tidak mengubah apa pun, dan bukan penyebab revert.",
    "Penerima adalah kontrak penyerang. receive() memanggil balik withdraw sebelum eksekusi pertama selesai.",
    "Panggilan ulang masuk lagi ke withdraw. Di sinilah guard mendeteksi reentry.",
    "Revert berasal dari ReentrancyGuardReentrantCall, bukan dari balanceOf atau kehabisan gas."
  ];

  list.addEventListener("click", (event) => {
    const row = event.target.closest("[data-trace]");
    if (!row) return;
    $$("[data-trace]", list).forEach((item) => item.setAttribute("aria-pressed", item === row ? "true" : "false"));
    const index = Number(row.dataset.trace);
    if (detail) detail.textContent = details[index] || "";
  });

  if (detail) detail.textContent = details[0];

  if (check) {
    check.addEventListener("click", () => {
      if (!select || !select.value) {
        setStatus(status, "Pilih penyebab terlebih dahulu.", "is-wait");
        return;
      }
      if (select.value === "guard") {
        setStatus(status, "Benar. Guard menolak pemanggilan ulang. Tanpa guard, CEI tetap membantu, tetapi guard memberi lapisan tambahan.", "is-good");
      } else {
        setStatus(status, "Belum tepat. balanceOf hanya membaca, dan gas tidak habis sebelum guard. Lihat frame terdalam: ReentrancyGuardReentrantCall.", "is-bad");
      }
    });
  }
})();

/* ---------- Uji kompetensi ---------- */

const quizQuestions = [
  {
    q: "Binary Foundry mana yang menjalankan unit test, fuzz test, dan invariant test?",
    options: ["cast", "anvil", "forge", "chisel"],
    answer: 2,
    explain: "forge menjalankan build, test, fuzz, invariant, dan script. cast berinteraksi dengan chain, anvil menyediakan node lokal."
  },
  {
    q: "Berapa jumlah fuzz run default di Foundry untuk test yang menerima parameter?",
    options: ["16", "256", "1.000", "10.000"],
    answer: 1,
    explain: "Default-nya 256 run. Angka ini bisa diubah di foundry.toml atau dengan flag --fuzz-runs."
  },
  {
    q: "Apa fungsi bound(x, min, max) pada fuzz test?",
    options: ["Membuang input di luar rentang", "Memetakan input ke rentang tanpa membuang run", "Menghentikan fuzzer setelah satu kegagalan", "Mengubah tipe uint256 menjadi uint8"],
    answer: 1,
    explain: "bound memetakan nilai ke rentang sehingga input selalu valid. vm.assume membuang input, yang bisa meningkatkan reject."
  },
  {
    q: "Apa yang terjadi saat vm.assume(kondisi) bernilai false?",
    options: ["Test langsung gagal", "Input tersebut dibuang dan fuzzer mencari input lain", "Kontrak di-deploy ulang", "Foundry mengganti seed"],
    answer: 1,
    explain: "assume membuang input yang tidak memenuhi kondisi. Terlalu banyak assume membuat fuzzer sulit menemukan input valid."
  },
  {
    q: "Di invariant test, mengapa handler perlu didaftarkan dengan targetContract(address(handler))?",
    options: ["Agar handler otomatis di-deploy ke mainnet", "Agar fuzzer memanggil fungsi handler, bukan kontrak target secara langsung", "Agar gas test dihitung dua kali", "Agar invariant berhenti setelah satu panggilan"],
    answer: 1,
    explain: "targetContract menentukan kontrak yang fungsinya dipanggil fuzzer. Handler membatasi input dan mencatat ghost variable."
  },
  {
    q: "Apa peran ghost variable di handler?",
    options: ["Menyimpan private key", "Mencatat state yang tidak disimpan on-chain untuk dibandingkan dengan state kontrak", "Menghapus storage kontrak", "Mengganti nama fungsi di trace"],
    answer: 1,
    explain: "Ghost variable mencatat akumulasi seperti total deposit atau total withdraw, lalu invariant membandingkannya dengan state kontrak."
  },
  {
    q: "Berapa chain id default Anvil?",
    options: ["1", "11155111", "31337", "1337"],
    answer: 2,
    explain: "Anvil default memakai chain id 31337 dan port 8545, dengan 10 akun berisi 10.000 ETH."
  },
  {
    q: "Perintah cast mana yang membaca fungsi view tanpa mengirim transaksi?",
    options: ["cast send", "cast call", "cast publish", "cast mktx"],
    answer: 1,
    explain: "cast call menjalankan panggilan terhadap state tanpa mengirim transaksi. cast send benar-benar mengirim dan membayar gas."
  },
  {
    q: "Apa yang dilakukan cast send?",
    options: ["Hanya mensimulasikan panggilan", "Mengirim transaksi dan mengubah state jika berhasil", "Mengompilasi kontrak", "Membuat node lokal"],
    answer: 1,
    explain: "cast send menandatangani dan mengirim transaksi. Di jaringan nyata, ia membayar gas dan bisa mengubah state."
  },
  {
    q: "Bagaimana menjalankan forge script dalam mode simulasi?",
    options: ["Tambahkan --broadcast", "Hilangkan --broadcast", "Tambahkan --resume", "Tambahkan --verify"],
    answer: 1,
    explain: "Tanpa --broadcast, Foundry mensimulasikan script terhadap state RPC dan tidak mengirim transaksi."
  },
  {
    q: "Apa fungsi flag --resume pada forge script?",
    options: ["Mengulang deploy dari langkah pertama", "Melanjutkan broadcast dari langkah yang belum selesai", "Menghapus folder broadcast", "Mengganti RPC endpoint"],
    answer: 1,
    explain: "Resume melanjutkan transaksi yang belum selesai tanpa mengulang langkah yang sudah berhasil."
  },
  {
    q: "Cara paling aman menyimpan private key untuk deploy dari terminal adalah ...",
    options: ["Menulisnya di foundry.toml", "Menempelkannya di perintah --private-key", "Mengimpor ke keystore dan memakai --account", "Menyimpannya di file README"],
    answer: 2,
    explain: "Keystore terenkripsi dan tidak muncul di shell history. Untuk mainnet, hardware wallet atau multisig lebih baik."
  },
  {
    q: "Verifikasi kontrak gagal karena bytecode tidak cocok. Apa yang paling mungkin berbeda?",
    options: ["Alamat wallet", "Versi compiler, optimizer, atau via_ir", "Jumlah akun Anvil", "Nama file test"],
    answer: 1,
    explain: "Verifier mereproduksi bytecode dari source dan pengaturan compiler. Perbedaan versi, optimizer, atau via_ir menghasilkan bytecode berbeda."
  },
  {
    q: "Kapan vm.expectRevert harus dipasang?",
    options: ["Sebelum panggilan yang diharapkan revert", "Setelah panggilan berhasil", "Di setUp saja", "Setelah test selesai"],
    answer: 0,
    explain: "expectRevert menunggu panggilan berikutnya. Pasang tepat sebelum panggilan yang harus gagal."
  },
  {
    q: "Empat argumen boolean pada vm.expectEmit menentukan ...",
    options: ["Jumlah event yang diharapkan", "Topik dan data mana yang harus dicocokkan", "Gas maksimum event", "Alamat pengirim event"],
    answer: 1,
    explain: "Boolean menunjukkan apakah topik 1, topik 2, topik 3, dan data diperiksa. Alamat emitter bisa ditambahkan sebagai argumen terpisah."
  },
  {
    q: "Coverage 100% berarti ...",
    options: ["Kontrak bebas bug", "Semua baris dieksekusi, tetapi assertion bisa saja tidak memeriksa apa pun", "Semua cabang pasti benar", "Kontrak sudah diaudit"],
    answer: 1,
    explain: "Coverage mengukur eksekusi, bukan kebenaran. Test tanpa assertion bisa mencapai coverage tinggi."
  },
  {
    q: "Mengapa fork test sebaiknya memakai --fork-block-number?",
    options: ["Agar gas lebih murah", "Agar state dan hasil test bisa direproduksi", "Agar tidak perlu RPC", "Agar kontrak otomatis terverifikasi"],
    answer: 1,
    explain: "Tanpa pin blok, state berubah setiap hari. Pin blok membuat test konsisten selama RPC menyediakan arsip blok tersebut."
  },
  {
    q: "Di OpenZeppelin 5.x, bagaimana constructor Ownable ditulis?",
    options: ["Ownable()", "Ownable(msg.sender)", "Ownable(initialOwner)", "Ownable(address(0))"],
    answer: 2,
    explain: "Ownable 5.x membutuhkan alamat awal, misalnya Ownable(awal) atau Ownable(msg.sender) bila deployer adalah owner."
  },
  {
    q: "Pada verbosity mana console.log di test mulai terlihat?",
    options: ["-v", "-vv", "-vvv", "-vvvv"],
    answer: 1,
    explain: "Log muncul pada -vv. -vvv menambahkan trace untuk test yang gagal, -vvvv untuk semua test."
  },
  {
    q: "Invariant test gagal dan menampilkan urutan panggilan. Langkah paling tepat berikutnya?",
    options: ["Menaikkan runs sampai lulus", "Menghapus invariant", "Mengubah urutan menjadi unit test regresi, lalu memperbaiki penyebab", "Mengganti seed"],
    answer: 2,
    explain: "Urutan panggilan adalah bukti. Ubah menjadi test regresi yang kecil, perbaiki penyebabnya, lalu jalankan invariant lagi."
  }
];

(function initQuiz() {
  const form = $("#quiz-form");
  if (!form) return;

  const submit = $("#quiz-submit");
  const retry = $("#quiz-retry");
  const status = $("#quiz-status");
  const result = $("#quiz-result");

  form.innerHTML = quizQuestions.map((item, index) => {
    const options = item.options.map((option, optionIndex) => {
      const id = "q" + (index + 1) + "-o" + (optionIndex + 1);
      return '<label class="option" for="' + id + '"><input id="' + id + '" type="radio" name="q' + (index + 1) + '" value="' + optionIndex + '"><span>' + escapeHtml(option) + "</span></label>";
    }).join("");

    return '<fieldset class="quiz-q"><legend><span class="q-num">' + String(index + 1).padStart(2, "0") + "</span>" + escapeHtml(item.q) + "</legend>" + options + "</fieldset>";
  }).join("");

  const mark = (index, score) => {
    const fieldset = form.querySelectorAll(".quiz-q")[index];
    if (!fieldset) return;
    const options = $$(".option", fieldset);
    const selected = $("input:checked", fieldset);

    options.forEach((label, optionIndex) => {
      label.classList.remove("is-correct", "is-wrong");
      const old = $(".mark", label);
      if (old) old.remove();

      if (optionIndex === quizQuestions[index].answer) {
        label.classList.add("is-correct");
        const badge = document.createElement("span");
        badge.className = "mark";
        badge.textContent = "benar";
        label.appendChild(badge);
      } else if (selected && Number(selected.value) === optionIndex) {
        label.classList.add("is-wrong");
        const badge = document.createElement("span");
        badge.className = "mark";
        badge.textContent = "pilihanmu";
        label.appendChild(badge);
      }
    });

    const explain = document.createElement("p");
    explain.className = "quiz-explain";
    explain.textContent = quizQuestions[index].explain;
    fieldset.appendChild(explain);

    $$("input", fieldset).forEach((input) => { input.disabled = true; });
    return score;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = new FormData(form);
    const missing = [];

    quizQuestions.forEach((item, index) => {
      if (!answers.get("q" + (index + 1))) missing.push(index + 1);
    });

    if (missing.length) {
      setStatus(status, "Masih ada " + missing.length + " soal tanpa jawaban. Lengkapi dulu.", "is-bad");
      const first = form.querySelector('input[name="q' + missing[0] + '"]');
      if (first) first.focus();
      return;
    }

    let score = 0;
    quizQuestions.forEach((item, index) => {
      const value = Number(answers.get("q" + (index + 1)));
      if (value === item.answer) score += 1;
      mark(index, score);
    });

    const best = Math.max(score, Number(store.get("alat.quiz.v1", 0)) || 0);
    store.set("alat.quiz.v1", best);

    const passed = score >= 16;
    if (passed && window.setProgressDone) window.setProgressDone("uji", true, false);

    if (result) {
      result.innerHTML = '<div class="quiz-summary' + (passed ? "" : " is-fail") + '">' +
        "<h3>" + (passed ? "Lulus." : "Belum lulus.") + "</h3>" +
        "<p>Skor " + score + " dari 20. Skor terbaikmu " + best + " dari 20. " +
        (passed
          ? "Kamu memahami alur alat dan test. Lanjutkan dengan proyek nyata di testnet."
          : "Baca ulang penjelasan di bawah, lalu coba lagi. Minimal 16 benar untuk lulus.") +
        "</p></div>";
    }

    setStatus(status, passed ? "Ujian lulus. Progres ujian ditandai." : "Ujian belum lulus. Periksa penjelasan tiap soal.", passed ? "is-good" : "is-bad");
    if (submit) submit.disabled = true;
  });

  if (retry) {
    retry.addEventListener("click", () => {
      form.reset();
      $$(".option", form).forEach((label) => {
        label.classList.remove("is-correct", "is-wrong");
        const badge = $(".mark", label);
        if (badge) badge.remove();
      });
      $$(".quiz-explain", form).forEach((el) => el.remove());
      $$("input", form).forEach((input) => { input.disabled = false; });
      if (result) result.innerHTML = "";
      if (submit) submit.disabled = false;
      setStatus(status, "Belum ada jawaban yang diperiksa.", "");
      const first = $("input", form);
      if (first) first.focus();
    });
  }
})();

/* ---------- Mulai sorotan setelah DOM siap ---------- */

initHighlight();
