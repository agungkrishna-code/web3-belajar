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
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      /* abaikan */
    }
  }
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : ms));

const fmtInt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtUsd = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const usd = (value) => (value < 0 ? "-" : "") + "$" + fmtUsd.format(Math.abs(value));
const pct = (value) => (value < 0 ? "-" : "") + fmtPct.format(Math.abs(value)) + "%";

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
  window.setTimeout(() => {
    button.textContent = original;
  }, 1600);
});

/* ---------- Sorotan kode ---------- */

const SOL_TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(0x[0-9a-fA-F]+|\d[\d_]*)\b|\b(pragma|solidity|contract|interface|library|abstract|is|using|function|modifier|event|error|struct|enum|mapping|constructor|receive|fallback|returns|return|if|else|for|while|do|break|continue|emit|revert|require|assert|try|catch|new|delete|import|from|as|unchecked|assembly|virtual|override|super|constant|immutable|public|private|internal|external|pure|view|payable|memory|storage|calldata|true|false|type|this|msg|block|tx)\b|\b(address|bool|string|bytes(?:[1-9]|[12][0-9]|3[0-2])?|u?int(?:8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?)\b/g;

const JS_TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(0x[0-9a-fA-F]+|\d[\d_]*(?:\.\d+)?n?)\b|\b(import|from|export|default|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|implements|type|interface|enum|as|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|null|undefined|true|false|this|super|static|public|private|protected|readonly|declare|module|namespace|satisfies|keyof)\b/g;

const BASH_TOKEN_RE = /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(^|\s)(\$)(?=[A-Za-z_{])|\b(forge|cast|anvil|chisel|foundryup|curl|git|cd|mkdir|ls|echo|source|export|npm|npx|node|jq|if|else)\b/gm;

const JSON_TOKEN_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g;

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

function highlightJs(code) {
  return tokenize(code, JS_TOKEN_RE, (match) => {
    if (match[1]) return "tok-c";
    if (match[2]) return "tok-s";
    if (match[3]) return "tok-n";
    return "tok-k";
  });
}

function highlightBash(code) {
  return tokenize(code, BASH_TOKEN_RE, (match) => {
    if (match[1]) return "tok-c";
    if (match[2]) return "tok-s";
    if (match[4]) return "tok-t";
    return "tok-k";
  });
}

function highlightJson(code) {
  return tokenize(code, JSON_TOKEN_RE, (match) => {
    if (match[1]) return match[2] ? "tok-t" : "tok-s";
    if (match[3]) return "tok-k";
    return "tok-n";
  });
}

function highlightCode(code, lang) {
  if (lang === "bash" || lang === "sh" || lang === "shell" || lang === "powershell" || lang === "toml") return highlightBash(code);
  if (lang === "json") return highlightJson(code);
  if (lang === "ts" || lang === "tsx" || lang === "js" || lang === "jsx") return highlightJs(code);
  if (lang === "text" || lang === "plain") return escapeHtml(code);
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
    if (persist) store.set("benteng.theme", theme);
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
    const title = section.dataset.title || "Materi";
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
    const results = [];
    for (const item of index) {
      const pos = item.text.toLowerCase().indexOf(lower);
      if (pos === -1 && !item.title.toLowerCase().includes(lower)) continue;
      results.push({ ...item, pos: pos === -1 ? 0 : pos });
      if (results.length >= 8) break;
    }

    if (!results.length) {
      panel.innerHTML = '<p class="search-empty">Tidak ada materi yang cocok. Coba kata lain.</p>';
      panel.hidden = false;
      return;
    }

    panel.innerHTML = "<ul>" + results.map((item) => {
      return '<li><a href="#' + item.id + '"><span class="result-chapter">' + escapeHtml(item.mark) + '</span><span class="result-title">' + escapeHtml(item.title) + '</span><span class="result-snippet">' + makeSnippet(item.text, item.pos, term) + "</span></a></li>";
    }).join("") + "</ul>";
    panel.hidden = false;
  };

  input.addEventListener("input", render);
  input.addEventListener("focus", render);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      input.blur();
    }
    if (event.key === "Enter") {
      const first = $("a", panel);
      if (first) {
        event.preventDefault();
        first.click();
      }
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
  key: "benteng.progress.v1",
  quizKey: "benteng.quiz.v1",
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

    const text = $("#progress-text");
    const track = $("#progress-track");
    if (text) text.textContent = count + " dari " + total;
    if (track) {
      track.max = total;
      track.value = count;
      track.textContent = count + " dari " + total;
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
      if (!heading.id) heading.id = section.id + "-" + slug(heading.textContent, "bagian-" + (index + 1));
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
  if (navItems.length) {
    activeSection = navItems[0].el;
    renderToc(activeSection);
    update();
  }
})();

/* ---------- Lab 01: permukaan serangan ---------- */

(function initSurfaceLab() {
  const tasks = $$("[data-surface]");
  const check = $("#surface-check");
  const reset = $("#surface-reset");
  const status = $("#surface-status");
  if (!tasks.length || !check || !status) return;

  const evaluate = () => {
    let correct = 0;
    let answered = 0;

    tasks.forEach((task) => {
      const select = $("select", task);
      const ok = select.value !== "" && select.value === task.dataset.answer;
      task.classList.toggle("is-ok", ok);
      task.classList.toggle("is-bad", select.value !== "" && !ok);
      if (select.value !== "") answered += 1;
      if (ok) correct += 1;
    });

    if (answered < tasks.length) {
      status.textContent = "Masih ada " + (tasks.length - answered) + " fungsi tanpa penilaian.";
      status.className = "status is-bad";
      return;
    }

    status.textContent = correct === tasks.length
      ? "Tepat. Nilai dan hak menentukan risiko, bukan jumlah pemanggilan."
      : correct + " dari " + tasks.length + " tepat. Periksa fungsi yang melibatkan dana, hak admin, atau jalur keluar.";
    status.className = "status " + (correct === tasks.length ? "is-good" : "is-bad");
  };

  check.addEventListener("click", evaluate);

  reset.addEventListener("click", () => {
    tasks.forEach((task) => {
      $("select", task).value = "";
      task.classList.remove("is-ok", "is-bad");
    });
    status.textContent = "Belum ada penilaian.";
    status.className = "status";
  });
})();

/* ---------- Lab 02: reentrancy ---------- */

(function initReentrancyLab() {
  const run = $("#re-run");
  const reset = $("#re-reset");
  const log = $("#re-log");
  const status = $("#re-status");
  const guardBox = $("#re-guard");
  const ceiBox = $("#re-cei");
  if (!run || !log || !status) return;

  const vaultEl = $("#re-vault");
  const attackerEl = $("#re-attacker");
  const depositEl = $("#re-deposit");
  const profitEl = $("#re-profit");

  const eth = (value) => value.toFixed(2).replace(".", ",") + " ETH";

  const paint = (vault, attacker) => {
    if (vaultEl) vaultEl.textContent = eth(vault);
    if (attackerEl) attackerEl.textContent = eth(attacker);
    if (depositEl) depositEl.textContent = "1,00 ETH";
    if (profitEl) profitEl.textContent = eth(attacker > 0 ? attacker - 1 : 0);
  };

  const line = (text, cls) => {
    const span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = text + "\n";
    log.appendChild(span);
    log.scrollTop = log.scrollHeight;
  };

  let running = false;

  const attack = async () => {
    if (running) return;
    running = true;
    run.disabled = true;

    const guarded = Boolean(guardBox && guardBox.checked);
    const cei = Boolean(ceiBox && ceiBox.checked);

    log.textContent = "";
    paint(4, 0);
    status.className = "status is-wait";
    status.textContent = "Menjalankan transaksi...";

    line("attacker.call(vault.withdraw())");
    await wait(260);

    if (!guarded && !cei) {
      let vault = 4;
      let attacker = 0;

      line("withdraw(): cek balanceOf[attacker] = 1,00 ETH", "p");
      await wait(280);

      for (let call = 1; call <= 4 && vault > 0; call += 1) {
        line("kirim 1,00 ETH ke kontrak penyerang", "ok");
        vault -= 1;
        attacker += 1;
        paint(vault, attacker);
        await wait(300);

        if (call < 4) {
          line("receive(): panggil withdraw() lagi", "warn");
          await wait(260);
          line("withdraw(): balanceOf masih 1,00 ETH", "p");
          await wait(260);
        }
      }

      line("baris balanceOf[attacker] = 0 baru dijalankan sekarang", "dim");
      line("vault terkuras. Laba penyerang = 3,00 ETH", "bad");
      paint(0, 4);
      status.textContent = "Serangan berhasil. Saldo dikirim sebelum state diperbarui, jadi setiap panggilan ulang melihat saldo lama.";
      status.className = "status is-bad";
    } else {
      line("withdraw(): cek balanceOf[attacker] = 1,00 ETH", "p");
      await wait(260);

      if (cei) {
        line("effects: balanceOf[attacker] = 0 sebelum transfer", "p");
        await wait(260);
      }

      line("kirim 1,00 ETH ke kontrak penyerang", "ok");
      await wait(280);
      line("receive(): panggil withdraw() lagi", "warn");
      await wait(260);

      if (guarded) {
        line("revert: ReentrancyGuard menolak panggilan ulang", "bad");
      } else {
        line("withdraw(): balanceOf[attacker] = 0", "p");
        line("revert: saldo kurang", "bad");
      }

      await wait(300);
      line("revert merambat ke call, require(ok) gagal", "bad");
      line("transaksi dibatalkan; state kembali seperti semula", "dim");

      paint(4, 0);
      status.textContent = guarded && cei
        ? "Dua lapis bekerja. Guard menghentikan panggilan ulang, CEI membuat saldo sudah nol."
        : guarded
          ? "Guard menghentikan panggilan ulang. Transaksi luar ikut revert karena transfer gagal."
          : "CEI membuat panggilan ulang tidak menemukan saldo. Transaksi luar ikut revert.";
      status.className = "status is-good";
    }

    running = false;
    run.disabled = false;
  };

  run.addEventListener("click", attack);

  if (reset) {
    reset.addEventListener("click", () => {
      if (running) return;
      if (guardBox) guardBox.checked = false;
      if (ceiBox) ceiBox.checked = false;
      log.textContent = "Belum ada eksekusi.";
      paint(4, 0);
      status.textContent = "Siap dijalankan.";
      status.className = "status";
    });
  }

  paint(4, 0);
})();

/* ---------- Lab 03: access control ---------- */

(function initAccessLab() {
  const tasks = $$("[data-access]");
  const check = $("#akses-check");
  const reset = $("#akses-reset");
  const status = $("#akses-status");
  if (!tasks.length || !check || !status) return;

  const evaluate = () => {
    let correct = 0;
    let answered = 0;

    tasks.forEach((task) => {
      const select = $("select", task);
      const ok = select.value !== "" && select.value === task.dataset.answer;
      task.classList.toggle("is-ok", ok);
      task.classList.toggle("is-bad", select.value !== "" && !ok);
      if (select.value !== "") answered += 1;
      if (ok) correct += 1;
    });

    if (answered < tasks.length) {
      status.textContent = "Masih ada " + (tasks.length - answered) + " fungsi tanpa pemegang hak.";
      status.className = "status is-bad";
      return;
    }

    status.textContent = correct === tasks.length
      ? "Tepat. Setiap kunci memegang satu kekuatan, dan tidak ada yang memegang semuanya."
      : correct + " dari " + tasks.length + " tepat. Periksa fungsi yang bisa mengubah harga, dana, atau status darurat.";
    status.className = "status " + (correct === tasks.length ? "is-good" : "is-bad");
  };

  check.addEventListener("click", evaluate);

  reset.addEventListener("click", () => {
    tasks.forEach((task) => {
      $("select", task).value = "";
      task.classList.remove("is-ok", "is-bad");
    });
    status.textContent = "Belum ada pilihan.";
    status.className = "status";
  });
})();

/* ---------- Lab 04: integer dan pembulatan ---------- */

(function initIntegerLab() {
  const value = $("#int-value");
  const add = $("#int-add");
  const mode = $("#int-mode");
  const total = $("#int-total");
  const shares = $("#int-shares");
  const deposit = $("#int-deposit");
  const result = $("#int-result");
  const verdict = $("#int-verdict");
  const mintedEl = $("#int-minted");
  const valueEl = $("#int-value-out");
  const status = $("#int-arith-status");
  const labStatus = $("#int-status");
  const run = $("#int-run");
  const reset = $("#int-reset");
  if (!value || !total || !result) return;

  const calculate = () => {
    const base = Math.trunc(Number(value.value) || 0);
    const increment = Math.trunc(Number(add.value) || 0);
    const unchecked = mode.value === "unchecked";
    const sum = base + increment;

    if (!unchecked && sum > 255) {
      result.textContent = "revert";
      verdict.textContent = "Overflow terdeteksi";
      verdict.className = "is-bad";
    } else {
      const wrapped = ((sum % 256) + 256) % 256;
      result.textContent = String(wrapped);
      verdict.textContent = sum > 255 ? "Membungkus ke " + wrapped : "Dalam batas uint8";
      verdict.className = sum > 255 ? "is-bad" : "";
    }

    if (status) {
      status.textContent = unchecked
        ? "unchecked mematikan pemeriksaan. 250 + 10 menjadi 4."
        : "checked memeriksa batas. 250 + 10 berhenti dengan revert.";
    }

    const t = BigInt(Math.max(1, Math.trunc(Number(total.value) || 1)));
    const s = BigInt(Math.max(1, Math.trunc(Number(shares.value) || 1)));
    const d = BigInt(Math.max(0, Math.trunc(Number(deposit.value) || 0)));
    const minted = (d * s) / t;

    if (mintedEl) mintedEl.textContent = fmtInt.format(minted);
    if (valueEl) valueEl.textContent = fmtInt.format((minted * t) / s) + " unit";

    if (labStatus) {
      if (minted === 0n && d > 0n) {
        labStatus.textContent = "Setoran " + fmtInt.format(d) + " unit menghasilkan 0 share. Nilai itu tidak kembali sebagai klaim.";
        labStatus.className = "status is-bad";
      } else {
        const lost = d - (minted * t) / s;
        labStatus.textContent = lost > 0n
          ? "Pembulatan ke bawah menghilangkan " + fmtInt.format(lost) + " unit dari setoran ini. Protokol menanggung sisa, bukan pengguna."
          : "Tidak ada sisa pembulatan pada nilai ini.";
        labStatus.className = "status";
      }
    }
  };

  [value, add, total, shares, deposit].forEach((input) => {
    if (input) input.addEventListener("input", calculate);
  });
  if (mode) mode.addEventListener("change", calculate);
  if (run) run.addEventListener("click", calculate);

  if (reset) {
    reset.addEventListener("click", () => {
      value.value = "250";
      add.value = "10";
      mode.value = "unchecked";
      total.value = "1000000";
      shares.value = "3";
      deposit.value = "1";
      calculate();
    });
  }

  calculate();
})();

/* ---------- Lab 05: oracle ---------- */

(function initOracleLab() {
  const poolEth = $("#or-pool-eth");
  const poolUsd = $("#or-pool-usd");
  const trade = $("#or-trade");
  const windowEl = $("#or-window");
  const threshold = $("#or-threshold");
  const run = $("#or-run");
  const reset = $("#or-reset");
  const status = $("#or-status");
  if (!poolEth || !run) return;

  const baseEl = $("#or-base");
  const spotEl = $("#or-spot");
  const devEl = $("#or-dev");
  const twapEl = $("#or-twap");
  const costEl = $("#or-cost");
  const verdictEl = $("#or-verdict");

  const calculate = () => {
    const eth = Math.max(1, Number(poolEth.value) || 1);
    const usdReserve = Math.max(1000, Number(poolUsd.value) || 1000);
    const buy = Math.max(0, Number(trade.value) || 0);
    const blocks = Math.max(1, Math.trunc(Number(windowEl.value) || 1));
    const limit = Math.max(0.1, Number(threshold.value) || 0.1);

    const base = usdReserve / eth;
    const effective = buy * 0.997;
    const ethOut = (eth * effective) / (usdReserve + effective);
    const ethAfter = eth - ethOut;
    const usdAfter = usdReserve + effective;
    const spot = usdAfter / ethAfter;
    const deviation = spot / base - 1;

    const sellIn = ethOut * 0.997;
    const usdBack = (usdAfter * sellIn) / (ethAfter + sellIn);
    const cost = buy - usdBack;

    const twapDeviation = deviation / blocks;
    const moved = Math.abs(twapDeviation) * 100 > limit;

    if (baseEl) baseEl.textContent = usd(base);
    if (spotEl) spotEl.textContent = usd(spot);
    if (devEl) devEl.textContent = pct(deviation * 100);
    if (twapEl) twapEl.textContent = pct(twapDeviation * 100);
    if (costEl) costEl.textContent = usd(cost);
    if (verdictEl) {
      verdictEl.textContent = moved ? "TWAP ikut bergeser" : "TWAP menolak";
      verdictEl.className = moved ? "is-bad" : "is-good";
    }

    if (status) {
      status.textContent = moved
        ? "Deviasi TWAP " + pct(twapDeviation * 100) + " melewati ambang " + limit + "%. Jendela terlalu pendek atau pembelian terlalu besar."
        : "Deviasi TWAP " + pct(twapDeviation * 100) + " masih di bawah ambang " + limit + "%. Protokol menolak harga hasil manipulasi.";
      status.className = "status " + (moved ? "is-bad" : "is-good");
    }
  };

  [poolEth, poolUsd, trade, windowEl, threshold].forEach((input) => {
    if (input) input.addEventListener("input", calculate);
  });
  run.addEventListener("click", calculate);

  if (reset) {
    reset.addEventListener("click", () => {
      poolEth.value = "1000";
      poolUsd.value = "2000000";
      trade.value = "200000";
      windowEl.value = "30";
      threshold.value = "2";
      calculate();
    });
  }

  calculate();
})();

/* ---------- Lab 06: front-running ---------- */

(function initFrontrunLab() {
  const amountEl = $("#fr-amount");
  const slipEl = $("#fr-slippage");
  const attackEl = $("#fr-attack");
  const publicBtn = $("#fr-public");
  const privateBtn = $("#fr-private");
  const status = $("#fr-status");
  if (!amountEl || !publicBtn) return;

  const poolEth = 1000;
  const poolUsd = 2000000;
  const fee = 0.997;

  const cleanOut = (amount) => {
    const effective = amount * fee;
    return (poolEth * effective) / (poolUsd + effective);
  };

  const paint = (data) => {
    if ($("#fr-clean")) $("#fr-clean").textContent = data.clean.toFixed(4).replace(".", ",") + " ETH";
    if ($("#fr-hit")) $("#fr-hit").textContent = data.hit.toFixed(4).replace(".", ",") + " ETH";
    if ($("#fr-min")) $("#fr-min").textContent = data.min.toFixed(4).replace(".", ",") + " ETH";
    if ($("#fr-result")) $("#fr-result").textContent = data.result;
    if ($("#fr-profit")) $("#fr-profit").textContent = usd(data.profit);
  };

  const execute = (isPrivate) => {
    const amount = Math.max(10, Number(amountEl.value) || 10);
    const slippage = Math.max(0, Number(slipEl.value) || 0) / 100;
    const capital = Math.max(0, Number(attackEl.value) || 0);

    const clean = cleanOut(amount);
    const min = clean * (1 - slippage);

    if (isPrivate || capital === 0) {
      paint({ clean, hit: clean, min, result: "Berhasil, tanpa sandwich", profit: 0 });
      status.textContent = isPrivate
        ? "Relay privat menyembunyikan transaksi dari mempool publik. Tidak ada penyerang yang bisa mendahului."
        : "Tidak ada modal penyerang. Hasil sama dengan harga bersih.";
      status.className = "status is-good";
      return;
    }

    const attackEffective = capital * fee;
    const attackEth = (poolEth * attackEffective) / (poolUsd + attackEffective);
    const eth1 = poolEth - attackEth;
    const usd1 = poolUsd + attackEffective;

    const userEffective = amount * fee;
    const userOut = (eth1 * userEffective) / (usd1 + userEffective);

    let profit;
    let result;
    let hit;

    if (userOut >= min) {
      const eth2 = eth1 - userOut;
      const usd2 = usd1 + userEffective;
      const sellEffective = attackEth * fee;
      const usdBack = (usd2 * sellEffective) / (eth2 + sellEffective);
      profit = usdBack - capital;
      result = "Berhasil, harga lebih buruk";
      hit = userOut;
      status.textContent = "Korban menerima " + userOut.toFixed(4).replace(".", ",") + " ETH, di atas batas minimum. Penyerang menjual setelahnya dan mengambil selisih.";
      status.className = "status is-bad";
    } else {
      const sellEffective = attackEth * fee;
      const usdBack = (usd1 * sellEffective) / (eth1 + sellEffective);
      profit = usdBack - capital;
      result = "Revert, dilindungi slippage";
      hit = userOut;
      status.textContent = "Hasil " + userOut.toFixed(4).replace(".", ",") + " ETH di bawah minimum " + min.toFixed(4).replace(".", ",") + " ETH. Transaksi korban revert; penyerang menjual kembali dengan kerugian biaya.";
      status.className = "status is-good";
    }

    paint({ clean, hit, min, result, profit });
  };

  publicBtn.addEventListener("click", () => execute(false));
  if (privateBtn) privateBtn.addEventListener("click", () => execute(true));

  const preview = () => {
    const amount = Math.max(10, Number(amountEl.value) || 10);
    const slippage = Math.max(0, Number(slipEl.value) || 0) / 100;
    const clean = cleanOut(amount);
    paint({ clean, hit: clean, min: clean * (1 - slippage), result: "Belum dijalankan", profit: 0 });
  };

  [amountEl, slipEl, attackEl].forEach((input) => {
    if (input) input.addEventListener("input", preview);
  });

  preview();
})();

/* ---------- Lab 07: flash loan ---------- */

(function initFlashLab() {
  const amountEl = $("#fl-amount");
  const feeEl = $("#fl-fee");
  const ltvEl = $("#fl-ltv");
  const inflationEl = $("#fl-inflation");
  const gasEl = $("#fl-gas");
  const run = $("#fl-run");
  const reset = $("#fl-reset");
  const status = $("#fl-status");
  if (!amountEl || !run) return;

  const calculate = () => {
    const amount = Math.max(1000, Number(amountEl.value) || 1000);
    const feeBps = Math.max(0, Number(feeEl.value) || 0);
    const ltv = Math.min(95, Math.max(1, Number(ltvEl.value) || 1)) / 100;
    const inflation = Math.max(0, Number(inflationEl.value) || 0) / 100;
    const gas = Math.max(0, Number(gasEl.value) || 0);

    const collateral = amount * (1 + inflation);
    const borrow = collateral * ltv;
    const feeCost = amount * (feeBps / 10000);
    const profit = borrow - amount - feeCost - gas;
    const breakEven = (amount + feeCost + gas) / (amount * ltv) - 1;

    if ($("#fl-collateral")) $("#fl-collateral").textContent = usd(collateral);
    if ($("#fl-borrow")) $("#fl-borrow").textContent = usd(borrow);
    if ($("#fl-cost")) $("#fl-cost").textContent = usd(feeCost + gas);
    if ($("#fl-profit")) {
      $("#fl-profit").textContent = usd(profit);
      $("#fl-profit").className = profit > 0 ? "is-bad" : "";
    }

    if (status) {
      status.textContent = profit > 0
        ? "Serangan ekonomis. Laba bersih " + usd(profit) + ". Protokol menanggung posisi yang tidak lagi cukup dijamin."
        : "Tidak ekonomis. Butuh kenaikan harga sekitar " + pct(Math.max(0, breakEven * 100)) + " agar impas dengan biaya.";
      status.className = "status " + (profit > 0 ? "is-bad" : "is-good");
    }
  };

  [amountEl, feeEl, ltvEl, inflationEl, gasEl].forEach((input) => {
    if (input) input.addEventListener("input", calculate);
  });
  run.addEventListener("click", calculate);

  if (reset) {
    reset.addEventListener("click", () => {
      amountEl.value = "1000000";
      feeEl.value = "5";
      ltvEl.value = "80";
      inflationEl.value = "40";
      gasEl.value = "300";
      calculate();
    });
  }

  calculate();
})();

/* ---------- Lab 08: signature ---------- */

(function initSignatureLab() {
  const owner = $("#sig-owner");
  const spender = $("#sig-spender");
  const value = $("#sig-value");
  const nonce = $("#sig-nonce");
  const chain = $("#sig-chain");
  const deadline = $("#sig-deadline");
  const domainBox = $("#sig-domain");
  const nonceBox = $("#sig-nonce-check");
  const deadlineBox = $("#sig-deadline-check");
  const sign = $("#sig-sign");
  const use = $("#sig-use");
  const reset = $("#sig-reset");
  const hashEl = $("#sig-hash");
  const status = $("#sig-status");
  if (!owner || !sign || !use) return;

  const VERIFIER = "0xB3A7E00000000000000000000000000000000001";
  const CURRENT_BLOCK = 1000;
  const used = new Set();
  let signed = null;

  const fnv = (text) => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  };

  const simHash = (text) => {
    let out = "";
    for (let i = 0; i < 8; i += 1) out += fnv(text + "|" + i);
    return "0x" + out;
  };

  const fields = () => ({
    owner: owner.value.trim().toLowerCase(),
    spender: spender.value.trim().toLowerCase(),
    value: value.value.trim(),
    nonce: nonce.value.trim(),
    chain: chain.value.trim(),
    deadline: deadline.value.trim()
  });

  const buildHash = (data, withDomain) => {
    let text = ["Permit", data.owner, data.spender, data.value, data.nonce, data.deadline].join("|");
    if (withDomain) text += "|chain:" + data.chain + "|contract:" + VERIFIER;
    return simHash(text);
  };

  const renderSignature = (data, hash) => {
    if (!hashEl) return;
    hashEl.textContent = hash + "\n\n" +
      "domain: " + (domainBox.checked ? data.chain + " / " + VERIFIER : "tidak diikat") + "\n" +
      "owner: " + data.owner + "\n" +
      "spender: " + data.spender + "\n" +
      "value: " + data.value + "\n" +
      "nonce: " + data.nonce + "\n" +
      "deadline: " + data.deadline + "\n" +
      "signature: 0xsig" + hash.slice(2, 18);
  };

  sign.addEventListener("click", () => {
    const data = fields();
    const hash = buildHash(data, Boolean(domainBox && domainBox.checked));
    signed = { hash, data, withDomain: Boolean(domainBox && domainBox.checked) };
    renderSignature(data, hash);
    status.textContent = "Tanda tangan dibuat. Sekarang tekan Pakai, atau ubah field untuk menguji penolakan.";
    status.className = "status is-good";
  });

  use.addEventListener("click", () => {
    if (!signed) {
      status.textContent = "Belum ada tanda tangan. Tekan Tanda tangani dulu.";
      status.className = "status is-bad";
      return;
    }

    const data = fields();
    const withDomain = Boolean(domainBox && domainBox.checked);
    const hash = buildHash(data, withDomain);

    if (hash !== signed.hash) {
      status.textContent = "Ditolak: hash berubah. Domain, chain, kontrak, atau isi pesan tidak cocok dengan yang ditandatangani.";
      status.className = "status is-bad";
      return;
    }

    if (deadlineBox && deadlineBox.checked && CURRENT_BLOCK > Number(data.deadline)) {
      status.textContent = "Ditolak: blok " + CURRENT_BLOCK + " sudah melewati deadline " + data.deadline + ".";
      status.className = "status is-bad";
      return;
    }

    if (nonceBox && nonceBox.checked && used.has(data.nonce)) {
      status.textContent = "Ditolak: nonce " + data.nonce + " sudah dipakai. Tanda tangan ini adalah replay.";
      status.className = "status is-bad";
      return;
    }

    used.add(data.nonce);
    status.textContent = nonceBox && nonceBox.checked
      ? "Diterima. Nonce " + data.nonce + " ditandai terpakai; pemakaian kedua akan ditolak."
      : "Diterima tanpa pemeriksaan nonce. Tekan Pakai lagi untuk melihat replay berhasil.";
    status.className = "status is-good";
  });

  if (reset) {
    reset.addEventListener("click", () => {
      owner.value = "0x1111111111111111111111111111111111111111";
      spender.value = "0x2222222222222222222222222222222222222222";
      value.value = "1000";
      nonce.value = "0";
      chain.value = "11155111";
      deadline.value = "1200";
      if (domainBox) domainBox.checked = true;
      if (nonceBox) nonceBox.checked = true;
      if (deadlineBox) deadlineBox.checked = true;
      used.clear();
      signed = null;
      if (hashEl) hashEl.textContent = "Belum ditandatangani.";
      status.textContent = "Belum ada tanda tangan.";
      status.className = "status";
    });
  }
})();

/* ---------- Lab 09: checks-effects-interactions ---------- */

(function initCeiLab() {
  const list = $("#cei-list");
  const check = $("#cei-check");
  const reset = $("#cei-reset");
  const status = $("#cei-status");
  if (!list || !check) return;

  let order = $$("li", list);

  const render = () => {
    order.forEach((item) => list.appendChild(item));
  };

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-move]");
    if (!button) return;
    const item = button.closest("li");
    const index = order.indexOf(item);
    const target = button.dataset.move === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    render();
    status.textContent = "Urutan diubah. Tekan Periksa urutan.";
    status.className = "status";
  });

  check.addEventListener("click", () => {
    const ids = order.map((item) => item.dataset.step);
    const expected = ["check", "effect", "send", "event"];
    const correct = ids.every((id, index) => id === expected[index]);

    if (correct) {
      status.textContent = "Benar. Checks, effects, interactions, lalu event setelah state konsisten.";
      status.className = "status is-good";
    } else {
      const sendAt = ids.indexOf("send");
      const effectAt = ids.indexOf("effect");
      status.textContent = sendAt < effectAt
        ? "Belum aman. Transfer terjadi sebelum state diperbarui, jadi penerima bisa memanggil ulang dengan saldo lama."
        : "Belum tepat. Urutan yang aman: periksa, kurangi saldo, kirim, lalu catat event.";
      status.className = "status is-bad";
    }
  });

  if (reset) {
    reset.addEventListener("click", () => {
      const byId = {};
      $$("li", list).forEach((item) => { byId[item.dataset.step] = item; });
      order = [byId.effect, byId.send, byId.check, byId.event];
      render();
      status.textContent = "Urutan diacak ulang. Belum diperiksa.";
      status.className = "status";
    });
  }
})();

/* ---------- Lab 10: invariant fuzz ---------- */

(function initInvariantLab() {
  const modeEl = $("#inv-mode");
  const seedEl = $("#inv-seed");
  const run = $("#inv-run");
  const reset = $("#inv-reset");
  const status = $("#inv-status");
  if (!modeEl || !run) return;

  const assetsEl = $("#inv-assets");
  const owedEl = $("#inv-owed");
  const opsEl = $("#inv-ops");
  const verdictEl = $("#inv-verdict");

  const mulberry32 = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const execute = () => {
    const bug = modeEl.value === "bug";
    const seed = Math.max(1, Math.trunc(Number(seedEl.value) || 1));
    const random = mulberry32(seed);
    const between = (min, max) => min + Math.floor(random() * (max - min + 1));

    let actual = 30000;
    let accounted = 30000;
    const users = [10000, 10000, 10000];

    for (let op = 0; op < 600; op += 1) {
      const user = between(0, 2);

      if (random() < 0.62) {
        const amount = between(1, 2000);
        actual += amount;
        accounted += amount;
        users[user] += amount;
      } else {
        const max = Math.min(2000, users[user], actual);
        if (max < 1) continue;
        const amount = between(1, max);
        users[user] -= amount;
        actual -= amount;

        if (bug) {
          const fee = Math.floor((amount * 5) / 1000);
          accounted -= amount - fee;
        } else {
          accounted -= amount;
        }
      }
    }

    const shortfall = Math.max(0, accounted - actual);

    if (assetsEl) assetsEl.textContent = fmtInt.format(actual);
    if (owedEl) owedEl.textContent = fmtInt.format(accounted);
    if (opsEl) opsEl.textContent = "600";
    if (verdictEl) {
      verdictEl.textContent = shortfall > 0 ? "DILANGGAR" : "Bertahan";
      verdictEl.className = shortfall > 0 ? "is-bad" : "is-good";
    }

    if (status) {
      status.textContent = shortfall > 0
        ? "Invariant gagal. Saldo nyata " + fmtInt.format(actual) + " lebih kecil dari kewajiban tercatat " + fmtInt.format(accounted) + ". Selisih " + fmtInt.format(shortfall) + " unit ditanggung pengguna terakhir."
        : "Invariant bertahan. Saldo nyata dan kewajiban tercatat sama: " + fmtInt.format(actual) + " unit.";
      status.className = "status " + (shortfall > 0 ? "is-bad" : "is-good");
    }
  };

  run.addEventListener("click", execute);

  if (reset) {
    reset.addEventListener("click", () => {
      modeEl.value = "safe";
      seedEl.value = "42";
      if (assetsEl) assetsEl.textContent = "0";
      if (owedEl) owedEl.textContent = "0";
      if (opsEl) opsEl.textContent = "0";
      if (verdictEl) {
        verdictEl.textContent = "Belum dijalankan";
        verdictEl.className = "";
      }
      status.textContent = "";
      status.className = "status";
    });
  }
})();

/* ---------- Lab 11: triase OWASP ---------- */

(function initTriageLab() {
  const items = $$("[data-triage-item]");
  const check = $("#triage-check");
  const reset = $("#triage-reset");
  const status = $("#triage-status");
  if (!items.length || !check || !status) return;

  const evaluate = () => {
    let correct = 0;
    let answered = 0;

    items.forEach((item) => {
      const select = $("select", item);
      const ok = select.value !== "" && select.value === item.dataset.answer;
      item.classList.toggle("answer-ok", ok);
      item.classList.toggle("answer-bad", select.value !== "" && !ok);
      if (select.value !== "") answered += 1;
      if (ok) correct += 1;
    });

    if (answered < items.length) {
      status.textContent = "Masih ada " + (items.length - answered) + " temuan tanpa kategori.";
      status.className = "status is-bad";
      return;
    }

    status.textContent = correct === items.length
      ? "Tepat. Kamu mengategorikan akar penyebab, bukan gejala."
      : correct + " dari " + items.length + " tepat. Periksa temuan yang melibatkan urutan state, hak, dan nilai kembali external call.";
    status.className = "status " + (correct === items.length ? "is-good" : "is-bad");
  };

  check.addEventListener("click", evaluate);

  if (reset) {
    reset.addEventListener("click", () => {
      items.forEach((item) => {
        $("select", item).value = "";
        item.classList.remove("answer-ok", "answer-bad");
      });
      status.textContent = "Belum ada jawaban.";
      status.className = "status";
    });
  }
})();

/* ---------- Lab 12: runbook insiden ---------- */

(function initIncidentLab() {
  const items = $$("[data-incident]");
  const check = $("#insiden-check");
  const reset = $("#insiden-reset");
  const status = $("#insiden-status");
  if (!items.length || !check || !status) return;

  const evaluate = () => {
    let correct = 0;
    let answered = 0;

    items.forEach((item) => {
      const select = $("select", item);
      const ok = select.value !== "" && select.value === item.dataset.answer;
      item.classList.toggle("is-ok", ok);
      item.classList.toggle("is-bad", select.value !== "" && !ok);
      if (select.value !== "") answered += 1;
      if (ok) correct += 1;
    });

    if (answered < items.length) {
      status.textContent = "Masih ada " + (items.length - answered) + " tindakan tanpa waktu.";
      status.className = "status is-bad";
      return;
    }

    status.textContent = correct === items.length
      ? "Tepat. Hentikan kerugian dan simpan bukti dulu; penyebab dan patch menunggu informasi."
      : correct + " dari " + items.length + " tepat. Tindakan darurat tidak sama dengan tindakan komunikasi atau perbaikan.";
    status.className = "status " + (correct === items.length ? "is-good" : "is-bad");
  };

  check.addEventListener("click", evaluate);

  if (reset) {
    reset.addEventListener("click", () => {
      items.forEach((item) => {
        $("select", item).value = "";
        item.classList.remove("is-ok", "is-bad");
      });
      status.textContent = "Belum ada tindakan.";
      status.className = "status";
    });
  }
})();

/* ---------- Lab 13: gate keamanan ---------- */

(function initGateLab() {
  const run = $("#gate-run");
  const reset = $("#gate-reset");
  const report = $("#gate-report");
  const status = $("#gate-status");
  const name = $("#gate-name");
  const commit = $("#gate-commit");
  if (!run || !report || !status) return;

  const key = "benteng.gate.v1";
  const boxes = $$('#lab-gate input[type="checkbox"]');

  const labels = {
    "gate-test": "Unit test lulus",
    "gate-fuzz": "Fuzz dan invariant lulus",
    "gate-access": "Access control ditinjau",
    "gate-oracle": "Oracle aman",
    "gate-signature": "Signature terikat konteks",
    "gate-emergency": "Pause dan runbook siap",
    "gate-monitor": "Monitoring aktif",
    "gate-audit": "Audit independen selesai",
    "gate-bounty": "Kanal disclosure tersedia",
    "gate-rehearsal": "Rehearsal di testnet"
  };

  const core = ["gate-test", "gate-fuzz", "gate-access", "gate-oracle", "gate-signature"];

  const restore = () => {
    const saved = store.get(key, null);
    if (!saved || typeof saved !== "object") return;
    boxes.forEach((box) => { box.checked = Boolean(saved.checks && saved.checks[box.id]); });
    if (name && typeof saved.name === "string") name.value = saved.name;
    if (commit && typeof saved.commit === "string") commit.value = saved.commit;
  };

  const save = () => {
    const checks = {};
    boxes.forEach((box) => { checks[box.id] = box.checked; });
    store.set(key, {
      checks,
      name: name ? name.value : "",
      commit: commit ? commit.value : ""
    });
  };

  const build = () => {
    const checks = {};
    boxes.forEach((box) => { checks[box.id] = box.checked; });

    const missingCore = core.filter((id) => !checks[id]);
    const missingAll = boxes.map((box) => box.id).filter((id) => !checks[id]);
    const auditReady = missingCore.length === 0;
    const mainnetReady = missingAll.length === 0;

    const lines = [];
    lines.push("GATE KESIAPAN KEAMANAN");
    lines.push("Rilis   : " + (name && name.value ? name.value : "tanpa nama"));
    lines.push("Commit  : " + (commit && commit.value ? commit.value : "belum diisi"));
    lines.push("Tanggal : " + new Date().toLocaleDateString("id-ID"));
    lines.push("");

    boxes.forEach((box) => {
      lines.push((box.checked ? "[x] " : "[ ] ") + labels[box.id]);
    });

    lines.push("");
    if (mainnetReady) {
      lines.push("Status: SIAP MAINNET");
      lines.push("Semua bukti inti, audit, monitoring, disclosure, dan rehearsal tersedia.");
    } else if (auditReady) {
      lines.push("Status: SIAP AUDIT, BELUM SIAP MAINNET");
      lines.push("Blocker mainnet: " + missingAll.map((id) => labels[id]).join(", "));
    } else {
      lines.push("Status: BELUM SIAP AUDIT");
      lines.push("Blocker audit: " + missingCore.map((id) => labels[id]).join(", "));
      if (missingAll.length > missingCore.length) {
        lines.push("Blocker mainnet lain: " + missingAll.filter((id) => !core.includes(id)).map((id) => labels[id]).join(", "));
      }
    }

    lines.push("");
    lines.push("Centang hanya yang punya bukti yang bisa dibuka orang lain.");

    report.textContent = lines.join("\n");
    report.classList.toggle("is-ready", mainnetReady);
    report.classList.toggle("is-blocked", !mainnetReady);

    status.textContent = mainnetReady
      ? "Gate lulus penuh. Simpan laporan ini bersama manifest rilis."
      : auditReady
        ? "Siap audit. Masih ada " + missingAll.length + " blocker mainnet."
        : "Belum siap audit. Masih ada " + missingCore.length + " bukti inti yang kurang.";
    status.className = "status " + (mainnetReady ? "is-good" : "is-bad");

    save();
  };

  run.addEventListener("click", build);

  boxes.forEach((box) => box.addEventListener("change", save));
  if (name) name.addEventListener("input", save);
  if (commit) commit.addEventListener("input", save);

  if (reset) {
    reset.addEventListener("click", () => {
      boxes.forEach((box) => { box.checked = false; });
      if (name) name.value = "minivault-audit-01";
      if (commit) commit.value = "HEAD";
      store.remove(key);
      report.textContent = "Laporan akan muncul di sini setelah kamu menekan tombol.";
      report.classList.remove("is-ready", "is-blocked");
      status.textContent = "Belum ada laporan.";
      status.className = "status";
      if (name) name.focus();
    });
  }

  restore();
})();

/* ---------- Uji kompetensi ---------- */

const quizQuestions = [
  {
    q: "Apa akar penyebab reentrancy pada fungsi withdraw?",
    options: [
      "Saldo tidak pernah diperiksa",
      "External call terjadi sebelum state diperbarui",
      "Gas terlalu rendah",
      "Fungsi tidak diberi modifier view"
    ],
    answer: 1,
    explain: "Penerima bisa memanggil ulang sebelum saldo dikurangi. State yang belum konsisten itulah yang dipakai ulang, bukan sekadar adanya external call."
  },
  {
    q: "Urutan checks-effects-interactions menempatkan transfer ETH di mana?",
    options: [
      "Sebelum validasi agar gas lebih murah",
      "Setelah semua perubahan state selesai",
      "Di dalam constructor",
      "Sebelum event dicatat"
    ],
    answer: 1,
    explain: "Checks memvalidasi, effects memperbarui state, interactions baru memanggil pihak luar. Event dicatat setelah state konsisten."
  },
  {
    q: "Mengapa tx.origin tidak boleh dipakai untuk otorisasi?",
    options: [
      "Nilainya selalu nol",
      "Kontrak perantara bisa membuat wallet korban terlihat sebagai pemanggil",
      "Hanya bekerja di testnet",
      "Tidak bisa dibandingkan dengan address"
    ],
    answer: 1,
    explain: "tx.origin adalah pemrakarsa transaksi. Jika korban memanggil kontrak jahat yang memanggil kontrakmu, tx.origin tetap wallet korban. Gunakan msg.sender."
  },
  {
    q: "Fungsi setOracle eksternal tanpa modifier termasuk kategori OWASP apa?",
    options: ["SC01 Access control", "SC03 Oracle manipulation", "SC08 Reentrancy", "SC10 Proxy"],
    answer: 0,
    explain: "Akar masalahnya adalah tidak ada pembatasan siapa yang boleh memanggil. Oracle manipulation adalah dampak yang mungkin terjadi setelahnya."
  },
  {
    q: "Apa hasil uint8(300) di Solidity?",
    options: ["300", "255", "44", "Revert"],
    answer: 2,
    explain: "Casting ke uint8 memotong bit di atas 8 bit. 300 modulo 256 adalah 44. Casting eksplisit tidak otomatis revert."
  },
  {
    q: "Saat pengguna menarik aset dari vault share, ke arah mana pembulatan yang aman untuk protokol?",
    options: ["Ke atas", "Ke bawah", "Ke angka genap terdekat", "Tidak dibulatkan"],
    answer: 1,
    explain: "Membulatkan aset yang dibayarkan ke bawah membuat protokol tidak membayar lebih dari kewajiban. Saat mencetak share, juga bulatkan ke bawah."
  },
  {
    q: "Apa inti serangan inflasi share pertama?",
    options: [
      "Mencuri private key owner",
      "Menaikkan harga share agar korban menerima nol share",
      "Mengubah chain ID",
      "Memanipulasi gas price"
    ],
    answer: 1,
    explain: "Penyerang menyetor sangat kecil lalu menyumbang aset langsung untuk menaikkan harga share. Korban yang menyetor kemudian bisa menerima nol share karena pembulatan."
  },
  {
    q: "Mengapa harga spot dari pool tipis berbahaya sebagai oracle?",
    options: [
      "Harganya selalu lebih rendah",
      "Bisa digeser dalam satu transaksi dengan modal sementara",
      "Tidak bisa dibaca kontrak",
      "Hanya tersedia di Layer 2"
    ],
    answer: 1,
    explain: "Cadangan pool bisa diubah dengan swap besar, termasuk lewat flash loan. Harga kembali setelah transaksi, tetapi keputusan protokol sudah diambil."
  },
  {
    q: "Apa keunggulan utama TWAP dibanding harga spot?",
    options: [
      "Selalu lebih akurat untuk semua aset",
      "Lebih sulit digeser karena memakai rata-rata beberapa blok",
      "Tidak membutuhkan likuiditas",
      "Tidak bisa dibaca on-chain"
    ],
    answer: 1,
    explain: "TWAP menyebarkan pengaruh harga selama jendela waktu, sehingga manipulasi satu blok tidak langsung mengubah nilai secara penuh."
  },
  {
    q: "Field apa yang dipakai untuk menolak harga Chainlink yang sudah terlalu lama?",
    options: ["roundId", "updatedAt", "decimals", "phaseId"],
    answer: 1,
    explain: "Bandingkan block.timestamp dengan updatedAt memakai ambang staleness. Periksa juga answer positif dan answeredInRound."
  },
  {
    q: "Parameter apa yang membatasi harga terburuk pada swap?",
    options: ["amountIn", "amountOutMin", "gasLimit", "nonce"],
    answer: 1,
    explain: "amountOutMin adalah jumlah minimum output yang mau diterima. Jika hasil eksekusi lebih rendah, transaksi revert."
  },
  {
    q: "Apa definisi flash loan?",
    options: [
      "Pinjaman dengan bunga rendah selama satu tahun",
      "Pinjaman tanpa jaminan yang harus dikembalikan dalam transaksi yang sama",
      "Pinjaman yang dijamin NFT",
      "Transfer antar chain tanpa bridge"
    ],
    answer: 1,
    explain: "Flash loan bersifat atomik. Jika pokok dan biaya tidak dikembalikan sebelum transaksi selesai, seluruh transaksi revert."
  },
  {
    q: "Mengapa flash loan sering muncul dalam laporan eksploit?",
    options: [
      "Karena flash loan selalu melanggar hukum",
      "Karena ia menghilangkan kendala modal pada bug yang sudah ada",
      "Karena ia mengubah bytecode kontrak",
      "Karena ia mematikan oracle"
    ],
    answer: 1,
    explain: "Flash loan bukan kerentanan protokol yang diserang. Ia memperbesar dampak bug seperti oracle manipulation atau logika kolateral."
  },
  {
    q: "Apa yang harus dilakukan jika ecrecover mengembalikan address(0)?",
    options: [
      "Terima sebagai pemilik default",
      "Tolak signature karena tidak valid",
      "Ulangi transaksi dengan gas lebih tinggi",
      "Ganti chain ID"
    ],
    answer: 1,
    explain: "address(0) berarti pemulihan gagal. Tanpa pemeriksaan, fungsi bisa menganggap signature tidak valid sebagai sah. Gunakan ECDSA.recover dan tolak alamat nol."
  },
  {
    q: "Apa yang harus ada di domain separator EIP-712?",
    options: [
      "Hanya nama token",
      "Nama, versi, chain ID, dan alamat verifying contract",
      "Private key penandatangan",
      "Saldo pengguna"
    ],
    answer: 1,
    explain: "Domain separator mengikat tanda tangan ke aplikasi dan chain. Tanpa chain ID dan alamat kontrak, tanda tangan bisa dipakai di tempat lain."
  },
  {
    q: "Mekanisme apa yang mencegah signature dipakai dua kali?",
    options: ["Deadline", "Nonce yang bertambah dan ditandai terpakai", "Gas limit", "ABI encoding"],
    answer: 1,
    explain: "Deadline membatasi waktu, tetapi nonce yang mencegah replay. Simpan nonce yang sudah dipakai atau naikkan nonce per akun."
  },
  {
    q: "Apa risiko utama paymaster pada ERC-4337?",
    options: [
      "Tidak bisa membayar gas",
      "Depositnya bisa dikuras jika validasi dan batas sponsor lemah",
      "Menghapus private key pengguna",
      "Mengubah chain ID"
    ],
    answer: 1,
    explain: "Paymaster membayar gas untuk operasi yang lolos validasi. Tanpa batas per pengguna, per operasi, dan per hari, penyerang bisa menguras deposit."
  },
  {
    q: "Mengapa proxy yang bisa di-upgrade menambah risiko keamanan?",
    options: [
      "Karena storage selalu kosong",
      "Karena pemegang hak upgrade bisa mengganti logika yang menguasai dana",
      "Karena proxy tidak bisa memakai events",
      "Karena proxy menghapus ABI"
    ],
    answer: 1,
    explain: "Upgrade adalah access control terhadap seluruh kode. Lindungi dengan multisig dan timelock, dan pastikan initializer tidak bisa dipanggil ulang."
  },
  {
    q: "Apa yang dijamin IPFS dan apa yang tidak?",
    options: [
      "Menjamin file tersedia selamanya",
      "Menjamin integritas isi lewat CID, tetapi tidak menjamin ketersediaan",
      "Menjamin data privat",
      "Menjamin biaya penyimpanan nol"
    ],
    answer: 1,
    explain: "CID berubah jika isi berubah, jadi integritas bisa diperiksa. Ketersediaan bergantung pada pinning dan node yang menyimpan salinan."
  },
  {
    q: "Kapan snapshot suara sebaiknya diambil pada DAO?",
    options: [
      "Pada blok yang sama saat voting dibuka",
      "Sebelum proposal dibuat atau pada blok lampau",
      "Setelah proposal dieksekusi",
      "Hanya saat quorum tercapai"
    ],
    answer: 1,
    explain: "Snapshot pada blok lampau mencegah penyerang meminjam token, memakai hak suara, lalu mengembalikannya dalam transaksi yang sama."
  }
];

(function initQuiz() {
  const form = $("#quiz-form");
  if (!form) return;

  const submit = $("#quiz-submit");
  const retry = $("#quiz-retry");
  const status = $("#quiz-status");
  const result = $("#quiz-result");
  const bestEl = $("#quiz-best");

  const best = Number(store.get("benteng.quiz.v1", 0)) || 0;
  if (bestEl) bestEl.textContent = best + " dari 20";

  form.innerHTML = quizQuestions.map((item, index) => {
    const options = item.options.map((option, optionIndex) => {
      const id = "q" + (index + 1) + "-o" + (optionIndex + 1);
      return '<label class="option" for="' + id + '"><input id="' + id + '" type="radio" name="q' + (index + 1) + '" value="' + optionIndex + '"><span>' + escapeHtml(option) + "</span></label>";
    }).join("");

    return '<fieldset class="quiz-q"><legend><span class="q-num">' + String(index + 1).padStart(2, "0") + "</span>" + escapeHtml(item.q) + "</legend>" + options + "</fieldset>";
  }).join("");

  const mark = (index) => {
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

    $$("input", fieldset).forEach((input) => {
      input.disabled = true;
    });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = new FormData(form);
    const missing = [];

    quizQuestions.forEach((item, index) => {
      if (!answers.get("q" + (index + 1))) missing.push(index + 1);
    });

    if (missing.length) {
      status.textContent = "Masih ada " + missing.length + " soal tanpa jawaban. Lengkapi dulu.";
      status.className = "status is-bad";
      const first = form.querySelector('input[name="q' + missing[0] + '"]');
      if (first) first.focus();
      return;
    }

    let score = 0;
    quizQuestions.forEach((item, index) => {
      const value = Number(answers.get("q" + (index + 1)));
      if (value === item.answer) score += 1;
      mark(index);
    });

    const bestScore = Math.max(score, Number(store.get("benteng.quiz.v1", 0)) || 0);
    store.set("benteng.quiz.v1", bestScore);
    if (bestEl) bestEl.textContent = bestScore + " dari 20";

    const passed = score >= 16;
    if (passed && window.setProgressDone) window.setProgressDone("uji", true, false);

    if (result) {
      result.innerHTML = '<div class="quiz-summary' + (passed ? "" : " is-fail") + '">' +
        "<h3>" + (passed ? "Lulus." : "Belum lulus.") + "</h3>" +
        "<p>Skor " + score + " dari 20. Skor terbaikmu " + bestScore + " dari 20. " +
        (passed
          ? "Kamu memahami akar serangan, mitigasi, dan batas bukti. Lanjutkan dengan audit kode nyata."
          : "Baca ulang penjelasan di bawah, lalu coba lagi. Minimal 16 benar untuk lulus.") +
        "</p></div>";
    }

    status.textContent = passed ? "Ujian lulus. Progres ujian ditandai." : "Ujian belum lulus. Periksa penjelasan tiap soal.";
    status.className = "status " + (passed ? "is-good" : "is-bad");
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
      $$("input", form).forEach((input) => {
        input.disabled = false;
      });
      if (result) result.innerHTML = "";
      if (submit) submit.disabled = false;
      status.textContent = "Belum ada jawaban yang diperiksa.";
      status.className = "status";
      const first = $("input", form);
      if (first) first.focus();
    });
  }
})();

/* ---------- Blok kode yang bisa digulir ---------- */

function markScrollableCode() {
  $$(".code-block pre").forEach((pre) => {
    if (pre.scrollWidth > pre.clientWidth + 2) {
      pre.tabIndex = 0;
      pre.setAttribute("aria-label", "Blok kode, dapat digulir horizontal");
    } else {
      pre.removeAttribute("tabindex");
      pre.removeAttribute("aria-label");
    }
  });
}

window.addEventListener("resize", markScrollableCode);

/* ---------- Deep link setelah konten dinamis selesai ---------- */

(function initDeepLink() {
  if (!window.location.hash) return;
  const id = window.location.hash.slice(1);
  if (!document.getElementById(id)) return;

  let cancelled = false;
  const cancel = () => { cancelled = true; };
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach((eventName) => {
    window.addEventListener(eventName, cancel, { passive: true, once: true });
  });
  window.addEventListener("hashchange", () => {
    if (window.location.hash !== "#" + id) cancelled = true;
  });

  const jump = () => {
    if (cancelled) return;
    const target = document.getElementById(id);
    if (!target) return;
    const header = $(".site-header");
    const offset = (header ? header.offsetHeight : 0) + 20;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    if (Math.abs(window.scrollY - top) > 2) {
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    }
  };

  jump();
  [120, 450, 1200, 2400].forEach((delay) => window.setTimeout(jump, delay));
  window.addEventListener("load", jump);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(jump);
  }
})();

/* ---------- Mulai sorotan setelah DOM siap ---------- */

initHighlight();
window.requestAnimationFrame(markScrollableCode);
